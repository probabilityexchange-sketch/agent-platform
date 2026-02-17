import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { signToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db/prisma";
import { resolvePrivyWallet } from "@/lib/auth/privy";

const schema = z.object({
  wallet: z.string().optional(),
});

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export async function POST(request: NextRequest) {
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Unauthorized", code: "missing_access_token" },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  let wallet: string;
  try {
    wallet = await resolvePrivyWallet(accessToken, parsed.data.wallet);
  } catch (error) {
    // Some wallet adapters can provide a selected address that differs from the
    // linked wallet returned by Privy. Fall back to any linked Solana wallet.
    try {
      wallet = await resolvePrivyWallet(accessToken);
    } catch (fallbackError) {
      const primaryReason =
        error instanceof Error ? error.message : "Unknown Privy verification error";
      const fallbackReason =
        fallbackError instanceof Error
          ? fallbackError.message
          : "Unknown fallback verification error";

      console.error("Privy session verification failed", {
        primaryReason,
        fallbackReason,
        requestedWallet: parsed.data.wallet ?? null,
      });

      return NextResponse.json(
        {
          error: "Unable to verify authenticated wallet",
          code: "wallet_verification_failed",
        },
        { status: 401 }
      );
    }
  }

  const user = await prisma.user.upsert({
    where: { walletAddress: wallet },
    update: {},
    create: { walletAddress: wallet },
  });

  const token = await signToken(user.id, wallet);
  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      walletAddress: user.walletAddress,
      username: user.username,
      creditBalance: user.creditBalance,
    },
  });

  response.cookies.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60,
    path: "/",
  });

  return response;
}
