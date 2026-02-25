import { Connection } from "@solana/web3.js";

const DEFAULT_MAINNET_RPC = "https://api.mainnet-beta.solana.com";

const RPC_URL =
  process.env.SOLANA_RPC_URL ||
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  DEFAULT_MAINNET_RPC;

const globalForSolana = globalThis as unknown as {
  solanaConnection: Connection | undefined;
};

export const connection =
  globalForSolana.solanaConnection ??
  new Connection(RPC_URL, {
    commitment: "confirmed",
    wsEndpoint: "", // Disable WebSockets for Vercel compatibility
  });

if (process.env.NODE_ENV !== "production") {
  globalForSolana.solanaConnection = connection;
}
