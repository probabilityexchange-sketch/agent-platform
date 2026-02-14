"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { RandiLogo } from "@/components/branding/RandiLogo";
import { useAuth } from "@/contexts/WalletContext";

export default function LoginPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50">
      <Header />
      <main className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="mb-8 flex justify-center">
          <RandiLogo size="xl" variant="icon-only" />
        </div>
        <h1 className="text-3xl font-bold mb-4">
          Sign In to <span className="text-primary">Randi</span>
        </h1>
        <p className="text-muted-foreground mb-8">
          Connect your Phantom wallet and sign a message to authenticate.
          No passwords, no email. Just your wallet.
        </p>
        <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center gap-4">
          <ConnectButton />
          <p className="text-xs text-muted-foreground">
            You&apos;ll be asked to sign a message to prove wallet ownership.
            This does not cost any SOL.
          </p>
        </div>
      </main>
    </div>
  );
}
