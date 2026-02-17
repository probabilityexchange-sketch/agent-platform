"use client";

import { useState } from "react";
import { useSPLTransfer } from "@/hooks/useSPLTransfer";

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  usdAmount: string;
}

interface PurchaseFormProps {
  packages: CreditPackage[];
  onPurchaseInit: (packageId: string) => Promise<{
    tokenMint: string;
    treasuryWallet: string;
    tokenAmount: string;
    memo: string;
    decimals: number;
    burnAmount?: string;
    quote?: {
      packageUsd: string;
      tokenUsdPrice: string;
      tokenAmountDisplay: string;
      source: string;
      burnBps: number;
    };
  }>;
  onVerify: (txSignature: string, memo: string) => Promise<void>;
}

export function PurchaseForm({
  packages,
  onPurchaseInit,
  onVerify,
}: PurchaseFormProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "signing" | "verifying" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const { transfer, sending } = useSPLTransfer();

  const handlePurchase = async () => {
    if (!selected) return;
    setStatus("signing");
    setError(null);

    try {
      // 1. Init purchase on server
      const purchaseData = await onPurchaseInit(selected);

      // 2. Send SPL transfer
      const txSignature = await transfer({
        mint: purchaseData.tokenMint,
        recipient: purchaseData.treasuryWallet,
        amount: purchaseData.tokenAmount,
        decimals: purchaseData.decimals,
        memo: purchaseData.memo,
        burnAmount: purchaseData.burnAmount,
      });

      // 3. Verify on server
      setStatus("verifying");
      await onVerify(txSignature, purchaseData.memo);
      setStatus("done");

      setTimeout(() => {
        setStatus("idle");
        setSelected(null);
      }, 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Purchase failed");
      setStatus("error");
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">Buy Credits</h3>

      <div className="space-y-3 mb-6">
        {packages.map((pkg) => (
          <button
            key={pkg.id}
            onClick={() => setSelected(pkg.id)}
            className={`w-full text-left p-4 rounded-lg border transition-colors ${
              selected === pkg.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground"
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{pkg.name}</p>
                <p className="text-sm text-muted-foreground">
                  {pkg.credits.toLocaleString()} credits
                </p>
              </div>
              <span className="text-sm font-medium">
                ${pkg.usdAmount}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Token amount is quoted at checkout.
            </p>
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-destructive mb-4">{error}</p>
      )}

      {status === "done" && (
        <p className="text-sm text-success mb-4">Purchase complete!</p>
      )}

      <button
        onClick={handlePurchase}
        disabled={!selected || status === "signing" || status === "verifying" || sending}
        className="w-full px-4 py-3 bg-primary hover:bg-accent text-primary-foreground rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "signing"
          ? "Confirm in wallet..."
          : status === "verifying"
          ? "Verifying transaction..."
          : "Purchase Credits"}
      </button>
    </div>
  );
}
