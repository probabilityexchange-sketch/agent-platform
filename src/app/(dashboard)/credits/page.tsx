"use client";

import { useCredits } from "@/hooks/useCredits";
import { CreditBalance } from "@/components/credits/CreditBalance";
import { PurchaseForm } from "@/components/credits/PurchaseForm";
import { TxHistory } from "@/components/credits/TxHistory";

interface PackageDisplay {
  id: string;
  name: string;
  credits: number;
  usdAmount: string;
}

const PACKAGES: PackageDisplay[] = [
  {
    id: "small",
    name: "Starter",
    credits: Number(process.env.NEXT_PUBLIC_CREDITS_PACKAGE_SMALL_AMOUNT || 100),
    usdAmount: process.env.NEXT_PUBLIC_CREDITS_PACKAGE_SMALL_USD || "5",
  },
  {
    id: "medium",
    name: "Pro",
    credits: Number(process.env.NEXT_PUBLIC_CREDITS_PACKAGE_MEDIUM_AMOUNT || 500),
    usdAmount: process.env.NEXT_PUBLIC_CREDITS_PACKAGE_MEDIUM_USD || "20",
  },
  {
    id: "large",
    name: "Enterprise",
    credits: Number(process.env.NEXT_PUBLIC_CREDITS_PACKAGE_LARGE_AMOUNT || 1200),
    usdAmount: process.env.NEXT_PUBLIC_CREDITS_PACKAGE_LARGE_USD || "40",
  },
];

export default function CreditsPage() {
  const { balance, transactions, initiatePurchase, verifyPurchase } =
    useCredits();

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Credits</h1>

      <div className="space-y-6">
        <CreditBalance balance={balance} />

        <PurchaseForm
          packages={PACKAGES}
          onPurchaseInit={initiatePurchase}
          onVerify={verifyPurchase}
        />

        <TxHistory transactions={transactions} />
      </div>
    </div>
  );
}
