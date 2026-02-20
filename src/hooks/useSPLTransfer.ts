"use client";

import { useCallback, useState } from "react";
import bs58 from "bs58";
import {
  PublicKey,
  Connection,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createBurnCheckedInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { useConnectedStandardWallets } from "@privy-io/react-auth/solana";

let cachedRpcUrl: string | null = null;
let cachedSolanaChain: "solana:mainnet" | "solana:devnet" | "solana:testnet" | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isBlockheightExpiryError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error || "").toLowerCase();
  return (
    message.includes("block height exceeded") ||
    message.includes("transactionexpiredblockheightexceedederror") ||
    message.includes("blockhash not found")
  );
}

async function hasConfirmedSignature(connection: Connection, signature: string): Promise<boolean> {
  const status = await connection.getSignatureStatus(signature, {
    searchTransactionHistory: true,
  });
  if (!status.value) return false;
  if (status.value.err) {
    throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
  }
  return status.value.confirmationStatus === "confirmed" || status.value.confirmationStatus === "finalized";
}

async function confirmWithFallback(
  connection: Connection,
  signature: string,
  blockhash: string,
  lastValidBlockHeight: number
): Promise<void> {
  try {
    const confirmation = await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed"
    );
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }
    return;
  } catch (error) {
    if (!isBlockheightExpiryError(error)) {
      throw error;
    }
  }

  // Blockhash-based confirmation can race with wallet send timing; fall back to signature polling.
  for (let i = 0; i < 8; i += 1) {
    if (await hasConfirmedSignature(connection, signature)) {
      return;
    }
    await sleep(1500);
  }
}

async function resolveRpcUrl(): Promise<string> {
  if (cachedRpcUrl) {
    return cachedRpcUrl;
  }

  if (typeof window !== "undefined") {
    cachedRpcUrl = `${window.location.origin}/api/solana-rpc`;
    return cachedRpcUrl;
  }

  cachedRpcUrl =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
  return cachedRpcUrl;
}

function inferChainFromNetwork(networkRaw: string | undefined): "solana:mainnet" | "solana:devnet" | "solana:testnet" {
  const normalized = (networkRaw || "").toLowerCase();
  if (normalized.includes("mainnet")) return "solana:mainnet";
  if (normalized.includes("testnet")) return "solana:testnet";
  return "solana:devnet";
}

async function resolveSolanaChain(): Promise<"solana:mainnet" | "solana:devnet" | "solana:testnet"> {
  if (cachedSolanaChain) {
    return cachedSolanaChain;
  }

  try {
    if (typeof window !== "undefined") {
      const response = await fetch("/api/config", { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json()) as { solanaNetwork?: string };
        cachedSolanaChain = inferChainFromNetwork(data.solanaNetwork);
        return cachedSolanaChain;
      }
    }
  } catch {
    // Fall through to env defaults.
  }

  cachedSolanaChain = inferChainFromNetwork(process.env.NEXT_PUBLIC_SOLANA_NETWORK);
  return cachedSolanaChain;
}

declare global {
  interface Window {
    phantom?: {
      solana?: {
        isPhantom?: boolean;
        connect(): Promise<{ publicKey: { toString(): string } }>;
        signTransaction(tx: Transaction): Promise<Transaction>;
      };
    };
  }
}

export function useSPLTransfer() {
  const [sending, setSending] = useState(false);
  const { wallets } = useConnectedStandardWallets();

  const transfer = useCallback(
    async (params: {
      mint?: string | null;
      paymentAsset?: "spl" | "sol";
      recipient: string;
      amount: string;
      decimals: number;
      memo: string;
      burnAmount?: string;
      burnRecipient?: string | null;
    }) => {
      setSending(true);
      try {
        const standardWallet = wallets[0];
        const phantom = window.phantom?.solana;

        const rpcUrl = await resolveRpcUrl();
        const connection = new Connection(rpcUrl, "confirmed");

        let fromWallet: PublicKey;
        if (standardWallet) {
          fromWallet = new PublicKey(standardWallet.address);
        } else {
          if (!phantom?.isPhantom) {
            throw new Error("No supported Solana wallet found. Connect a wallet to continue.");
          }
          const { publicKey: phantomPubkey } = await phantom.connect();
          fromWallet = new PublicKey(phantomPubkey.toString());
        }
        const toWallet = new PublicKey(params.recipient);
        const paymentAsset = params.paymentAsset || "spl";

        const tx = new Transaction();

        if (paymentAsset === "sol") {
          const amountLamports = BigInt(params.amount);
          if (amountLamports <= BigInt(0)) {
            throw new Error("Invalid SOL amount");
          }
          if (amountLamports > BigInt(Number.MAX_SAFE_INTEGER)) {
            throw new Error("SOL amount is too large");
          }

          tx.add(
            SystemProgram.transfer({
              fromPubkey: fromWallet,
              toPubkey: toWallet,
              lamports: Number(amountLamports),
            })
          );

          const burnAmountLamports = params.burnAmount
            ? BigInt(params.burnAmount)
            : BigInt(0);
          if (burnAmountLamports > BigInt(0)) {
            if (burnAmountLamports > BigInt(Number.MAX_SAFE_INTEGER)) {
              throw new Error("SOL burn amount is too large");
            }
            const burnRecipient = params.burnRecipient
              ? new PublicKey(params.burnRecipient)
              : new PublicKey("1nc1nerator11111111111111111111111111111111");

            tx.add(
              SystemProgram.transfer({
                fromPubkey: fromWallet,
                toPubkey: burnRecipient,
                lamports: Number(burnAmountLamports),
              })
            );
          }
        } else {
          if (!params.mint) {
            throw new Error("Missing token mint for SPL transfer");
          }

          const mint = new PublicKey(params.mint);
          const mintAccountInfo = await connection.getAccountInfo(mint, "confirmed");
          if (!mintAccountInfo) {
            throw new Error(`Token mint not found on selected Solana network (${rpcUrl})`);
          }

          const tokenProgramId = mintAccountInfo.owner.equals(TOKEN_PROGRAM_ID)
            ? TOKEN_PROGRAM_ID
            : mintAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
              ? TOKEN_2022_PROGRAM_ID
              : null;

          if (!tokenProgramId) {
            throw new Error("Unsupported token program for selected mint");
          }

          const fromATA = await getAssociatedTokenAddress(
            mint,
            fromWallet,
            false,
            tokenProgramId,
            ASSOCIATED_TOKEN_PROGRAM_ID
          );
          const toATA = await getAssociatedTokenAddress(
            mint,
            toWallet,
            false,
            tokenProgramId,
            ASSOCIATED_TOKEN_PROGRAM_ID
          );

          const [fromAccountInfo, toAccountInfo] = await Promise.all([
            connection.getAccountInfo(fromATA, "confirmed"),
            connection.getAccountInfo(toATA, "confirmed"),
          ]);

          if (!fromAccountInfo) {
            throw new Error(
              "Source token account not found for this mint. Ensure your wallet holds this token on the selected network."
            );
          }

          if (!toAccountInfo) {
            tx.add(
              createAssociatedTokenAccountIdempotentInstruction(
                fromWallet,
                toATA,
                toWallet,
                mint,
                tokenProgramId,
                ASSOCIATED_TOKEN_PROGRAM_ID
              )
            );
          }

          // Build transfer instruction
          const transferIx = createTransferCheckedInstruction(
            fromATA,
            mint,
            toATA,
            fromWallet,
            BigInt(params.amount),
            params.decimals,
            [],
            tokenProgramId
          );
          tx.add(transferIx);

          const burnAmount = params.burnAmount
            ? BigInt(params.burnAmount)
            : BigInt(0);
          if (burnAmount > BigInt(0)) {
            tx.add(
              createBurnCheckedInstruction(
                fromATA,
                mint,
                fromWallet,
                burnAmount,
                params.decimals,
                [],
                tokenProgramId
              )
            );
          }
        }

        // Add memo instruction
        const memoIx = new TransactionInstruction({
          keys: [{ pubkey: fromWallet, isSigner: true, isWritable: false }],
          programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
          data: Buffer.from(params.memo, "utf-8"),
        });

        // Get fresh blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
        tx.recentBlockhash = blockhash;
        tx.feePayer = fromWallet;
        tx.add(memoIx);

        let signature: string;
        if (standardWallet) {
          const chain = await resolveSolanaChain();
          const unsigned = tx.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
          });
          const result = await standardWallet.signAndSendTransaction({
            transaction: unsigned,
            chain,
          });
          signature = bs58.encode(result.signature);
        } else {
          const signedTx = await phantom!.signTransaction(tx);
          signature = await connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: false,
          });
        }

        await confirmWithFallback(connection, signature, blockhash, lastValidBlockHeight);

        return signature;
      } catch (error) {
        console.error("Transfer error:", error);
        throw error;
      } finally {
        setSending(false);
      }
    },
    [wallets]
  );

  return { transfer, sending };
}
