import { prisma } from "@/lib/db/prisma";

export const SUBSCRIPTION_USD = 20;
export const SUBSCRIPTION_CREDITS = 999_999; // unlimited while active

export interface SubscriptionPlan {
  id: string;
  name: string;
  usdAmount: string;
  period: string;
  features: string[];
}

export function getSubscriptionPlan(): SubscriptionPlan {
  return {
    id: "monthly",
    name: "Randi Pro",
    usdAmount: String(SUBSCRIPTION_USD),
    period: "month",
    features: [
      "Unlimited AI agent chats",
      "All tool integrations",
      "Priority access to new agents",
      "1000+ Composio tool integrations",
    ],
  };
}

export async function getUserSubscription(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionStatus: true,
      subscriptionExpiresAt: true,
      creditBalance: true,
    },
  });

  if (!user) return null;

  const isActive =
    user.subscriptionStatus === "active" &&
    user.subscriptionExpiresAt &&
    new Date(user.subscriptionExpiresAt) > new Date();

  return {
    status: isActive ? "active" as const : user.subscriptionStatus as "none" | "expired",
    expiresAt: user.subscriptionExpiresAt,
    creditBalance: user.creditBalance,
  };
}

export async function activateSubscription(
  userId: string,
  txSignature: string,
  tokenAmount: bigint,
  memo: string
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await prisma.$transaction(async (tx) => {
    // Update/claim the pending transaction
    const claim = await tx.creditTransaction.updateMany({
      where: { memo, userId, status: "PENDING" },
      data: {
        status: "CONFIRMED",
        txSignature,
        tokenAmount,
      },
    });

    if (claim.count === 0) {
      return;
    }

    // Activate subscription
    await tx.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: "active",
        subscriptionExpiresAt: expiresAt,
      },
    });
  });
}

/** Legacy: still used if credit-based containers exist */
export async function deductCredits(
  userId: string,
  amount: number,
  description: string,
  containerId?: string
): Promise<boolean> {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { creditBalance: true, subscriptionStatus: true, subscriptionExpiresAt: true },
    });

    if (!user) return false;

    // If user has active subscription, always allow
    const isSubscribed =
      user.subscriptionStatus === "active" &&
      user.subscriptionExpiresAt &&
      new Date(user.subscriptionExpiresAt) > new Date();

    if (isSubscribed) {
      await tx.creditTransaction.create({
        data: {
          userId,
          type: "USAGE",
          status: "CONFIRMED",
          amount: 0,
          containerId,
          description: `[Subscription] ${description}`,
        },
      });
      return true;
    }

    // Fallback to credit-based deduction
    if (user.creditBalance < amount) {
      return false;
    }

    await tx.user.update({
      where: { id: userId },
      data: { creditBalance: { decrement: amount } },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        type: "USAGE",
        status: "CONFIRMED",
        amount: -amount,
        containerId,
        description,
      },
    });

    return true;
  });
}

export async function addCredits(
  userId: string,
  amount: number,
  txSignature: string,
  tokenAmount: bigint,
  memo: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const claim = await tx.creditTransaction.updateMany({
      where: { memo, userId, status: "PENDING" },
      data: {
        status: "CONFIRMED",
        txSignature,
        tokenAmount,
      },
    });

    if (claim.count === 0) {
      return;
    }

    await tx.user.update({
      where: { id: userId },
      data: { creditBalance: { increment: amount } },
    });
  });
}
