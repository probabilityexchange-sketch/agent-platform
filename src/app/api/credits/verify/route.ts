import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, handleAuthError } from "@/lib/auth/middleware";
import {
  verifyNativeSolTransaction,
  verifyTransaction,
} from "@/lib/solana/tx-verification";
import { addCredits } from "@/lib/credits/engine";
import { prisma } from "@/lib/db/prisma";
import {
  parseBurnBpsFromMemo,
  resolvePaymentAsset,
  resolveSolBurnWallet,
  splitTokenAmountsByBurn,
} from "@/lib/payments/token-pricing";

const schema = z.object({
  txSignature: z.string().min(1, "Transaction signature required"),
  memo: z.string().min(1, "Memo required"),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { txSignature, memo } = parsed.data;

    // Check for replay
    const existing = await prisma.creditTransaction.findUnique({
      where: { txSignature },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Transaction already processed" },
        { status: 409 }
      );
    }

    // Find pending transaction by memo
    const pendingTx = await prisma.creditTransaction.findFirst({
      where: {
        userId: auth.userId,
        memo,
        status: "PENDING",
      },
    });

    if (!pendingTx) {
      return NextResponse.json(
        { error: "No pending purchase found for this memo" },
        { status: 404 }
      );
    }

    if (!pendingTx.tokenAmount) {
      await prisma.creditTransaction.update({
        where: { id: pendingTx.id },
        data: { status: "FAILED", txSignature },
      });
      return NextResponse.json(
        { error: "Pending purchase is missing token amount" },
        { status: 400 }
      );
    }

    const burnBps = parseBurnBpsFromMemo(pendingTx.memo || memo);
    const split = splitTokenAmountsByBurn(pendingTx.tokenAmount, burnBps);
    const paymentAsset = resolvePaymentAsset();

    const treasuryWallet = process.env.TREASURY_WALLET;
    if (!treasuryWallet) {
      return NextResponse.json(
        { error: "Payment verification is missing treasury wallet config" },
        { status: 500 }
      );
    }

    const result =
      paymentAsset === "sol"
        ? await verifyNativeSolTransaction({
            txSignature,
            expectedRecipient: treasuryWallet,
            expectedTreasuryAmountLamports: split.treasuryTokenAmount,
            expectedMemo: memo,
            expectedBurnAmountLamports: split.burnTokenAmount,
            expectedBurnRecipient: resolveSolBurnWallet(),
            expectedSender: auth.wallet,
          })
        : await verifyTransaction(
            txSignature,
            (process.env.TOKEN_MINT || process.env.NEXT_PUBLIC_TOKEN_MINT)!,
            treasuryWallet,
            split.treasuryTokenAmount,
            memo,
            split.burnTokenAmount
          );

    if (!result.valid) {
      await prisma.creditTransaction.update({
        where: { id: pendingTx.id },
        data: { status: "FAILED", txSignature },
      });
      return NextResponse.json(
        { error: result.error || "Verification failed" },
        { status: 400 }
      );
    }

    // Credit the user
    await addCredits(
      auth.userId,
      pendingTx.amount,
      txSignature,
      pendingTx.tokenAmount!,
      memo
    );

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { creditBalance: true },
    });

    return NextResponse.json({
      success: true,
      creditsAdded: pendingTx.amount,
      newBalance: user?.creditBalance || 0,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
