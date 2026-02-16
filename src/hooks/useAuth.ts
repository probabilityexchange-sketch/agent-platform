"use client";

import { useEffect, useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useConnectedStandardWallets } from "@privy-io/react-auth/solana";

export function useAuth() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useConnectedStandardWallets();

  const primaryWallet = useMemo(() => wallets[0], [wallets]);

  const syncSession = async () => {
    if (!user) return;
    const linkedSolana = user.linkedAccounts?.find(
      (account) => account.type === "wallet" && (account as any).chainType === "solana",
    );
    const walletAddress = (linkedSolana as any)?.address || primaryWallet?.address;

    if (!walletAddress) return;

    await fetch("/api/auth/dev-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet: walletAddress }),
    });
  };

  useEffect(() => {
    if (ready && authenticated) {
      syncSession().catch((error) => {
        console.error("Failed to sync session", error);
      });
    }
  }, [ready, authenticated, user, primaryWallet]);

  return {
    user: user
      ? {
          id: user.id,
          walletAddress:
            user.wallet?.address ||
            primaryWallet?.address ||
            (user.linkedAccounts?.find(
              (account) => account.type === "wallet" && (account as any).chainType === "solana",
            ) as any)?.address,
        }
      : null,
    loading: !ready,
    isAuthenticated: authenticated,
    signIn: () => login(),
    signOut: async () => {
      await logout();
      await fetch("/api/auth/logout", { method: "POST" });
    },
  };
}
