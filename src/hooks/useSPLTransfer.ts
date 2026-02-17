"use client";

import { useCallback, useState } from "react";
import { PublicKey, Connection, Transaction, TransactionInstruction } from "@solana/web3.js";
import {
  createBurnCheckedInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

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
      mint: string;
      recipient: string;
      amount: string;
      decimals: number;
      memo: string;
      burnAmount?: string;
    }) => {
      setSending(true);
      try {
        const phantom = window.phantom?.solana;
        if (!phantom?.isPhantom) {
          throw new Error("Phantom wallet not found. Please install Phantom extension.");
        }

        const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
        const connection = new Connection(rpcUrl, "confirmed");

        // Connect to Phantom
        const { publicKey: phantomPubkey } = await phantom.connect();
        const fromWallet = new PublicKey(phantomPubkey.toString());
        const toWallet = new PublicKey(params.recipient);
        const mint = new PublicKey(params.mint);

        const fromATA = await getAssociatedTokenAddress(mint, fromWallet);
        const toATA = await getAssociatedTokenAddress(mint, toWallet);

        // Build transfer instruction
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

        const burnAmount = params.burnAmount ? BigInt(params.burnAmount) : BigInt(0);
        const burnIx = burnAmount > BigInt(0)
          ? createBurnCheckedInstruction(
              fromATA,
              mint,
              fromWallet,
              burnAmount,
              params.decimals,
              [],
              TOKEN_PROGRAM_ID
            )
          : null;

        // Add memo instruction
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
        if (burnIx) tx.add(burnIx);
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
