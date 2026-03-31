"use client";

import { useEffect, useMemo, useState } from "react";
import { RandiLogo } from "@/components/branding/RandiLogo";
import { useCredits } from "@/hooks/useCredits";
import { useSPLTransfer } from "@/hooks/useSPLTransfer";
import { LiveUsagePackage, UsagePackageCode } from "@/lib/credits/usage-packages";

type Step = 'plan' | 'paying' | 'verifying' | 'done' | 'error';

const RECOMMENDED_PLAN: UsagePackageCode = "builder";

const PLAN_HIGHLIGHTS: Record<UsagePackageCode, string[]> = {
  starter: [
    "Good for quick experiments",
    "Use the agent when you need one clean answer",
    "A simple entry point for first-time users",
  ],
  builder: [
    "Best for daily agent work",
    "Enough room for research, drafting, and follow-up",
    "The middle tier is the sweet spot",
  ],
  scale: [
    "Best value for heavy usage",
    "Built for repeated workflows and larger runs",
    "Use this when the agent is becoming part of your process",
  ],
};

const HERO_BADGES = [
  "3 fixed USD tiers",
  "Live RANDI quote",
  "70% burn",
  "30% treasury",
];

export function PurchaseForm() {
  const { purchasePackage, verifyPurchase } = useCredits();
  const { transfer, sending: walletBusy } = useSPLTransfer();

  const [step, setStep] = useState<Step>('plan');
  const [error, setError] = useState<string | null>(null);
  const [availablePackages, setAvailablePackages] = useState<LiveUsagePackage[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<UsagePackageCode>(RECOMMENDED_PLAN);
  const [loadingPackages, setLoadingPackages] = useState(true);

  useEffect(() => {
    async function fetchPackages() {
      try {
        const res = await fetch('/api/credits/packages');
        const data = await res.json();
        const packages = (data.packages || []) as LiveUsagePackage[];
        setAvailablePackages(packages);

        setSelectedItemId((current) =>
          packages.some(pkg => pkg.id === current) ? current : packages[0]?.id || current
        );
      } catch (err) {
        console.error('Failed to fetch packages:', err);
      } finally {
        setLoadingPackages(false);
      }
    }
    fetchPackages();
  }, []);

  const selectedItem = useMemo(
    () => availablePackages.find((p) => p.id === selectedItemId),
    [availablePackages, selectedItemId]
  );

  const handlePurchase = async () => {
    if (!selectedItem) return;

    try {
      setError(null);
      setStep('paying');

      const intent = await purchasePackage(selectedItemId);

      const txSignature = await transfer({
        recipient: intent.treasury,
        mint: intent.mint,
        amount: intent.expectedAmount,
        memo: intent.intentId,
        decimals: Number(process.env.NEXT_PUBLIC_TOKEN_DECIMALS ?? 9),
      });

      setStep('verifying');
      await verifyPurchase(intent.intentId, txSignature);
      setStep('done');
    } catch (err) {
      console.error('Purchase error:', err);
      setError(err instanceof Error ? err.message : 'Purchase failed');
      setStep('error');
    }
  };

  if (step === "done") {
    return (
      <div className="bg-card border border-success/30 rounded-[2rem] p-8 text-center shadow-2xl shadow-black/10">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-success"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-2">Plan chosen</h3>
        <p className="text-muted-foreground">
          Your credits are on the way. The agent can start working as soon as the wallet confirms.
        </p>
        <button
          onClick={() => setStep('plan')}
          className="mt-6 text-sm text-primary hover:underline"
        >
          Choose another tier
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card px-6 py-8 shadow-2xl shadow-black/10 lg:px-8 lg:py-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-success/5" />
        <div className="relative">
          <div className="inline-flex items-center rounded-full border border-border bg-background/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
            Pick a plan
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
            Choose the tier that matches how hard your agent works.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Three fixed USD plans, converted to live $RANDI at checkout. Same simple promise as the
            Helena-style chooser, just for agent usage.
          </p>

          <div className="relative mt-10 flex min-h-[320px] items-center justify-center">
            <div className="absolute inset-0 mx-auto h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute left-8 top-8 rounded-full border border-border bg-background/80 px-4 py-2 text-xs font-semibold shadow-lg">
              Run research
            </div>
            <div className="absolute right-10 top-16 rounded-full border border-border bg-background/80 px-4 py-2 text-xs font-semibold shadow-lg">
              Draft replies
            </div>
            <div className="absolute left-12 bottom-16 rounded-full border border-border bg-background/80 px-4 py-2 text-xs font-semibold shadow-lg">
              Analyze channels
            </div>
            <div className="absolute right-8 bottom-10 rounded-full border border-border bg-background/80 px-4 py-2 text-xs font-semibold shadow-lg">
              Act on tools
            </div>

            <div className="relative flex flex-col items-center gap-3">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-background shadow-[0_0_0_14px_rgba(255,255,255,0.03),0_20px_60px_rgba(0,0,0,0.18)]">
                <RandiLogo size="md" variant="icon-only" animated />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold tracking-wide text-foreground">Randi agent</p>
                <p className="text-xs text-muted-foreground">Pick a plan, pay in $RANDI, start moving.</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {HERO_BADGES.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-border bg-background/80 px-3 py-1 text-[11px] font-semibold text-muted-foreground shadow-sm"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-border bg-card p-5 shadow-2xl shadow-black/10 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-2xl font-black tracking-tight">Choose your plan</h3>
            <p className="text-sm text-muted-foreground">Three tiers. Same agent. Clear value.</p>
          </div>
          <div className="rounded-full border border-border bg-background px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            Live pricing
          </div>
        </div>

        {loadingPackages ? (
          <div className="py-14 text-center text-muted-foreground animate-pulse">
            Loading plans...
          </div>
        ) : (
          <div className="grid gap-3">
            {availablePackages.map((pkg) => {
              const isRecommended = pkg.id === RECOMMENDED_PLAN;
              const isSelected = selectedItemId === pkg.id;
              const highlight = isRecommended || isSelected;
              const features = PLAN_HIGHLIGHTS[pkg.id];

              return (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedItemId(pkg.id)}
                  className={`w-full rounded-3xl border p-4 text-left transition-all sm:p-5 ${
                    highlight
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30 shadow-[0_10px_30px_rgba(20,131,243,0.08)]"
                      : "border-border bg-background/40 hover:border-border/80 hover:bg-background/70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-bold">{pkg.name}</h4>
                        {isRecommended && (
                          <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {pkg.estimatedStandardCalls.toLocaleString()} standard or{" "}
                        {pkg.estimatedPremiumCalls.toLocaleString()} premium calls
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-primary">${pkg.usdPrice}</div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        USD tier
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-foreground/85 sm:grid-cols-3">
                    {features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2 rounded-2xl bg-background/60 px-3 py-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                        <span className="leading-5">{feature}</span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {selectedItem && (
          <div className="mt-4 rounded-3xl border border-border bg-background/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Selected plan
                </p>
                <p className="mt-1 font-semibold text-foreground">{selectedItem.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">{selectedItem.creditAmount.toLocaleString()} credits</p>
                <p className="text-xs text-muted-foreground">Live $RANDI quote at checkout</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-2xl border border-border bg-card px-3 py-2">
                <p className="text-muted-foreground">Standard calls</p>
                <p className="mt-1 text-base font-black">{selectedItem.estimatedStandardCalls.toLocaleString()}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card px-3 py-2">
                <p className="text-muted-foreground">Premium calls</p>
                <p className="mt-1 text-base font-black">{selectedItem.estimatedPremiumCalls.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 rounded-3xl border border-border bg-muted/20 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-orange-400" />
            Burn flow
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            70% of every purchase is burned. 30% goes to treasury so the agent can keep paying for work.
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          <button
            onClick={handlePurchase}
            disabled={step === 'paying' || step === 'verifying' || walletBusy || !selectedItem}
            className="w-full rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {step === 'paying'
              ? 'Confirm in wallet...'
              : step === 'verifying'
                ? 'Verifying on-chain...'
                : selectedItem
                  ? `Continue with ${selectedItem.name}`
                  : 'Choose a tier'}
          </button>
        </div>
      </div>
    </div>
  );
}
