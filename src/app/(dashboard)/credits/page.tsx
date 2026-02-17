"use client";

import { useCredits } from "@/hooks/useCredits";
import { CreditBalance } from "@/components/credits/CreditBalance";
import { PurchaseForm } from "@/components/credits/PurchaseForm";
import { TxHistory } from "@/components/credits/TxHistory";

interface PackageDisplay {
  id: string;
  name: string;
  credits: number;
  tokenAmountDisplay: string;
}

const PACKAGES: PackageDisplay[] = [
  {
    id: "small",
    name: "Starter",
    credits: Number(process.env.NEXT_PUBLIC_CREDITS_PACKAGE_SMALL_AMOUNT || 100),
    tokenAmountDisplay: "1",
  },
  {
    id: "medium",
    name: "Pro",
    credits: Number(process.env.NEXT_PUBLIC_CREDITS_PACKAGE_MEDIUM_AMOUNT || 500),
    tokenAmountDisplay: "4.5",
  },
  {
    id: "large",
    name: "Enterprise",
    credits: Number(process.env.NEXT_PUBLIC_CREDITS_PACKAGE_LARGE_AMOUNT || 1200),
    tokenAmountDisplay: "10",
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
