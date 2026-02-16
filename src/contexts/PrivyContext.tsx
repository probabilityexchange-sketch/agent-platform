"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { type ReactNode } from "react";

export function PrivyContextProvider({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmlmjskmp00zo0dl7qkdoef31";

  if (!appId) {
    console.warn("NEXT_PUBLIC_PRIVY_APP_ID is not set in environment variables");
  }

  console.log("Privy config loaded", {
    appId,
    walletChainType: "solana-only",
    walletList: ["phantom", "solflare", "backpack"],
    loginMethods: ["wallet", "email"],
  });

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
            name: "devnet",
            rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com",
          },
        ],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
