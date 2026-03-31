"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AgentCard } from "@/components/agents/AgentCard";
import { LaunchDialog } from "@/components/agents/LaunchDialog";
import { RandiLogo } from "@/components/branding/RandiLogo";
import { useContainers } from "@/hooks/useContainers";
import { useCredits } from "@/hooks/useCredits";
import type { AgentCatalogItem } from "@/types/agent";

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentCatalogItem[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentCatalogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [userTier, setUserTier] = useState<string>("FREE");
  const { launchContainer } = useContainers();
  const { balance } = useCredits();

  useEffect(() => {
    // Fetch user info including tier
    fetch("/api/auth/me")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Not authenticated");
      })
      .then((data) => {
        setUserTier(data.user?.tier || "FREE");
      })
      .catch(() => {
        setUserTier("FREE");
      });

    // Fetch agents
    fetch("/api/agents")
      .then((res) => res.json())
      .then((data) => setAgents(data.agents || []))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const handleLaunch = async (agentId: string, hours: number) => {
    await launchContainer(agentId, hours);
  };

  const activeAgents = useMemo(
    () => agents.filter((agent) => agent.active),
    [agents]
  );

  const featuredAgents = useMemo(
    () => activeAgents.slice(0, 4),
    [activeAgents]
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-2xl shadow-black/10 sm:p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-emerald-500/5" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Agent launcher
            </div>

            <div className="mt-5 max-w-2xl">
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                What should Randi run next?
              </h1>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                Pick an agent, open chat already pointed at it, or deploy a dedicated runtime.
                Same launcher flow, but for the skills layer.
              </p>
            </div>

            <div className="relative mt-10 min-h-[360px]">
              <div className="absolute inset-x-10 top-10 h-64 rounded-full bg-primary/10 blur-3xl" />

              {featuredAgents[0] && (
                <Link
                  href={`/chat/new?agentId=${featuredAgents[0].id}`}
                  className="absolute left-4 top-8 hidden max-w-[220px] rounded-full border border-primary/20 bg-primary/10 px-4 py-3 text-left text-sm font-semibold text-primary shadow-lg transition-all hover:scale-[1.03] sm:block"
                >
                  <div>{featuredAgents[0].name}</div>
                  <div className="mt-1 text-xs font-normal opacity-80">
                    Open chat and start with this skill.
                  </div>
                </Link>
              )}

              {featuredAgents[1] && (
                <Link
                  href={`/chat/new?agentId=${featuredAgents[1].id}`}
                  className="absolute right-4 top-12 hidden max-w-[220px] rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-left text-sm font-semibold text-emerald-400 shadow-lg transition-all hover:scale-[1.03] sm:block"
                >
                  <div>{featuredAgents[1].name}</div>
                  <div className="mt-1 text-xs font-normal opacity-80">
                    Routes directly into a fresh session.
                  </div>
                </Link>
              )}

              {featuredAgents[2] && (
                <button
                  onClick={() => setSelectedAgent(featuredAgents[2])}
                  className="absolute left-6 bottom-16 hidden max-w-[230px] rounded-full border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-left text-sm font-semibold text-sky-400 shadow-lg transition-all hover:scale-[1.03] sm:block"
                >
                  <div>{featuredAgents[2].name}</div>
                  <div className="mt-1 text-xs font-normal opacity-80">
                    Launch a dedicated runtime.
                  </div>
                </button>
              )}

              {featuredAgents[3] && (
                <Link
                  href={`/chat/new?agentId=${featuredAgents[3].id}`}
                  className="absolute right-6 bottom-12 hidden max-w-[230px] rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-left text-sm font-semibold text-violet-400 shadow-lg transition-all hover:scale-[1.03] sm:block"
                >
                  <div>{featuredAgents[3].name}</div>
                  <div className="mt-1 text-xs font-normal opacity-80">
                    Jump into the next best skill.
                  </div>
                </Link>
              )}

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative flex flex-col items-center gap-3">
                  <div className="flex h-28 w-28 items-center justify-center rounded-full bg-background shadow-[0_0_0_16px_rgba(255,255,255,0.03),0_24px_80px_rgba(0,0,0,0.18)]">
                    <RandiLogo size="md" variant="icon-only" animated />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold tracking-wide text-foreground">Randi skills</p>
                    <p className="text-xs text-muted-foreground">
                      Use a skill in chat, or launch it in a dedicated runtime.
                    </p>
                  </div>
                  <Link
                    href="/chat"
                    className="mt-2 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] hover:bg-primary/90"
                  >
                    Open chat hub
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {featuredAgents.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/chat/new?agentId=${agent.id}`}
                  className="rounded-full border border-border bg-background/80 px-3 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                >
                  {agent.name}
                </Link>
              ))}
              {featuredAgents.length === 0 && (
                <Link
                  href="/chat"
                  className="rounded-full border border-border bg-background/80 px-3 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                >
                  Open the chat hub
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-card p-5 shadow-2xl shadow-black/10 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Quick launch</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Two ways to move, use it in chat or deploy it.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-14 text-center text-muted-foreground animate-pulse">
              Loading agents...
            </div>
          ) : activeAgents.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-border bg-background/60 p-6 text-center">
              <p className="text-muted-foreground">No agents available</p>
            </div>
          ) : (
            <div className="mt-5 grid gap-3">
              {featuredAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="rounded-3xl border border-border bg-background/60 p-4 transition-all hover:border-primary/30 hover:bg-background"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-foreground">{agent.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {agent.tokensPerHour.toLocaleString()} TK/hr · {agent.requiredTier} tier
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedAgent(agent)}
                      className="rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                    >
                      Runtime
                    </button>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/chat/new?agentId=${agent.id}`}
                      className="flex-1 rounded-2xl bg-primary px-4 py-2 text-center text-sm font-bold text-white transition-colors hover:bg-primary/90"
                    >
                      Use in chat
                    </Link>
                    <button
                      onClick={() => setSelectedAgent(agent)}
                      className="rounded-2xl border border-border bg-background px-4 py-2 text-sm font-bold transition-colors hover:border-primary/30 hover:bg-muted"
                    >
                      Deploy
                    </button>
                  </div>
                </div>
              ))}

              <Link
                href="#agent-grid"
                className="rounded-3xl border border-border bg-muted/20 px-4 py-4 text-center text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
              >
                Browse the full catalog below
              </Link>
            </div>
          )}
        </div>
      </div>

      <div id="agent-grid" className="mt-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight">All agents</h2>
            <p className="text-sm text-muted-foreground">
              Open one in chat or deploy a dedicated runtime.
            </p>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {activeAgents.length} active
          </p>
        </div>

        {loading ? (
          <div className="text-muted-foreground">Loading agents...</div>
        ) : activeAgents.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <p className="text-muted-foreground">No agents available</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                userTier={userTier}
                onLaunch={setSelectedAgent}
              />
            ))}
          </div>
        )}
      </div>

      {selectedAgent && (
        <LaunchDialog
          agent={selectedAgent}
          onConfirm={handleLaunch}
          onClose={() => setSelectedAgent(null)}
          balance={balance}
        />
      )}
    </div>
  );
}
