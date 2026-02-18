import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_MAINNET_RPC = "https://api.mainnet-beta.solana.com";

function normalizeUrl(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function getSolanaRpcCandidates(): string[] {
  const raw = [
    normalizeUrl(process.env.SOLANA_RPC_URL),
    normalizeUrl(process.env.NEXT_PUBLIC_SOLANA_RPC_URL),
    DEFAULT_MAINNET_RPC,
  ];

  const unique = new Set<string>();
  for (const value of raw) {
    if (value) unique.add(value);
  }
  return [...unique];
}

async function callRpc(url: string, payload: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rpcCandidates = getSolanaRpcCandidates();
  let upstreamResponse: Response | null = null;
  let lastResponseText = "";

  for (const rpcUrl of rpcCandidates) {
    try {
      const response = await callRpc(rpcUrl, payload);
      const responseText = await response.text();

      // Retry with next candidate on common provider-level auth/rate/network HTTP failures.
      if (
        (response.status === 401 || response.status === 403 || response.status === 429 || response.status >= 500) &&
        rpcCandidates.length > 1
      ) {
        upstreamResponse = response;
        lastResponseText = responseText;
        continue;
      }

      return new NextResponse(responseText, {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch {
      continue;
    }
  }

  if (upstreamResponse) {
    return new NextResponse(lastResponseText, {
      status: upstreamResponse.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  return NextResponse.json(
    { error: "Unable to reach configured Solana RPC endpoints" },
    {
      status: 502,
    }
  );
}
