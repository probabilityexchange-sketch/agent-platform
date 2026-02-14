"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { type ReactNode } from "react";

export function PrivyContextProvider({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";

  if (!appId) {
    console.warn("NEXT_PUBLIC_PRIVY_APP_ID is not set in environment variables");
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#6d28d9",
          logo: "/logo.png", // Ensure this exists or update
        },
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
        solanaClusters: [
          {
            name: "devnet",
            endpoint: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com",
          },
        ],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
