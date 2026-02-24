import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateNonce } from "@/lib/auth/nonce";
import { isValidSolanaAddress } from "@/lib/solana/validation";
import { checkRateLimit, RATE_LIMITS } from "@/lib/utils/rate-limit";

const schema = z.object({
  wallet: z.string().refine(isValidSolanaAddress, "Invalid Solana address"),
});

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet");

  const parsed = schema.safeParse({ wallet });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { allowed } = await checkRateLimit(
    `auth:nonce:${parsed.data.wallet}`,
    RATE_LIMITS.auth
  );
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const nonce = await generateNonce(parsed.data.wallet);

  return NextResponse.json({ nonce });
}
