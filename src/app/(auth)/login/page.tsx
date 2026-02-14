"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { RandiLogo } from "@/components/branding/RandiLogo";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const { user, signIn, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50">
      <Header />
      <main className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="mb-8 flex justify-center">
          <RandiLogo size="xl" variant="icon-only" />
        </div>
        <h1 className="text-3xl font-bold mb-4">
          Sign In to <span className="text-primary">Randi</span>
        </h1>
        <p className="text-muted-foreground mb-8">
          Sign in or create an account with just a few clicks.
          Use your social accounts or connect any wallet.
        </p>
        <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center gap-4">
          <button
            onClick={() => signIn()}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            {loading ? "Loading..." : "Get Started"}
          </button>
          <p className="text-xs text-muted-foreground">
            Powered by Privy
          </p>
        </div>
      </main>
    </div>
  );
}
