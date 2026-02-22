"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { useTokenPrice } from "@/hooks/useTokenPrice";

interface ChatSession {
  id: string;
  title: string;
  agent: { name: string };
  createdAt: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { isSubscribed, subscription } = useCredits();
  const { priceUsd, marketCap, formatUsdCompact } = useTokenPrice();
  const [recentSessions, setRecentSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/chat/sessions")
      .then((res) => res.json())
      .then((data) => {
        setRecentSessions(data.sessions?.slice(0, 4) || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching sessions:", err);
        setLoading(false);
      });
  }, []);

  const handleSaveUsername = async () => {
    if (!username || username.length < 3) return;
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (e) {
      console.error("Failed to save username:", e);
    } finally {
      setSaving(false);
    }
  };

  const walletDisplay = user?.walletAddress
    ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
    : "User";

  const daysLeft = subscription.expiresAt
    ? Math.max(0, Math.ceil((new Date(subscription.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {walletDisplay}</h1>
          <p className="text-muted-foreground">Manage your AI agents and chat history.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {/* Subscription Status */}
        <div className="glass-card rounded-2xl p-6">
          <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Subscription</p>
          {isSubscribed ? (
            <>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold text-success">Randi Pro</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {daysLeft !== null ? `${daysLeft} days remaining` : "Active"}
              </p>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold text-muted-foreground">Free Tier</span>
              </div>
              <Link href="/credits" className="mt-4 block w-full text-center py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg text-sm font-semibold transition-all">
                Subscribe — $20/mo
              </Link>
            </>
          )}
        </div>

        {/* Model Access */}
        <div className="glass-card rounded-2xl p-6">
          <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">AI Models</p>
          <div className="flex flex-col gap-1.5 mt-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
              Llama 3.3 70B
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
              Gemini 2.0 Flash
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
              DeepSeek R1
            </div>
          </div>
        </div>

        {/* RANDI Market Cap */}
        <div className="glass-card rounded-2xl p-6">
          <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold text-primary">RANDI Market Cap</p>
          <div className="flex flex-col mt-2">
            <span className="text-2xl font-bold font-mono">
              {marketCap !== null ? formatUsdCompact(marketCap) : "—"}
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              Current Price: {priceUsd ? `$${priceUsd.toFixed(8)}` : "—"}
            </span>
          </div>
          <a
            href="https://dexscreener.com/solana/GmnoShpt5vyGwZLyPYsBah2vxPUAfvw6fKSLbBa2XpFy"
            target="_blank"
            rel="noreferrer"
            className="mt-4 block w-full text-center py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg text-sm font-semibold transition-all shadow-sm"
          >
            View DEX Chart
          </a>
        </div>
      </div>

      {/* Profile */}
      <div className="glass-card rounded-2xl p-6 mb-8">
        <h2 className="text-lg font-bold mb-4">Profile URL (Optional)</h2>
        <p className="text-sm text-muted-foreground mb-4">
          You can set a custom username for branded agent URLs. If left blank, one is generated automatically.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder="Enter custom username (e.g., myname123)"
            className="flex-1 px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            minLength={3}
            maxLength={20}
          />
          <button
            onClick={handleSaveUsername}
            disabled={saving || username.length < 3}
            className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold disabled:opacity-50 transition-all"
          >
            {saving ? "Saving..." : saved ? "Saved!" : "Save"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Only lowercase letters, numbers, and hyphens. 3-20 characters.
        </p>
      </div>

      {/* Recent Conversations */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Recent Conversations</h2>
          <Link href="/chat" className="text-sm text-primary hover:underline font-medium">
            View all history
          </Link>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-card animate-pulse rounded-xl border border-border"></div>
            ))}
          </div>
        ) : recentSessions.length === 0 ? (
          <div className="bg-card/30 border border-dashed border-border rounded-2xl p-12 text-center">
            <p className="text-muted-foreground mb-6 text-lg">You haven&apos;t started any chats yet.</p>
            <Link
              href="/agents"
              className="px-8 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary/20"
            >
              Start Your First Conversation
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {recentSessions.map((session) => (
              <Link
                key={session.id}
                href={`/chat/${session.id}`}
                className="group bg-card hover:bg-muted/50 border border-border rounded-xl p-5 transition-all"
              >
                <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">{session.title}</h3>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded uppercase font-bold tracking-tighter">
                    {session.agent.name}
                  </span>
                  <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
