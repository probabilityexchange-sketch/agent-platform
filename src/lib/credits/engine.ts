import { prisma } from "@/lib/db/prisma";
import {
  getCallCost,
  toLamports,
  StakingLevel,
  getCreditPacks,
  CreditPack,
  STAKING_TIERS,
  TOKEN_DECIMALS,
} from "@/lib/tokenomics";

export { getCreditPacks };

/**
 * Calculate and apply pending yield for a user based on their staking level.
 * This is lazily evaluated when a user takes an action.
 */
export async function calculateAndApplyYield(userId: string): Promise<number> {
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          stakedAmount: true,
          stakingLevel: true,
          lastYieldClaimAt: true,
          tokenBalance: true,
        },
      });

      if (!user || user.stakedAmount <= 0) return 0;

      const level = user.stakingLevel as StakingLevel;
      const tierConfig = STAKING_TIERS[level];

      // No yield for this tier
      if (!tierConfig || tierConfig.dailyCreditYield === 0) return 0;

      const now = new Date();
      // Default last claim to now if it's null, meaning they just staked and haven't accrued yet
      const lastClaim = user.lastYieldClaimAt || now;

      // Calculate hours passed since last claim
      const hoursElapsed = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);

      // Minimum 1 minute elapsed to prevent spam/tiny increments
      if (hoursElapsed < 0.016) return 0;

      // Calculate fractional daily yield
      const fractionalDays = hoursElapsed / 24;
      const yieldAmount = Math.floor(tierConfig.dailyCreditYield * fractionalDays);

      if (yieldAmount > 0) {
        await tx.user.update({
          where: { id: userId },
          data: {
            tokenBalance: { increment: yieldAmount },
            lastYieldClaimAt: now
          },
        });
        // Record yield transaction
        await tx.tokenTransaction.create({
          data: {
            userId,
            type: "YIELD",
            status: "CONFIRMED",
            amount: yieldAmount,
            tokenAmount: BigInt(0),
            description: `Staking Yield (${Math.floor(hoursElapsed)} hours at ${level} tier)`,
          }
        });
      }

      return yieldAmount;
    });
  } catch (error) {
    console.error("Error applying staking yield for user:", userId, error);
    return 0;
  }
}

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
  try {
    // 0. Apply any pending staking yield before checking balance
    // This is safe because it has its own internal try-catch
    await calculateAndApplyYield(userId);

    return await prisma.$transaction(async (tx) => {
      // 1. Get user and their staking level
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          tokenBalance: true,
          stakedAmount: true,
          stakingLevel: true
        },
      });

      if (!user) {
        return { success: false, error: "User not found" };
      }

      // 2. Calculate cost based on model and staking level
      const costDetails = getCallCost(model, (user.stakingLevel || "NONE") as StakingLevel);
      const finalCost = costDetails.finalCost;

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
      if (chatSessionId && chatSessionId !== "new") {
        try {
          await tx.chatSession.update({
            where: { id: chatSessionId },
            data: { tokensUsed: { increment: finalCost } },
          });
        } catch (e) {
          console.warn("Failed to update tokensUsed for session:", chatSessionId);
        }
      }

      // 6. Record transaction for burn processing
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
  } catch (error) {
    console.error("Deduction error:", error);
    return { success: false, error: "An internal error occurred. Please try again." };
  }
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
  // 0. Apply any pending staking yield before processing new deposit
  await calculateAndApplyYield(userId);

  const packs = getCreditPacks();
  const pack = packs.find(p => p.id === packId);

  // Calculate bonus if pack found
  let bonusMultiplier = 1.0;
  if (pack) {
    bonusMultiplier = 1 + (pack.bonusPercent / 100);
  }

  // Convert BigInt base amount (lamports) to whole tokens for the bonus calc
  const decimals = 10 ** TOKEN_DECIMALS;
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
  // Apply any pending yield before returning the balance
  await calculateAndApplyYield(userId);

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
