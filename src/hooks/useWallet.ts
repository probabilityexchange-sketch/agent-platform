"use client";

import { useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useConnectedStandardWallets } from "@privy-io/react-auth/solana";

export function useWallet() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets, ready: walletsReady } = useConnectedStandardWallets();
  const primaryWallet = useMemo(() => wallets[0], [wallets]);

  return {
    connected: authenticated && Boolean(primaryWallet),
    connecting: !ready || !walletsReady,
    disconnect: () => primaryWallet?.disconnect?.(),
    wallets,
    user,
    loading: !ready || !walletsReady,
    signIn: () => login(),
    signOut: async () => {
      await logout();
      await fetch("/api/auth/logout", { method: "POST" });
    },
    walletAddress: primaryWallet?.address || null,
  };
}
