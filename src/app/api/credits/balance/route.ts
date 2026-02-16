import { NextResponse } from "next/server";
import { requireAuth, handleAuthError } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { isBypassWallet, getBypassCredits } from "@/lib/credits/bypass";

export async function GET() {
  try {
    const auth = await requireAuth();
    console.log("Fetching balance for user:", auth.userId, "wallet:", auth.wallet);
    console.log("Bypass check - wallet:", auth.wallet, "isBypass:", isBypassWallet(auth.wallet));

    if (isBypassWallet(auth.wallet)) {
      console.log("BYPASS ACTIVE - returning", getBypassCredits(), "credits");
      return NextResponse.json({
        balance: getBypassCredits(),
        transactions: [],
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { creditBalance: true },
    });

    console.log("User data found:", user);

    const transactions = (await prisma.creditTransaction.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        type: true,
        status: true,
        amount: true,
        txSignature: true,
        description: true,
        createdAt: true,
      },
    })).map(t => ({ ...t, createdAt: t.createdAt.toISOString() }));

    return NextResponse.json({
      balance: user?.creditBalance || 0,
      transactions,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
