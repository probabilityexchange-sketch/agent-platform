import { NextResponse } from "next/server";

// Public config - served at runtime so we can swap env vars without rebuilding
export async function GET() {
  return NextResponse.json({
    tokenMint: process.env.TOKEN_MINT || process.env.NEXT_PUBLIC_TOKEN_MINT || "",
    solanaNetwork:
      process.env.NEXT_PUBLIC_SOLANA_NETWORK ||
      process.env.SOLANA_NETWORK ||
      "devnet",
    solanaRpcUrl:
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
      process.env.SOLANA_RPC_URL ||
      "https://api.devnet.solana.com",
    domain: process.env.NEXT_PUBLIC_DOMAIN || "localhost:3000",
  });
}
