"use client";

import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/contexts/WalletContext";

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="relative w-40 h-40 mx-auto mb-8 animate-in fade-in zoom-in duration-500">
           <Image 
             src="/randi.png" 
             alt="Randi" 
             fill 
             className="object-contain drop-shadow-2xl" 
             priority 
           />
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
          Launch AI Agents
          <br />
          <span className="text-primary">with Randi</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12">
          Connect your Solana wallet, buy credits, and spin up hosted AI agent
          containers instantly. No setup required. Pay with SPL tokens.
        </p>

        <div className="flex gap-4 justify-center mb-16">
          {user ? (
            <Link
              href="/dashboard"
              className="px-8 py-3 bg-primary hover:bg-accent text-primary-foreground rounded-lg font-medium text-lg transition-colors"
            >
              Go to Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="px-8 py-3 bg-primary hover:bg-accent text-primary-foreground rounded-lg font-medium text-lg transition-colors"
            >
              Get Started
            </Link>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-8 text-left">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="font-semibold mb-2">Connect & Pay</h3>
            <p className="text-sm text-muted-foreground">
              Connect your Phantom wallet and purchase credits with SPL tokens.
              No accounts or passwords needed.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <h3 className="font-semibold mb-2">Choose an Agent</h3>
            <p className="text-sm text-muted-foreground">
              Pick from Agent Zero, OpenClaw, and more. Each agent gets its own
              isolated container with persistent storage.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold mb-2">Instant Access</h3>
            <p className="text-sm text-muted-foreground">
              Your agent is live at a unique URL within seconds. Access it from
              anywhere, extend or stop anytime.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
