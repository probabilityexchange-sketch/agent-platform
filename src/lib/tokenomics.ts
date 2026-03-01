/**
 * $RANDI Tokenomics Configuration
 * Single source of truth for all pricing, burn rates, and staking tiers.
 *
 * Design Principles:
 * - No USD abstraction, no "credits" middle layer
 * - Users pay in $RANDI, tokens burn on use — one number, one action
 * - Staking gives discounts (not unlimited bypass) to keep burns flowing
 * - Every agent call = visible supply reduction
 *
 * Current baseline (update if market moves significantly):
 *   Supply: 1,000,000,000 $RANDI
 *   Price:  ~$0.00001 per token ($1 ≈ 100,000 $RANDI)
 *   MCap:   ~$10,000
 */

// ─── Token Config ────────────────────────────────────────────────────────────

export const TOKEN_MINT = process.env.NEXT_PUBLIC_TOKEN_MINT
    || process.env.TOKEN_MINT
    || "FYAz1bPKJUFRwT4pzhUzdN3UqCN5ppXRL2pfto4zpump";

export const TOKEN_DECIMALS = 6;
export const TOTAL_SUPPLY = 1_000_000_000; // 1B $RANDI

// ─── Burn Schedule ──────────────────────────────────────────────────────────

export const BURN_SCHEDULE = {
    PHASE_1_IGNITION: {
        label: "Ignition",
        burnBps: 7_000,
        treasuryBps: 3_000,
        trigger: "Launch -> 100 active users",
    },
    PHASE_2_GROWTH: {
        label: "Growth",
        burnBps: 5_000,
        treasuryBps: 5_000,
        trigger: "100+ active users OR >$500 monthly API cost",
    },
    PHASE_3_SCALE: {
        label: "Scale",
        burnBps: 4_000,
        treasuryBps: 6_000,
        trigger: "1,000+ active users OR >$5,000 monthly API cost",
    },
    PHASE_4_STEADY: {
        label: "Steady State",
        burnBps: 3_000,
        treasuryBps: 7_000,
        trigger: "10,000+ active users OR full autonomous scale",
    },
} as const;

// ─── Current Burn Config ─────────────────────────────────────────────────────

/** Current Phase (update here when milestones are hit) */
export const CURRENT_PHASE = "PHASE_1_IGNITION";

/** Basis points burned from every usage payment. 7000 = 70%. */
export const BURN_BPS = BURN_SCHEDULE[CURRENT_PHASE].burnBps;

/** Remaining goes to treasury for API costs + operations. 3000 = 30%. */
export const TREASURY_BPS = 10_000 - BURN_BPS;

// ─── Agent Pricing (in $RANDI tokens, NOT raw lamports) ──────────────────────
//
// These are human-readable token amounts. Multiply by 10^9 for on-chain values.
//
// Model tier mapping:
//   STANDARD  → Free/open-source models (Llama, Kilocode free tier, Gemma, etc.)
//   PREMIUM   → GPT-4o, Claude 3.5 Sonnet, Mistral Large
//   ULTRA     → o1, o1-mini, o1-pro, Claude Opus
//
// At current price (~$0.00001/token):
//   STANDARD  = 5,000 RANDI  ≈ $0.05 per call
//   PREMIUM   = 25,000 RANDI ≈ $0.25 per call
//   ULTRA     = 50,000 RANDI ≈ $0.50 per call

export const AGENT_PRICING = {
    STANDARD: 5_000,
    PREMIUM: 30_000,
    ULTRA: 150_000,
} as const;

export type AgentTier = keyof typeof AGENT_PRICING;

// ─── Model → Tier Mapping ────────────────────────────────────────────────────

export const MODEL_TIERS: Record<string, AgentTier> = {
    // Standard tier: free/open-source models (your cost ≈ $0)
    "llama-3-70b": "STANDARD",
    "llama-3.1-8b": "STANDARD",
    "llama-3.1-70b": "STANDARD",
    "llama-3.2-90b": "STANDARD",
    "gemma-2-9b": "STANDARD",
    "mistral-7b": "STANDARD",
    "deepseek-v3": "STANDARD",
    "qwen-2.5-72b": "STANDARD",
    // Add Kilocode free models here as you discover them

    // Premium tier: paid API models (your cost ≈ $0.01-0.05/call)
    "gpt-4o": "PREMIUM",
    "gpt-4o-mini": "PREMIUM",
    "gpt-4-turbo": "PREMIUM",
    "claude-3.5-sonnet": "PREMIUM",
    "claude-3-haiku": "PREMIUM",
    "anthropic/claude-3.5-sonnet": "PREMIUM",
    "mistral-large": "PREMIUM",

    // Ultra tier: expensive reasoning models (your cost ≈ $0.05-0.50/call)
    "o1": "ULTRA",
    "o1-mini": "ULTRA",
    "o1-preview": "ULTRA",
    "o1-pro": "ULTRA",
    "claude-3-opus": "ULTRA",
    "anthropic/claude-3-opus": "ULTRA",
};

/**
 * Get the pricing tier for a model. Defaults to STANDARD if unknown,
 * so new free models you add don't need explicit mapping.
 */
export function getModelTier(model: string): AgentTier {
    // Check exact match
    if (model in MODEL_TIERS) return MODEL_TIERS[model];

    // Check prefix matches (e.g., "o1-" catches future o1 variants)
    for (const [prefix, tier] of Object.entries(MODEL_TIERS)) {
        if (model.startsWith(prefix)) return tier;
    }

    // Default: unknown models are STANDARD (most of your Kilocode free models)
    return "STANDARD";
}

/**
 * Get the $RANDI cost for a model, BEFORE staking discount.
 */
export function getModelCost(model: string): number {
    const tier = getModelTier(model);
    return AGENT_PRICING[tier];
}

// ─── Staking Tiers & Discounts ───────────────────────────────────────────────
//
// Staking locks tokens (bullish for price) while giving users a reason
// to hold beyond speculation. Discounts keep the burn flywheel spinning
// instead of an unlimited subscription that kills deflation.

export const STAKING_TIERS = {
    NONE: { threshold: 0, discountBps: 0, label: "Free Tier" },
    BRONZE: { threshold: 1_000, discountBps: 1500, label: "Bronze (1K $RANDI)" },
    SILVER: { threshold: 10_000, discountBps: 3000, label: "Silver (10K $RANDI)" },
    GOLD: { threshold: 100_000, discountBps: 5000, label: "Gold (100K $RANDI)" },
} as const;

export type StakingLevel = keyof typeof STAKING_TIERS;

/**
 * Determine staking level from staked token amount (human-readable, not lamports).
 */
export function getStakingLevel(stakedTokens: number): StakingLevel {
    if (stakedTokens >= STAKING_TIERS.GOLD.threshold) return "GOLD";
    if (stakedTokens >= STAKING_TIERS.SILVER.threshold) return "SILVER";
    if (stakedTokens >= STAKING_TIERS.BRONZE.threshold) return "BRONZE";
    return "NONE";
}

/**
 * Apply staking discount to a base cost.
 * Returns the discounted cost in $RANDI tokens.
 */
export function applyStakingDiscount(baseCost: number, level: StakingLevel): number {
    const { discountBps } = STAKING_TIERS[level];
    const discount = Math.floor((baseCost * discountBps) / 10_000);
    return baseCost - discount;
}

/**
 * Get the full cost breakdown for an agent call.
 * This is the primary function the UI and deduction logic should use.
 */
export function getCallCost(model: string, stakingLevel: StakingLevel = "NONE") {
    const tier = getModelTier(model);
    const baseCost = AGENT_PRICING[tier];
    const finalCost = applyStakingDiscount(baseCost, stakingLevel);
    const burnAmount = Math.floor((finalCost * BURN_BPS) / 10_000);
    const treasuryAmount = finalCost - burnAmount;

    return {
        tier,
        baseCost,
        discount: baseCost - finalCost,
        finalCost,
        burnAmount,
        treasuryAmount,
    };
}

// ─── Credit Packs & Subscriptions (Kilocode Style) ─────────────────────────
//
// Users buy $RANDI on decentralized exchanges and deposit them, OR pay via fiat/Stripe.
// 1 deposited $RANDI = 1 Randi Credit.

export interface CreditPack {
    id: string;
    name: string;
    creditAmount: number;
    bonusPercent: number;
    /** Approximate call counts at STANDARD tier, no staking discount */
    estimatedStandardCalls: number;
    estimatedPremiumCalls: number;
    type?: "payg" | "subscription";
}

export function getCreditPacks(): CreditPack[] {
    return [
        {
            id: "starter",
            name: "Starter Credits",
            creditAmount: 100_000,      // ~$1 at current price
            bonusPercent: 0,
            estimatedStandardCalls: Math.floor(100_000 / AGENT_PRICING.STANDARD),
            estimatedPremiumCalls: Math.floor(100_000 / AGENT_PRICING.PREMIUM),
            type: "payg"
        },
        {
            id: "builder",
            name: "Builder Credits",
            creditAmount: 500_000,      // ~$5 at current price
            bonusPercent: 10,
            estimatedStandardCalls: Math.floor(550_000 / AGENT_PRICING.STANDARD),
            estimatedPremiumCalls: Math.floor(550_000 / AGENT_PRICING.PREMIUM),
            type: "payg"
        },
        {
            id: "degen",
            name: "Degen Credits",
            creditAmount: 2_000_000,    // ~$20 at current price
            bonusPercent: 25,
            estimatedStandardCalls: Math.floor(2_500_000 / AGENT_PRICING.STANDARD),
            estimatedPremiumCalls: Math.floor(2_500_000 / AGENT_PRICING.PREMIUM),
            type: "payg"
        },
        {
            id: "pro_monthly",
            name: "Randi Pro (Monthly)",
            creditAmount: 2_000_000,    // 2M credits granted every month
            bonusPercent: 0,
            estimatedStandardCalls: 400,
            estimatedPremiumCalls: 66,
            type: "subscription"
        }
    ];
}

// ─── Utility Helpers ─────────────────────────────────────────────────────────

/** Convert human-readable token amount to on-chain lamports (bigint) */
export function toLamports(tokens: number): bigint {
    return BigInt(tokens) * BigInt(10 ** TOKEN_DECIMALS);
}

/** Convert on-chain lamports to human-readable token amount */
export function fromLamports(lamports: bigint): number {
    return Number(lamports / BigInt(10 ** TOKEN_DECIMALS));
}

/** Format token amount for display: "5,000 $RANDI" */
export function formatRandi(tokens: number): string {
    return `${tokens.toLocaleString()} $RANDI`;
}
