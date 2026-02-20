import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireAuth, handleAuthError } from "@/lib/auth/middleware";
import { SUBSCRIPTION_USD, getSubscriptionPlan } from "@/lib/credits/engine";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/lib/utils/rate-limit";
import {
  quoteTokenAmountForUsd,
  resolvePaymentAsset,
  resolveSolBurnWallet,
  splitTokenAmountsByBurn,
} from "@/lib/payments/token-pricing";

const schema = z.object({
  planId: z.literal("monthly"),
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

    const plan = getSubscriptionPlan();

    const paymentAsset = resolvePaymentAsset();
    const tokenMint = process.env.TOKEN_MINT || process.env.NEXT_PUBLIC_TOKEN_MINT;
    const priceQuoteMint = paymentAsset === "sol"
      ? process.env.SOL_PRICE_MINT?.trim() || WSOL_MINT
      : tokenMint!;
    const treasuryWallet = process.env.TREASURY_WALLET;
    const decimals = paymentAsset === "sol" ? 9 : Number(process.env.TOKEN_DECIMALS) || 9;
    const solBurnWallet = resolveSolBurnWallet();

    if (!treasuryWallet) {
      return NextResponse.json(
        { error: "Payment configuration is missing treasury wallet" },
        { status: 500 }
      );
    }
    if (paymentAsset === "spl" && !tokenMint) {
      return NextResponse.json(
        { error: "Payment configuration is missing token mint for SPL mode" },
        { status: 500 }
      );
    }

    const quote = await quoteTokenAmountForUsd({
      usdAmount: String(SUBSCRIPTION_USD),
      tokenMint: priceQuoteMint,
      tokenDecimals: decimals,
    });

    const split = splitTokenAmountsByBurn(quote.tokenAmountBaseUnits);
    const memo = `ap:subscribe:${Date.now()}:${auth.userId.slice(-6)}:b${split.burnBps}`;
    const intentExpiresAt = new Date(Date.now() + resolvePurchaseIntentTtlMs());

    const tx = await prisma.creditTransaction.create({
      data: {
        userId: auth.userId,
        type: "PURCHASE",
        status: "PENDING",
        amount: 0, // Subscription — no credit amount
        tokenAmount: quote.tokenAmountBaseUnits,
        memo,
        description: `Subscribe to ${plan.name} ($${SUBSCRIPTION_USD}/month)`,
      },
    });

    return NextResponse.json({
      transactionId: tx.id,
      paymentAsset,
      tokenMint: paymentAsset === "spl" ? tokenMint : null,
      treasuryWallet,
      burnWallet: paymentAsset === "sol" ? solBurnWallet : null,
      tokenAmount: split.treasuryTokenAmount.toString(),
      burnAmount: split.burnTokenAmount.toString(),
      grossTokenAmount: quote.tokenAmountBaseUnits.toString(),
      memo,
      decimals,
      quote: {
        planUsd: SUBSCRIPTION_USD,
        tokenUsdPrice: quote.tokenUsdPrice,
        tokenAmountDisplay: quote.tokenAmountDisplay,
        source: quote.source,
        burnBps: split.burnBps,
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
