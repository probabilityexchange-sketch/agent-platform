import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireAuth, handleAuthError } from "@/lib/auth/middleware";
import { getCreditPacks, BURN_BPS } from "@/lib/tokenomics";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/lib/utils/rate-limit";
import {
  resolvePaymentAsset,
  resolveSolBurnWallet,
  splitTokenAmountsByBurn,
} from "@/lib/payments/token-pricing";

const schema = z.object({
  packageId: z.string(),
});

const DEFAULT_PURCHASE_INTENT_TTL_MS = 15 * 60 * 1000;
const MAX_PURCHASE_INTENT_TTL_MS = 24 * 60 * 60 * 1000;

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
    const packs = getCreditPacks();
    const pkg = packs.find(p => p.id === packageId);

    if (!pkg) {
      return NextResponse.json({ error: "Invalid package ID" }, { status: 400 });
    }

    // 2. Resolve token amount
    const tokenAmountToTransfer = pkg.creditAmount; // whole tokens
    const decimals = Number(process.env.TOKEN_DECIMALS || process.env.NEXT_PUBLIC_TOKEN_DECIMALS || "6");
    const tokenAmountBaseUnits = BigInt(tokenAmountToTransfer) * BigInt(10 ** decimals);

    const paymentAsset = "spl"; // Force SPL for $RANDI
    const tokenMint = process.env.TOKEN_MINT || process.env.NEXT_PUBLIC_TOKEN_MINT;
    if (!tokenMint) {
      throw new Error("CRITICAL: TOKEN_MINT environment variable is not set.");
    }

    // FIX (CRITICAL): All payments use the canonical BURN_BPS from tokenomics.ts.
    // Previously, deposits used 0% burn while subscriptions used 7000 (70%).
    // Now all payment types consistently apply the current phase burn rate.
    const isSubscription = (pkg as any).type === "subscription";
    const effectiveBurnBps = BURN_BPS; // Always use the canonical rate
    const split = splitTokenAmountsByBurn(tokenAmountBaseUnits, effectiveBurnBps);

    // FIX (HIGH): Removed hardcoded treasury wallet fallback.
    // The application must fail loudly if TREASURY_WALLET is not configured.
    const treasuryWallet = process.env.TREASURY_WALLET;
    if (!treasuryWallet) {
      throw new Error("CRITICAL: TREASURY_WALLET environment variable is not set.");
    }

    const typePrefix = isSubscription ? "subscribe" : "deposit";
    const memo = `ap:${typePrefix}:${Date.now()}:${auth.userId.slice(-6)}:b${effectiveBurnBps}`;
    const intentExpiresAt = new Date(Date.now() + resolvePurchaseIntentTtlMs());

    const tx = await prisma.tokenTransaction.create({
      data: {
        userId: auth.userId,
        type: isSubscription ? "SUBSCRIBE" : "PURCHASE",
        status: "PENDING",
        amount: pkg.creditAmount,
        tokenAmount: tokenAmountBaseUnits,
        memo,
        description: isSubscription
          ? `Subscribe to Randi Pro (${pkg.creditAmount.toLocaleString()} Credits)`
          : `Deposit ${pkg.creditAmount.toLocaleString()} $RANDI (${pkg.name})`,
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
        itemUsd: "0",
        itemName: pkg.name,
        tokenUsdPrice: "0",
        tokenAmountDisplay: pkg.creditAmount.toLocaleString(),
        source: "fixed",
        burnBps: effectiveBurnBps,
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
