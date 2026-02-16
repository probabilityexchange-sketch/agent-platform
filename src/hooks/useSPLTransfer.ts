"use client";

import { useCallback, useState } from "react";
import { PublicKey, Connection } from "@solana/web3.js";
import bs58 from "bs58";
import { useConnectedStandardWallets, useStandardSignAndSendTransaction } from "@privy-io/react-auth/solana";
import { buildSPLTransferTransaction } from "@/lib/solana/spl-transfer";

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
        const tx = await buildSPLTransferTransaction({
          fromWallet: new PublicKey(wallet.address),
          toWallet: new PublicKey(params.recipient),
          mint: new PublicKey(params.mint),
          amount: BigInt(params.amount),
          decimals: params.decimals,
          memo: params.memo,
        });

        const connection = new Connection(
          process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com",
          "confirmed"
        );

        const { signature } = await signAndSendTransaction({
          wallet,
          transaction: tx.serialize(),
          chain: `solana:${process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet"}`,
        });

        const signatureBase58 = bs58.encode(signature);
        const latestBlockhash = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
          signature: signatureBase58,
          ...latestBlockhash,
        });

        return signatureBase58;
      } finally {
        setSending(false);
      }
    },
    [wallets, signAndSendTransaction]
  );

  return { transfer, sending };
}
