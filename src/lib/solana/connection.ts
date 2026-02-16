import { Connection, clusterApiUrl, Commitment } from "@solana/web3.js";

const RPC_URL = process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("devnet");
const COMMITMENT = (process.env.CONFIRMATION_LEVEL as Commitment | undefined) || "confirmed";

const globalForSolana = globalThis as unknown as {
  solanaConnection: Connection | undefined;
};

export const connection = globalForSolana.solanaConnection ?? new Connection(RPC_URL, COMMITMENT);

if (process.env.NODE_ENV !== "production") {
  globalForSolana.solanaConnection = connection;
}
