"use client";

import { useState, useEffect } from "react";
import { useCredits } from "@/hooks/useCredits";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { useSPLTransfer } from "@/hooks/useSPLTransfer";
import { CreditPack } from "@/lib/tokenomics";

type Step = "plan" | "paying" | "verifying" | "done" | "error";

export function PurchaseForm() {
  const { verifyPurchase, isSubscribed, subscription } = useCredits();
  const { priceUsd, formatRandi, loading: priceLoading } = useTokenPrice();
  const { transfer, sending: walletBusy } = useSPLTransfer();

  const [step, setStep] = useState<Step>("plan");
  const [error, setError] = useState<string | null>(null);
  const [availablePackages, setAvailablePackages] = useState<CreditPack[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("builder");
  const [loadingPackages, setLoadingPackages] = useState(true);

  useEffect(() => {
    async function fetchPackages() {
      try {
        const res = await fetch("/api/credits/packages");
        const data = await res.json();
        setAvailablePackages(data.packages || []);
      } catch (err) {
        console.error("Failed to fetch packages:", err);
      } finally {
        setLoadingPackages(false);
      }
    }
    fetchPackages();
  }, []);

  const selectedItem = availablePackages.find(p => p.id === selectedItemId);

  const tokenAmount = selectedItem ? selectedItem.creditAmount : 0;
  const bonusTokens = selectedItem ? Math.floor(tokenAmount * (selectedItem.bonusPercent / 100)) : 0;
  const totalTokens = tokenAmount + bonusTokens;
  const isSubscription = selectedItem?.type === "subscription";

  // Burn calculation (70% on use, but here we show protocol-wide burn for transparency)
  const estimatedBurn = Math.floor(totalTokens * 0.7);

  const handlePurchase = async () => {
    if (!selectedItem) return;

    try {
      setError(null);
      setStep("paying");

      const res = await fetch("/api/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: selectedItemId }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to initiate purchase");
      }

      const intent = await res.json();

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
      console.error("Purchase error:", err);
      setError(err instanceof Error ? err.message : "Purchase failed");
      setStep("error");
    }
  };

  if (step === "done") {
    return (
      <div className="bg-card border border-success/30 rounded-xl p-6 text-center">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-2">Deposit Successful!</h3>
        <p className="text-muted-foreground">Your $RANDI balance has been updated. Happy agenting!</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-6">
        <h3 className="text-xl font-bold mb-4">Deposit $RANDI</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Fund your account to use AI agents. 70% of every call is burned 🔥
        </p>

        {loadingPackages ? (
          <div className="py-8 text-center text-muted-foreground animate-pulse">
            Loading token packs...
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            <div className="grid grid-cols-1 gap-3">
              {availablePackages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedItemId(pkg.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${selectedItemId === pkg.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-muted/30 hover:bg-muted/50"
                    }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold">{pkg.name}</h4>
                        {pkg.bonusPercent > 0 && (
                          <span className="bg-success/20 text-success text-[10px] px-2 py-0.5 rounded-full font-bold">
                            +{pkg.bonusPercent}% BONUS
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ~{pkg.estimatedStandardCalls} Standard / ~{pkg.estimatedPremiumCalls} Premium calls
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">{pkg.creditAmount.toLocaleString()} Credits</div>
                      {priceUsd && !isSubscription && ( // Show price if pay-as-you-go, or $20 if subscription
                        <div className="text-[10px] text-muted-foreground text-opacity-60">
                          {pkg.type === "subscription" ? "$20.00 / mo" : `≈ $${(pkg.creditAmount * priceUsd).toFixed(2)}`}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Burn Transparency */}
        {selectedItem && (
          <div className="rounded-lg bg-orange-500/5 border border-orange-500/20 p-4 mb-6">
            <div className="flex items-center gap-2 mb-2 text-orange-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.5-7 3 3 3.5 1.354 3.5 5.5s-.354 3.5-5.5 3.5c0 2 2.5 2 2.5 2z" />
              </svg>
              <span className="text-xs font-bold uppercase tracking-wider">Burn Flywheel</span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">
              By depositing, you're fueling the $RANDI deflationary cycle. Using these tokens will burn approximately
              <span className="text-orange-400 font-bold mx-1">{estimatedBurn.toLocaleString()} $RANDI</span>
              permanently.
            </p>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
              <div className="bg-orange-500 h-full w-[70%]" />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
              <span>Usage Burn (70%)</span>
              <span>Treasury (30%)</span>
            </div>
          </div>
        )}
      </div>

      {/* Action */}
      <div className="p-4 border-t border-border bg-background/30">
        {error && (
          <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        <button
          onClick={handlePurchase}
          disabled={step === "paying" || step === "verifying" || walletBusy || !selectedItem}
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {step === "paying"
            ? "Confirm in wallet..."
            : step === "verifying"
              ? "Verifying on-chain..."
              : isSubscription ? `Subscribe for $20 (or equivalent $RANDI)` : `Deposit ${totalTokens.toLocaleString()} $RANDI`}
        </button>
      </div>
    </div>
  );
}
