"use client";

import { useCallback, useState } from "react";
import { PublicKey, Connection, Transaction, TransactionInstruction } from "@solana/web3.js";
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import bs58 from "bs58";
import { useConnectedStandardWallets } from "@privy-io/react-auth/solana";
import { useSignTransaction } from "@privy-io/react-auth/solana";

export function useSPLTransfer() {
  const { wallets } = useConnectedStandardWallets();
  const { signTransaction } = useSignTransaction();
  const [sending, setSending] = useState(false);

  const transfer = useCallback(
    async (params: {
      mint: string;
      recipient: string;
      amount: string;
      decimals: number;
      memo: string;
    }) => {
      const wallet = wallets[0];
      if (!wallet) {
        throw new Error("Wallet not connected");
      }

      setSending(true);
      try {
        const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
        const connection = new Connection(rpcUrl, "confirmed");

        const fromWallet = new PublicKey(wallet.address);
        const toWallet = new PublicKey(params.recipient);
        const mint = new PublicKey(params.mint);

        const fromATA = await getAssociatedTokenAddress(mint, fromWallet);
        const toATA = await getAssociatedTokenAddress(mint, toWallet);

        const transferIx = createTransferCheckedInstruction(
          fromATA,
          mint,
          toATA,
          fromWallet,
          BigInt(params.amount),
          params.decimals,
          [],
          TOKEN_PROGRAM_ID
        );

        const memoIx = new TransactionInstruction({
          keys: [{ pubkey: fromWallet, isSigner: true, isWritable: false }],
          programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
          data: Buffer.from(params.memo, "utf-8"),
        });

        // Get fresh blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

        const tx = new Transaction();
        tx.recentBlockhash = blockhash;
        tx.feePayer = fromWallet;
        tx.add(transferIx);
        tx.add(memoIx);

        console.log("Requesting signature from wallet...");

        // Sign the transaction
        const { signedTransaction } = await signTransaction({
          wallet,
          transaction: tx.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
          }),
        });

        console.log("Transaction signed, broadcasting...");

        // Send the signed transaction ourselves
        const signature = await connection.sendRawTransaction(signedTransaction, {
          skipPreflight: false,
          maxRetries: 3,
        });

        console.log("Transaction broadcast:", signature);

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(
          {
            signature,
            blockhash,
            lastValidBlockHeight,
          },
          "confirmed"
        );

        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        console.log("Transaction confirmed!");
        return signature;
      } catch (error) {
        console.error("Transfer error:", error);
        throw error;
      } finally {
        setSending(false);
      }
    },
    [wallets, signTransaction]
  );

  return { transfer, sending };
}
