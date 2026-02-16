"use client";

import { useCallback, useState } from "react";
import { PublicKey, Connection, Transaction, TransactionInstruction } from "@solana/web3.js";
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import bs58 from "bs58";

declare global {
  interface Window {
    phantom?: {
      solana?: {
        isPhantom?: boolean;
        connect(): Promise<{ publicKey: { toString(): string } }>;
        signAndSendTransaction(tx: Transaction): Promise<{ signature: string }>;
        signTransaction(tx: Transaction): Promise<Transaction>;
      };
    };
  }
}

export function useSPLTransfer() {
  const [sending, setSending] = useState(false);

  const transfer = useCallback(
    async (params: {
      mint: string;
      recipient: string;
      amount: string;
      decimals: number;
      memo: string;
    }) => {
      setSending(true);
      try {
        // Use Phantom directly instead of through Privy
        const phantom = window.phantom?.solana;
        if (!phantom?.isPhantom) {
          throw new Error("Phantom wallet not found. Please install Phantom extension.");
        }

        console.log("Using Phantom directly");

        const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
        const connection = new Connection(rpcUrl, "confirmed");

        // Get Phantom's public key
        const { publicKey: phantomPubkey } = await phantom.connect();
        const fromWallet = new PublicKey(phantomPubkey.toString());
        const toWallet = new PublicKey(params.recipient);
        const mint = new PublicKey(params.mint);

        console.log("From wallet:", fromWallet.toBase58());

        const fromATA = await getAssociatedTokenAddress(mint, fromWallet);
        const toATA = await getAssociatedTokenAddress(mint, toWallet);

        console.log("From ATA:", fromATA.toBase58());
        console.log("To ATA:", toATA.toBase58());

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
        console.log("Blockhash:", blockhash);

        const tx = new Transaction();
        tx.recentBlockhash = blockhash;
        tx.feePayer = fromWallet;
        tx.add(transferIx);
        tx.add(memoIx);

        console.log("Requesting signature and broadcast from Phantom...");

        // Phantom's signAndSendTransaction
        const result = await phantom.signAndSendTransaction(tx);
        const signature = result.signature;

        console.log("Transaction sent:", signature);

        // Wait for confirmation
        console.log("Waiting for confirmation...");
        const confirmation = await connection.confirmTransaction(
          {
            signature,
            blockhash,
            lastValidBlockHeight,
          },
          "confirmed"
        );

        if (confirmation.value.err) {
          console.error("Transaction error:", confirmation.value.err);
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
    []
  );

  return { transfer, sending };
}
