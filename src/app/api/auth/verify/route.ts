import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { consumeNonce } from "@/lib/auth/nonce";
import { signToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db/prisma";
import { isValidSolanaAddress } from "@/lib/solana/validation";
import { checkRateLimit, RATE_LIMITS } from "@/lib/utils/rate-limit";
import { ensureUserHasUsername } from "@/lib/utils/username";

const schema = z.object({
  wallet: z.string().refine(isValidSolanaAddress, "Invalid wallet address"),
  signature: z.string().min(1, "Signature required"),
  nonce: z.string().min(1, "Nonce required"),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { wallet, signature, nonce } = parsed.data;

  const { allowed } = await checkRateLimit(`auth:verify:${wallet}`, RATE_LIMITS.auth);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Verify nonce
  const nonceValid = await consumeNonce(wallet, nonce);
  if (!nonceValid) {
    return NextResponse.json(
      { error: "Invalid or expired nonce" },
      { status: 401 }
    );
  }

  // Verify signature
  const message = `Sign in to Agent Platform\nNonce: ${nonce}`;
  const messageBytes = new TextEncoder().encode(message);
  let signatureBytes: Uint8Array;
  let publicKeyBytes: Uint8Array;

  try {
    signatureBytes = bs58.decode(signature);
    publicKeyBytes = bs58.decode(wallet);
  } catch {
    return NextResponse.json(
      { error: "Invalid signature encoding" },
      { status: 400 }
    );
  }

  if (signatureBytes.length !== 64 || publicKeyBytes.length !== 32) {
    return NextResponse.json(
      { error: "Invalid signature payload" },
      { status: 400 }
    );
  }

  const isValid = nacl.sign.detached.verify(
    messageBytes,
    signatureBytes,
    publicKeyBytes
  );

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Get or create user
  const user = await prisma.user.upsert({
    where: { walletAddress: wallet },
    update: {},
    create: { walletAddress: wallet },
  });
  const username = await ensureUserHasUsername(prisma, user.id, wallet);

  // Issue JWT
  const token = await signToken(user.id, wallet);

  const response = NextResponse.json({
    user: {
      id: user.id,
      walletAddress: user.walletAddress,
      username,
      tokenBalance: user.tokenBalance,
    },
  });

  response.cookies.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60,
    path: "/",
    domain: ".randi.chat",
  });

  return response;
}
