"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { type ReactNode } from "react";

export function PrivyContextProvider({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const networkRaw = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet").toLowerCase();
  const solanaClusterName = networkRaw.includes("mainnet")
    ? "mainnet-beta"
    : networkRaw.includes("testnet")
      ? "testnet"
      : "devnet";
  const defaultRpcUrl =
    solanaClusterName === "mainnet-beta"
      ? "https://api.mainnet-beta.solana.com"
      : solanaClusterName === "testnet"
        ? "https://api.testnet.solana.com"
        : "https://api.devnet.solana.com";
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || defaultRpcUrl;

  if (!appId) {
    throw new Error("NEXT_PUBLIC_PRIVY_APP_ID is required");
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#6d28d9",
          logo: "/randi.png",
          walletChainType: "solana-only",
          walletList: ["phantom", "solflare", "backpack"],
        },
        loginMethods: ["wallet", "email"],
        externalWallets: {
          solana: {
            connectors: toSolanaWalletConnectors(),
          },
        },
        embeddedWallets: {
          solana: {
            createOnLogin: "users-without-wallets",
          },
        },
        solanaClusters: [
          {
            name: solanaClusterName,
            rpcUrl,
          },
        ],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
