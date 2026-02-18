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

function shouldRetryRpcResponse(status: number, responseText: string): boolean {
  if (status === 401 || status === 403 || status === 429 || status >= 500) {
    return true;
  }

  try {
    const parsed = JSON.parse(responseText) as {
      error?: { code?: number | string; message?: string };
    };
    const codeValue = parsed?.error?.code;
    const numericCode =
      typeof codeValue === "number" ? codeValue : Number.parseInt(String(codeValue), 10);
    const message = (parsed?.error?.message || "").toLowerCase();

    if (numericCode === 401 || numericCode === 403 || numericCode === 429) {
      return true;
    }

    if (message.includes("access forbidden") || message.includes("too many requests")) {
      return true;
    }
  } catch {
    // Non-JSON or malformed response; treat as terminal for this candidate.
  }

  return false;
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
    const hasFallbackCandidate = rpcCandidates[rpcCandidates.length - 1] !== rpcUrl;
    try {
      const response = await callRpc(rpcUrl, payload);
      const responseText = await response.text();

      if (hasFallbackCandidate && shouldRetryRpcResponse(response.status, responseText)) {
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
