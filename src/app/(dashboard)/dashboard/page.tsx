"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";

interface ChatSession {
  id: string;
  title: string;
  agent: { name: string };
  createdAt: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { balance } = useCredits();
  const [recentSessions, setRecentSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.walletAddress ? `${user.walletAddress.slice(0, 6)}...` : "User"}</h1>
          <p className="text-muted-foreground">Manage your AI agents and chat history.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="glass-card rounded-2xl p-6">
          <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Credit Balance</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-primary">{balance.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground italic">Available</span>
          </div>
          <Link href="/credits" className="mt-6 block w-full text-center py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg text-sm font-semibold transition-all">
            Top Up Credits
          </Link>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Model Access</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold">FREE TIER</span>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            You can use Llama 3, Gemini Flash, and DeepSeek for 0 credits.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Active Agents</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold">3 READY</span>
          </div>
          <Link href="/agents" className="mt-6 block w-full text-center py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg text-sm font-semibold transition-all">
            View Agent Catalog
          </Link>
        </div>
      </div>

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
