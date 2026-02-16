"use client";

import { useState } from "react";
import { useSPLTransfer } from "@/hooks/useSPLTransfer";

interface CreditPackage {
  code: string;
  name: string;
  credits: number;
  tokenAmountDisplay: string;
}

interface PurchaseFormProps {
  packages: CreditPackage[];
  onPurchaseInit: (packageCode: string) => Promise<{
    intentId: string;
    expectedAmount: string;
    mint: string;
    treasury: string;
    expiresAt: string;
  }>;
  onVerify: (intentId: string, txSig: string) => Promise<void>;
}

export function PurchaseForm({ packages, onPurchaseInit, onVerify }: PurchaseFormProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "signing" | "verifying" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const { transfer, sending } = useSPLTransfer();

  const handlePurchase = async () => {
    if (!selected) return;
    setStatus("signing");
    setError(null);

    try {
      const intent = await onPurchaseInit(selected);

      const txSignature = await transfer({
        mint: intent.mint,
        recipient: intent.treasury,
        amount: intent.expectedAmount,
        decimals: Number(process.env.NEXT_PUBLIC_TOKEN_DECIMALS || 9),
        memo: intent.intentId,
      });

      setStatus("verifying");
      await onVerify(intent.intentId, txSignature);
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
            key={pkg.code}
            onClick={() => setSelected(pkg.code)}
            className={`w-full text-left p-4 rounded-lg border transition-colors ${
              selected === pkg.code ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{pkg.name}</p>
                <p className="text-sm text-muted-foreground">{pkg.credits.toLocaleString()} credits</p>
              </div>
              <span className="text-sm font-medium">{pkg.tokenAmountDisplay} tokens</span>
            </div>
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      {status === "done" && <p className="text-sm text-success mb-4">Purchase complete!</p>}

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
