"use client";

import { ConnectButton } from "@/components/wallet/ConnectButton";
import { RandiLogo } from "@/components/branding/RandiLogo";

export function Header() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <RandiLogo size="sm" variant="with-text" href="/" animated />
        <ConnectButton />
      </div>
    </header>
  );
}
