"use client";

import { useWallet } from "@/hooks/useWallet";
import { formatAddress } from "@/lib/solana/validation";

export function ConnectButton() {
  const { connected, connecting, walletAddress, user, signIn, signOut } =
    useWallet();

  if (connecting) {
    return (
      <button
        disabled
        className="px-4 py-2 bg-muted rounded-lg text-muted-foreground"
      >
        Connecting...
      </button>
    );
  }

  if (!connected) {
    return (
      <button
        onClick={signIn}
        className="px-4 py-2 bg-primary hover:bg-accent text-primary-foreground rounded-lg font-medium transition-colors"
      >
        Sign In
      </button>
    );
  }

  if (connected && !user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {formatAddress(walletAddress || "")}
        </span>
        <button
          onClick={signIn}
          className="px-4 py-2 bg-primary hover:bg-accent text-primary-foreground rounded-lg font-medium transition-colors"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">
        {formatAddress(walletAddress || "")}
      </span>
      <button
        onClick={signOut}
        className="px-3 py-1.5 bg-muted hover:bg-border text-sm rounded-lg transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}
