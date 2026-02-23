import { Connection, clusterApiUrl, Cluster } from "@solana/web3.js";

const RPC_URL =
  process.env.SOLANA_RPC_URL ||
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  clusterApiUrl("mainnet" as Cluster);

const globalForSolana = globalThis as unknown as {
  solanaConnection: Connection | undefined;
};

export const connection =
  globalForSolana.solanaConnection ?? new Connection(RPC_URL, "confirmed");

if (process.env.NODE_ENV !== "production") {
  globalForSolana.solanaConnection = connection;
}
