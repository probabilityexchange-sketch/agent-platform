import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getSolanaRpcUrl(): string {
  return (
    process.env.SOLANA_RPC_URL ||
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    "https://api.mainnet-beta.solana.com"
  );
}

export async function POST(request: NextRequest) {
  const rpcUrl = getSolanaRpcUrl();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const upstreamResponse = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const text = await upstreamResponse.text();
  return new NextResponse(text, {
    status: upstreamResponse.status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
