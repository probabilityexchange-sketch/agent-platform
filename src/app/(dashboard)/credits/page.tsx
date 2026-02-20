"use client";

import { useCredits } from "@/hooks/useCredits";
import { PurchaseForm } from "@/components/credits/PurchaseForm";
import { useTokenPrice } from "@/hooks/useTokenPrice";

export default function CreditsPage() {
  const { subscription, isSubscribed, transactions, loading, error }
    = useCredits();
  const { priceUsd } = useTokenPrice();

  if (loading) {
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
            <span className="ml-1 text-xs">
              • RANDI: ${priceUsd.toFixed(8)}
            </span>
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
