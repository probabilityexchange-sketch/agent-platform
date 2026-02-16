"use client";

import { useCallback, useState } from "react";
import { PublicKey, Connection, TransactionMessage, VersionedTransaction, TransactionInstruction } from "@solana/web3.js";
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import bs58 from "bs58";
import { useConnectedStandardWallets, useStandardSignAndSendTransaction } from "@privy-io/react-auth/solana";

export function useSPLTransfer() {
  const { wallets } = useConnectedStandardWallets();
  const { signAndSendTransaction } = useStandardSignAndSendTransaction();
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
        const connection = new Connection(
          process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com",
          "confirmed"
        );

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

        // Get fresh blockhash right before signing
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

        const message = new TransactionMessage({
          payerKey: fromWallet,
          recentBlockhash: blockhash,
          instructions: [transferIx, memoIx],
        }).compileToV0Message();

        const tx = new VersionedTransaction(message);

        const { signature } = await signAndSendTransaction({
          wallet,
          transaction: tx.serialize(),
          chain: `solana:${process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet"}`,
        });

        const signatureBase58 = bs58.encode(signature);
        
        // Confirm with the same blockhash info
        await connection.confirmTransaction({
          signature: signatureBase58,
          blockhash,
          lastValidBlockHeight,
        }, "confirmed");

        return signatureBase58;
      } finally {
        setSending(false);
      }
    },
    [wallets, signAndSendTransaction]
  );

  return { transfer, sending };
}
