import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { parseBurnBpsFromMemo } from "@/lib/payments/token-pricing";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const transactions = await prisma.creditTransaction.findMany({
            where: {
                status: "CONFIRMED",
                type: "PURCHASE",
            },
            select: {
                tokenAmount: true,
                memo: true,
                createdAt: true,
            },
        });

        let totalTokensBurned = BigInt(0);
        let totalTokensToTreasury = BigInt(0);

        const burnHistory = transactions.map((tx) => {
            const tokenAmount = tx.tokenAmount || BigInt(0);
            const burnBps = parseBurnBpsFromMemo(tx.memo || "");
            const burnAmount = (tokenAmount * BigInt(burnBps)) / BigInt(10000);
            const treasuryAmount = tokenAmount - burnAmount;

            totalTokensBurned += burnAmount;
            totalTokensToTreasury += treasuryAmount;

            return {
                date: tx.createdAt.toISOString(),
                tokenAmount: tokenAmount.toString(),
                burnAmount: burnAmount.toString(),
                burnBps,
            };
        });

        return NextResponse.json({
            totalBurned: totalTokensBurned.toString(),
            totalTreasury: totalTokensToTreasury.toString(),
            totalVolume: (totalTokensBurned + totalTokensToTreasury).toString(),
            burnPercent: 10, // Default for display
            history: burnHistory.slice(-20).reverse(), // Last 20 transactions
        });
    } catch (error) {
        console.error("Failed to fetch burn stats:", error);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
