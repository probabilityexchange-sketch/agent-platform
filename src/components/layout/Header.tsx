"use client";

import Link from "next/link";
import Image from "next/image";
import { ConnectButton } from "@/components/wallet/ConnectButton";

export function Header() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-8 h-8 transition-transform group-hover:scale-105">
            <Image 
              src="/randi.png" 
              alt="Randi Logo" 
              fill 
              className="object-contain"
            />
          </div>
          <span className="text-xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
            Randi
          </span>
        </Link>
        <ConnectButton />
      </div>
    </header>
  );
}
