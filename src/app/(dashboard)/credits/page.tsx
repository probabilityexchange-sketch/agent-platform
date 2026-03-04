"use client";

import { useCredits } from "@/hooks/useCredits";
import { PurchaseForm } from "@/components/credits/PurchaseForm";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { useStaking } from "@/hooks/useStaking";

export default function CreditsPage() {
  const { subscription, isSubscribed, transactions, loading, error }
    = useCredits();
  const { priceUsd } = useTokenPrice();
  const { staking, loading: stakingLoading, verifying, verifyStaking, hasStaking, error: stakingError } = useStaking();

  if (loading || stakingLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Subscription</h1>
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Subscription</h1>
        <p className="text-muted-foreground mt-1">
          Subscribe to Randi Pro for unlimited access
          {priceUsd && (
            <a
              href="https://pump.fun/coin/FYAz1bPKJUFRwT4pzhUzdN3UqCN5ppXRL2pfto4zpump"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 text-xs hover:text-primary transition-colors hover:underline underline-offset-4"
            >
              • RANDI: ${priceUsd.toFixed(8)}
            </a>
          )}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Subscription Status */}
      {isSubscribed && subscription.expiresAt && (
        <div className="bg-card border border-success/30 rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-success">Active Subscription</p>
            <p className="text-sm text-muted-foreground">
              Expires {new Date(subscription.expiresAt).toLocaleDateString("en-US", {
                month: "long", day: "numeric", year: "numeric",
              })}
            </p>
          </div>
        </div>
      )}

      {/* Staking Status */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Staking</h2>
          <button
            onClick={verifyStaking}
            disabled={verifying || !staking?.walletAddress}
            className="text-xs px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {verifying ? "Verifying..." : "Verify Holdings"}
          </button>
        </div>

        {stakingError && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300 mb-3">
            {stakingError}
          </div>
        )}

        {staking?.walletAddress ? (
          <div className="space-y-4">
            {/* Current Tier */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${staking.stakingLevel === "GOLD" ? "bg-yellow-500/20 text-yellow-400" :
                  staking.stakingLevel === "SILVER" ? "bg-gray-300/20 text-gray-300" :
                    staking.stakingLevel === "BRONZE" ? "bg-amber-700/20 text-amber-600" :
                      "bg-muted text-muted-foreground"
                  }`}>
                  {staking.stakingLevel === "NONE" ? "-" : staking.stakingLevel.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{staking.stakingLevel} Tier</p>
                  <p className="text-sm text-muted-foreground">
                    {staking.stakedAmountFormatted} $RANDI staked
                  </p>
                </div>
              </div>
              {hasStaking && (
                <span className="text-xs px-2 py-1 bg-success/10 text-success rounded-full">
                  Active
                </span>
              )}
            </div>

            {/* Progress Bar */}
            {staking.nextTier && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress to {staking.nextTier.level}</span>
                  <span>{staking.tierProgress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                    style={{ width: `${staking.tierProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Need {staking.nextTier.amountNeededFormatted} more $RANDI to reach {staking.nextTier.level}
                </p>
              </div>
            )}

            {/* Tier Info */}
            <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-border">
              <div className={`p-2 rounded-lg ${staking.stakingLevel === "BRONZE" || staking.stakingLevel === "SILVER" || staking.stakingLevel === "GOLD" ? "bg-amber-700/10 ring-1 ring-amber-700/30" : "bg-muted/50"}`}>
                <p className="text-xs text-muted-foreground">Bronze</p>
                <p className="text-sm font-medium">1K Staked</p>
                <p className="text-[10px] text-success font-medium mt-1">+1K credits/day</p>
              </div>
              <div className={`p-2 rounded-lg ${staking.stakingLevel === "SILVER" || staking.stakingLevel === "GOLD" ? "bg-gray-300/10 ring-1 ring-gray-300/30" : "bg-muted/50"}`}>
                <p className="text-xs text-muted-foreground">Silver</p>
                <p className="text-sm font-medium">10K Staked</p>
                <p className="text-[10px] text-success font-medium mt-1">+15K credits/day</p>
              </div>
              <div className={`p-2 rounded-lg ${staking.stakingLevel === "GOLD" ? "bg-yellow-500/10 ring-1 ring-yellow-500/30" : "bg-muted/50"}`}>
                <p className="text-xs text-muted-foreground">Gold</p>
                <p className="text-sm font-medium">100K Staked</p>
                <p className="text-[10px] text-success font-medium mt-1">+200K credits/day</p>
              </div>
            </div>

            {/* Staking Benefits Info */}
            {staking.stakingLevel !== "NONE" && (
              <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg space-y-3 border border-border/50">
                <div>
                  <p className="font-medium text-foreground mb-1 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Daily Passive Yield:
                  </p>
                  <p className="text-success font-medium pl-5">
                    +{staking.stakingLevel === "GOLD" ? "200,000" : staking.stakingLevel === "SILVER" ? "15,000" : "1,000"} Credits / Day
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Premium Models Unlocked:
                  </p>
                  <div className="pl-5 space-y-0.5">
                    <p>• o1, o1-mini, Claude 3.5 Sonnet (Silver+)</p>
                    {staking.stakingLevel === "GOLD" && <p>• o1-pro (Gold exclusive)</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Stake More Button */}
            {staking.stakingLevel !== "GOLD" && (
              <a
                href="https://pump.fun/coin/FYAz1bPKJUFRwT4pzhUzdN3UqCN5ppXRL2pfto4zpump"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center text-sm py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
              >
                Stake More $RANDI
              </a>
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-4">
            <p className="text-sm">Connect your wallet to view staking status</p>
          </div>
        )}
      </div>

      {/* Purchase Form */}
      <PurchaseForm />

      {/* Transaction History */}
      {transactions.length > 0 && (
        <div className="bg-card border border-border rounded-xl">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold">Payment History</h2>
          </div>
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {transactions.map((tx) => (
              <div key={tx.id} className="px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{tx.description || tx.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.createdAt).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${tx.status === "CONFIRMED"
                    ? "bg-success/10 text-success"
                    : tx.status === "PENDING"
                      ? "bg-warning/10 text-warning"
                      : "bg-red-500/10 text-red-400"
                    }`}>
                    {tx.status}
                  </span>
                  {tx.txSignature && (
                    <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                      {tx.txSignature.slice(0, 8)}...
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
