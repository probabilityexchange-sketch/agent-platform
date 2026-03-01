import { prisma } from "@/lib/db/prisma";
import {
  getCallCost,
  toLamports,
  StakingLevel,
  getCreditPacks,
  CreditPack
} from "@/lib/tokenomics";

export { getCreditPacks };

/**
 * Deduct tokens from user balance for an agent call.
 * This is the primary function for charging users on a per-call basis.
 */
export async function deductForAgentCall(
  userId: string,
  model: string,
  description: string,
  chatSessionId?: string
): Promise<{ success: boolean; cost?: number; error?: string }> {
  return await prisma.$transaction(async (tx) => {
    // 1. Get user and their staking level
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        tokenBalance: true,
        stakedAmount: true,
        stakingLevel: true // Cached level, but we can verify it
      },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // 2. Calculate cost based on model and staking level
    // Note: In a production app, we'd recalc staking level from stakedAmount 
    // to be safe, but using the cached stakingLevel is faster for now.
    const costDetails = getCallCost(model, user.stakingLevel as StakingLevel);
    const { finalCost } = costDetails;

    // 3. Check if user has enough tokens
    if (user.tokenBalance < finalCost) {
      return { success: false, error: "Insufficient $RANDI balance" };
    }

    // 4. Deduct from user balance
    await tx.user.update({
      where: { id: userId },
      data: { tokenBalance: { decrement: finalCost } },
    });

    // 5. Update ChatSession (if applicable)
    if (chatSessionId) {
      await tx.chatSession.update({
        where: { id: chatSessionId },
        data: { tokensUsed: { increment: finalCost } },
      });
    }

    // 6. Record transaction for burn processing
    // amount is stored as negative for USAGE
    await tx.tokenTransaction.create({
      data: {
        userId,
        type: "USAGE",
        status: "CONFIRMED",
        amount: -finalCost,
        tokenAmount: toLamports(finalCost),
        description: `[Call] ${model}: ${description}`,
      },
    });

    return { success: true, cost: finalCost };
  });
}

/**
 * Handle token deposit (replaces addCredits).
 * Bonus tokens are awarded based on the token pack.
 */
export async function depositTokens(
  userId: string,
  packId: string,
  txSignature: string,
  baseTokenAmount: bigint,
  memo: string
): Promise<void> {
  const packs = getCreditPacks();
  const pack = packs.find(p => p.id === packId);

  // Calculate bonus if pack found
  let bonusMultiplier = 1.0;
  if (pack) {
    bonusMultiplier = 1 + (pack.bonusPercent / 100);
  }

  // Convert BigInt base amount (lamports) to whole tokens for the bonus calc
  const decimals = 10 ** 9;
  const wholeTokens = Number(baseTokenAmount / BigInt(decimals));
  const finalWholeTokens = Math.floor(wholeTokens * bonusMultiplier);

  await prisma.$transaction(async (tx) => {
    // 1. Claim the pending transaction record
    const claim = await tx.tokenTransaction.updateMany({
      where: { memo, userId, status: "PENDING" },
      data: {
        status: "CONFIRMED",
        txSignature,
        tokenAmount: baseTokenAmount, // record the actual on-chain amount transferred
        amount: finalWholeTokens,     // record the credited whole tokens (including bonus)
      },
    });

    if (claim.count === 0) {
      // Transaction already processed or invalid
      return;
    }

    // 2. Update user balance
    await tx.user.update({
      where: { id: userId },
      data: { tokenBalance: { increment: finalWholeTokens } },
    });
  });
}

/**
 * Get user balance and staking info.
 */
export async function getUserWalletInfo(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      tokenBalance: true,
      stakedAmount: true,
      stakingLevel: true,
    },
  });

  if (!user) return null;

  return {
    tokenBalance: user.tokenBalance,
    stakedAmount: user.stakedAmount,
    stakingLevel: user.stakingLevel as StakingLevel,
  };
}

/** Legacy support: redirects to new logic */
export async function deductCredits(
  userId: string,
  amount: number,
  description: string
): Promise<boolean> {
  const result = await deductForAgentCall(userId, "llama-3-70b", description);
  return result.success;
}
