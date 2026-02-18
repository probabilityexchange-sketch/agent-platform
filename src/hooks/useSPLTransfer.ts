"use client";

import { useCallback, useState } from "react";
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

let cachedRpcUrl: string | null = null;

async function resolveRpcUrl(): Promise<string> {
  if (cachedRpcUrl) {
    return cachedRpcUrl;
  }

  try {
    const response = await fetch("/api/config", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    });

    if (response.ok) {
      const config = (await response.json()) as { solanaRpcUrl?: string };
      const runtimeRpc =
        typeof config.solanaRpcUrl === "string" ? config.solanaRpcUrl.trim() : "";
      if (runtimeRpc.length > 0) {
        cachedRpcUrl = runtimeRpc;
        return runtimeRpc;
      }
    }
  } catch {
    // Fall back to build-time env var when runtime config endpoint is unavailable.
  }

  cachedRpcUrl =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
  return cachedRpcUrl;
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
        const phantom = window.phantom?.solana;
        if (!phantom?.isPhantom) {
          throw new Error("Phantom wallet not found. Please install Phantom extension.");
        }

        const rpcUrl = await resolveRpcUrl();
        const connection = new Connection(rpcUrl, "confirmed");

        // Connect to Phantom
        const { publicKey: phantomPubkey } = await phantom.connect();
        const fromWallet = new PublicKey(phantomPubkey.toString());
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

        const signedTx = await phantom.signTransaction(tx);

        // Broadcast
        const signature = await connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: false,
        });

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(
          { signature, blockhash, lastValidBlockHeight },
          "confirmed"
        );

        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        return signature;
      } catch (error) {
        console.error("Transfer error:", error);
        throw error;
      } finally {
        setSending(false);
      }
    },
    []
  );

  return { transfer, sending };
}
