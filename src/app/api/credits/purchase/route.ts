import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireAuth, handleAuthError } from "@/lib/auth/middleware";
import { getTokenPacks } from "@/lib/credits/engine";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/lib/utils/rate-limit";
import {
  quoteTokenAmountForUsd,
  resolvePaymentAsset,
  resolveSolBurnWallet,
  splitTokenAmountsByBurn,
} from "@/lib/payments/token-pricing";

const schema = z.object({
  packageId: z.string(),
});

const DEFAULT_PURCHASE_INTENT_TTL_MS = 15 * 60 * 1000;
const MAX_PURCHASE_INTENT_TTL_MS = 24 * 60 * 60 * 1000;
const WSOL_MINT = "So11111111111111111111111111111111111111112";

function resolvePurchaseIntentTtlMs(): number {
  const raw = Number(process.env.PURCHASE_INTENT_TTL_MS || DEFAULT_PURCHASE_INTENT_TTL_MS);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_PURCHASE_INTENT_TTL_MS;
  return Math.min(Math.trunc(raw), MAX_PURCHASE_INTENT_TTL_MS);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();

    const { allowed } = await checkRateLimit(
      `purchase:${auth.userId}`,
      RATE_LIMITS.purchase
    );
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { packageId } = parsed.data;

    // 1. Find the pack
    const packs = getTokenPacks();
    const pkg = packs.find(p => p.id === packageId);

    if (!pkg) {
      return NextResponse.json({ error: "Invalid package ID" }, { status: 400 });
    }

    // 2. Resolve pricing
    // Although we want "No USD abstraction", for the initial purchase 
    // we still need to calculate how many tokens to send if we don't have a fixed price yet.
    // However, the TokenPack has a fixed tokenAmount. 
    // We should probably just use that.

    const tokenAmountToTransfer = pkg.tokenAmount; // whole tokens
    const decimals = Number(process.env.TOKEN_DECIMALS || process.env.NEXT_PUBLIC_TOKEN_DECIMALS || "9");
    const tokenAmountBaseUnits = BigInt(tokenAmountToTransfer) * BigInt(10 ** decimals);

    const paymentAsset = "spl"; // Force SPL for $RANDI
    const tokenMint = process.env.TOKEN_MINT || process.env.NEXT_PUBLIC_TOKEN_MINT || "GmnoShpt5vyGwZLyPYsBah2vxPUAfvw6fKSLbBa2XpFy";
    const treasuryWallet = process.env.TREASURY_WALLET || "BFnVSDKbTfe7tRPB8QqmxcXZjzkSxwBMH34HdnbStbQ3";

    // For deposit, we might still want to burn a bit (e.g. 10% entry burn?) 
    // but the user's vision says 70% burn on USAGE. 
    // For deposit, let's keep it simple: 100% to treasury (no entry burn).
    const split = {
      treasuryTokenAmount: tokenAmountBaseUnits,
      burnTokenAmount: BigInt(0),
      burnBps: 0
    };

    const memo = `ap:deposit:${Date.now()}:${auth.userId.slice(-6)}`;
    const intentExpiresAt = new Date(Date.now() + resolvePurchaseIntentTtlMs());

    // 3. Create pending transaction
    const tx = await prisma.tokenTransaction.create({
      data: {
        userId: auth.userId,
        type: "PURCHASE",
        status: "PENDING",
        amount: pkg.tokenAmount, // Base tokens (bonus added on confirmed)
        tokenAmount: tokenAmountBaseUnits,
        memo,
        description: `Deposit ${pkg.tokenAmount.toLocaleString()} $RANDI (${pkg.name} Pack)`,
      },
    });

    return NextResponse.json({
      transactionId: tx.id,
      paymentAsset,
      tokenMint,
      treasuryWallet,
      burnWallet: null,
      tokenAmount: split.treasuryTokenAmount.toString(),
      burnAmount: split.burnTokenAmount.toString(),
      grossTokenAmount: tokenAmountBaseUnits.toString(),
      memo,
      decimals,
      quote: {
        itemUsd: "0", // Not used anymore
        itemName: pkg.name,
        tokenUsdPrice: "0",
        tokenAmountDisplay: pkg.tokenAmount.toLocaleString(),
        source: "fixed",
        burnBps: 0,
      },
      intentExpiresAt: intentExpiresAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return handleAuthError(error);
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return handleAuthError(error);
  }
}
