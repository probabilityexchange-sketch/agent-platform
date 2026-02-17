import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireAuth, handleAuthError } from "@/lib/auth/middleware";
import { getPackageById } from "@/lib/credits/engine";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/lib/utils/rate-limit";
import {
  quoteTokenAmountForUsd,
  resolvePaymentAsset,
  resolveSolBurnWallet,
  splitTokenAmountsByBurn,
} from "@/lib/payments/token-pricing";

const schema = z.object({
  packageId: z.enum(["small", "medium", "large"]),
});

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

    const pkg = getPackageById(parsed.data.packageId);
    if (!pkg) {
      return NextResponse.json(
        { error: "Invalid package" },
        { status: 400 }
      );
    }

    const paymentAsset = resolvePaymentAsset();
    const tokenMint = process.env.TOKEN_MINT || process.env.NEXT_PUBLIC_TOKEN_MINT;
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
      usdAmount: pkg.usdAmount,
      tokenMint: paymentAsset === "sol" ? "SOL" : tokenMint!,
      tokenDecimals: decimals,
    });

    const split = splitTokenAmountsByBurn(quote.tokenAmountBaseUnits);
    const memo = `ap:purchase:${Date.now()}:${auth.userId.slice(-6)}:b${split.burnBps}`;

    const tx = await prisma.creditTransaction.create({
      data: {
        userId: auth.userId,
        type: "PURCHASE",
        status: "PENDING",
        amount: pkg.credits,
        tokenAmount: quote.tokenAmountBaseUnits,
        memo,
        description: `Purchase ${pkg.name} package (${pkg.credits} credits, $${quote.usdAmount})`,
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
        packageUsd: quote.usdAmount,
        tokenUsdPrice: quote.tokenUsdPrice,
        tokenAmountDisplay: quote.tokenAmountDisplay,
        source: quote.source,
        burnBps: split.burnBps,
      },
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
