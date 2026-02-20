"use client";

import { useState } from "react";
import { useCredits } from "@/hooks/useCredits";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { useSPLTransfer } from "@/hooks/useSPLTransfer";

type Step = "plan" | "paying" | "verifying" | "done" | "error";

export function PurchaseForm() {
  const { initiateSubscription, verifyPurchase, isSubscribed, subscription } = useCredits();
  const { priceUsd, usdToRandi, formatRandi, loading: priceLoading } = useTokenPrice();
  const { transfer, sending: walletBusy } = useSPLTransfer();
  const [step, setStep] = useState<Step>("plan");
  const [error, setError] = useState<string | null>(null);

  const randiAmount = usdToRandi(20);
  const burnAmount = randiAmount ? randiAmount * 0.1 : null;
  const treasuryAmount = randiAmount ? randiAmount * 0.9 : null;

  const handleSubscribe = async () => {
    try {
      setError(null);
      setStep("paying");

      const intent = await initiateSubscription();

      const txSignature = await transfer({
        recipient: intent.treasuryWallet,
        mint: intent.tokenMint,
        amount: intent.tokenAmount,
        burnAmount: intent.burnAmount,
        burnRecipient: intent.burnWallet,
        memo: intent.memo,
        decimals: intent.decimals,
        paymentAsset: intent.paymentAsset,
      });

      setStep("verifying");

      await verifyPurchase(txSignature, intent.memo, intent.transactionId);
      setStep("done");
    } catch (err) {
      console.error("Subscription error:", err);
      setError(err instanceof Error ? err.message : "Subscription failed");
      setStep("error");
    }
  };

  if (isSubscribed) {
    const expiresDate = subscription.expiresAt
      ? new Date(subscription.expiresAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
      : "Unknown";

    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-lg">Randi Pro — Active</h3>
            <p className="text-xs text-muted-foreground">Renews {expiresDate}</p>
          </div>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>✓ Unlimited AI agent chats</p>
          <p>✓ All tool integrations</p>
          <p>✓ 1000+ Composio tools</p>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="bg-card border border-success/30 rounded-xl p-6 text-center">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-2">Subscription Active!</h3>
        <p className="text-muted-foreground">You now have full access to all Randi agents and tools for 30 days.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Plan Card */}
      <div className="p-6">
        <div className="flex items-baseline justify-between mb-1">
          <h3 className="text-xl font-bold">Randi Pro</h3>
          <div className="text-right">
            <span className="text-3xl font-bold">$20</span>
            <span className="text-muted-foreground text-sm">/month</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          Paid in RANDI tokens
          {priceUsd && (
            <span className="ml-1">
              (1 RANDI ≈ ${priceUsd.toFixed(8)})
            </span>
          )}
        </p>

        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Unlimited AI agent chats</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>All tool integrations</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Priority access to new agents</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>1000+ Composio tool integrations</span>
          </div>
        </div>

        {/* Token Breakdown */}
        {randiAmount !== null && (
          <div className="rounded-lg bg-muted/50 border border-border p-3 mb-4 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total RANDI</span>
              <span className="font-mono">{formatRandi(randiAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">To Treasury (90%)</span>
              <span className="font-mono">{formatRandi(treasuryAmount)}</span>
            </div>
            <div className="flex justify-between text-orange-400">
              <span>Burned 🔥 (10%)</span>
              <span className="font-mono">{formatRandi(burnAmount)}</span>
            </div>
          </div>
        )}

        {priceLoading && (
          <div className="rounded-lg bg-muted/50 border border-border p-3 mb-4 text-xs text-center text-muted-foreground">
            Loading RANDI price...
          </div>
        )}
      </div>

      {/* Action */}
      <div className="p-4 border-t border-border bg-background/30">
        {error && (
          <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          onClick={handleSubscribe}
          disabled={step === "paying" || step === "verifying" || walletBusy}
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {step === "paying"
            ? "Confirm in wallet..."
            : step === "verifying"
              ? "Verifying on-chain..."
              : step === "error"
                ? "Try Again"
                : "Subscribe — $20/month"}
        </button>

        {walletBusy && step === "plan" && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Connect a wallet to subscribe
          </p>
        )}
      </div>
    </div>
  );
}
