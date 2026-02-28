/**
 * Token-Gating Library
 * 
 * Handles staking tier logic for premium model access via $RANDI staking.
 * Powered by tokenomics.ts
 */

import {
    STAKING_TIERS as TIERS,
    StakingLevel,
    getStakingLevel as getLevel,
    TOKEN_MINT,
    TOKEN_DECIMALS,
} from "./tokenomics";

export type { StakingLevel };
export { TIERS as STAKING_TIERS };
export const RANDI_TOKEN_MINT = TOKEN_MINT;
export const RANDI_TOKEN_DECIMALS = TOKEN_DECIMALS;

const TIER_ORDER: StakingLevel[] = ["NONE", "BRONZE", "SILVER", "GOLD"];

/**
 * Get the staking tier based on staked amount (whole tokens)
 */
export function getStakingLevel(stakedAmount: number | bigint): StakingLevel {
    const amount = typeof stakedAmount === "bigint"
        ? Number(stakedAmount / BigInt(10 ** TOKEN_DECIMALS))
        : stakedAmount;
    return getLevel(amount);
}

/**
 * Format token amount for display
 */
export function formatTokenAmount(amount: number | bigint, decimals: number = 9): string {
    const tokens = typeof amount === "bigint"
        ? Number(amount / BigInt(10 ** decimals))
        : amount;
    return tokens.toLocaleString();
}

/**
 * Compatibility helper for chat route
 */
export function isPremiumModel(model: string): boolean {
    return getModelRequiredStakingLevel(model) !== null;
}

/**
 * Get the required amount for a specific tier
 */
export function getTierThreshold(tier: StakingLevel): number {
    return TIERS[tier].threshold;
}

/**
 * Get the next tier above the current one
 */
export function getNextTier(currentLevel: StakingLevel): StakingLevel | null {
    const currentIndex = TIER_ORDER.indexOf(currentLevel);
    if (currentIndex === -1 || currentIndex === TIER_ORDER.length - 1) return null;
    return TIER_ORDER[currentIndex + 1];
}

/**
 * Calculate progress to next tier (0-100)
 */
export function getTierProgress(stakedAmount: number): number {
    const currentLevel = getStakingLevel(stakedAmount);
    const currentThreshold = TIERS[currentLevel].threshold;

    if (currentLevel === "GOLD") return 100;

    const nextTier = getNextTier(currentLevel);
    if (!nextTier) return 100;

    const nextThreshold = TIERS[nextTier].threshold;
    const range = nextThreshold - currentThreshold;

    if (range <= 0) return 100;

    const progress = stakedAmount - currentThreshold;
    const percentage = (progress / range) * 100;

    return Math.min(100, Math.max(0, Math.round(percentage)));
}

/**
 * Get amount needed to reach next tier
 */
export function getAmountToNextTier(stakedAmount: number): number {
    const currentLevel = getStakingLevel(stakedAmount);
    const nextTier = getNextTier(currentLevel);

    if (!nextTier) return 0;

    const nextThreshold = TIERS[nextTier].threshold;
    const needed = nextThreshold - stakedAmount;

    return needed > 0 ? needed : 0;
}

/**
 * Check if a user can access a premium model based on their staking level
 */
export function canAccessPremiumModel(stakingLevel: StakingLevel, requiredLevel: StakingLevel): boolean {
    const userTierIndex = TIER_ORDER.indexOf(stakingLevel);
    const requiredTierIndex = TIER_ORDER.indexOf(requiredLevel);

    return userTierIndex >= requiredTierIndex;
}

/**
 * Premium models that require staking.
 * Note: These are baseline requirements. 
 * The new tokenomics also handles per-call costs.
 */
export const PREMIUM_MODELS: Record<string, StakingLevel> = {
    // OpenAI o1 models
    "o1": "SILVER",
    "o1-mini": "SILVER",
    "o1-preview": "SILVER",
    // Anthropic Claude 3.5 Sonnet
    "anthropic/claude-3.5-sonnet": "SILVER",
    "claude-3.5-sonnet": "SILVER",
    // Gold tier exclusive models
    "o1-pro": "GOLD",
    "claude-3-opus": "GOLD",
};

/**
 * Get the required staking level for a model
 */
export function getModelRequiredStakingLevel(model: string): StakingLevel | null {
    // Check exact matches
    if (model in PREMIUM_MODELS) {
        return PREMIUM_MODELS[model];
    }

    // Check prefix matches
    for (const [modelPrefix, tier] of Object.entries(PREMIUM_MODELS)) {
        if (model.startsWith(modelPrefix)) {
            return tier;
        }
    }

    return null;
}

/**
 * Validate if user can use the requested model
 */
export function validateModelAccess(
    model: string,
    userStakingLevel: StakingLevel
): { allowed: boolean; reason?: string } {
    const requiredLevel = getModelRequiredStakingLevel(model);

    if (!requiredLevel) {
        return { allowed: true };
    }

    if (canAccessPremiumModel(userStakingLevel, requiredLevel)) {
        return { allowed: true };
    }

    const labels: Record<StakingLevel, string> = {
        NONE: "Free Tier",
        BRONZE: "Bronze (1K $RANDI)",
        SILVER: "Silver (10K $RANDI)",
        GOLD: "Gold (100K $RANDI)",
    };

    return {
        allowed: false,
        reason: `This model requires ${labels[requiredLevel]} staking. Your current tier is ${labels[userStakingLevel]}.`,
    };
}
