"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RandiLogo } from "@/components/branding/RandiLogo";

interface Agent {
  id: string;
  slug: string;
  name: string;
  description: string;
  defaultModel: string;
}

interface ChatSession {
  id: string;
  title: string;
  agentId: string;
  agent: {
    name: string;
  };
  createdAt: string;
}

interface IntegrationSummary {
  slug: string;
  label: string;
  connected: boolean;
  suggestedPrompt: string | null;
}

type LauncherAction = {
  label: string;
  prompt: string;
  helper: string;
  accent: string;
};

const CORE_ACTIONS: LauncherAction[] = [
  {
    label: "Audit SEO",
    prompt: "Audit randi.agency for SEO issues and give me a prioritized action plan.",
    helper: "Find the fixes worth doing first.",
    accent: "border-primary/20 bg-primary/10 text-primary",
  },
  {
    label: "Find keywords",
    prompt: "Research the best keywords for an AI SEO agency targeting founders.",
    helper: "Turn search intent into a plan.",
    accent: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  },
  {
    label: "Draft content",
    prompt: "Write an SEO-optimized landing page for Randi's automated SEO service.",
    helper: "Get copy moving fast.",
    accent: "border-sky-500/20 bg-sky-500/10 text-sky-400",
  },
  {
    label: "Analyze competitors",
    prompt: "Analyze the top 3 competitors ranking for 'ai seo agency' on Google.",
    helper: "See what is already working.",
    accent: "border-violet-500/20 bg-violet-500/10 text-violet-400",
  },
  {
    label: "Review links",
    prompt: "Check the backlink profile for randi.agency and find link building opportunities.",
    helper: "Find authority gaps.",
    accent: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  },
  {
    label: "Build a calendar",
    prompt: "Create a content calendar for randi.agency targeting SEO keywords this month.",
    helper: "Keep the work queue full.",
    accent: "border-rose-500/20 bg-rose-500/10 text-rose-400",
  },
];

function buildLauncherActions(connectedIntegrations: IntegrationSummary[]) {
  const integrationActions = connectedIntegrations.flatMap((integration) => {
    if (!integration.suggestedPrompt) return [];

    return [
      {
        label: integration.label,
        prompt: integration.suggestedPrompt,
        helper: `Use ${integration.label} directly in chat.`,
        accent: "border-border bg-background/80 text-foreground",
      } satisfies LauncherAction,
    ];
  });

  const setupAction: LauncherAction[] =
    connectedIntegrations.length > 0
      ? []
      : [
          {
            label: "Connect a tool",
            prompt: "Connect a tool in Integrations first, then ask me to use it.",
            helper: "The agent works better with tools attached.",
            accent: "border-border bg-background/80 text-foreground",
          },
        ];

  return Array.from(
    new Map(
      [...CORE_ACTIONS, ...integrationActions, ...setupAction].map((action) => [
        action.label,
        action,
      ])
    ).values()
  ).slice(0, 6);
}

export default function ChatHubPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const [connectedIntegrations, setConnectedIntegrations] = useState<IntegrationSummary[]>([]);

  useEffect(() => {
    fetch("/api/agents")
      .then((res) => res.json())
      .then((data) => setAgents(data.agents || []))
      .catch(() => {});

    fetch("/api/chat/sessions")
      .then((res) => res.json())
      .then((data) => setSessions(data.sessions || []))
      .catch(() => {});

    fetch("/api/composio/integrations", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) =>
        setConnectedIntegrations(
          (data.integrations || []).filter((i: IntegrationSummary) => i.connected)
        )
      )
      .catch(() => {});
  }, []);

  const leadAgent = agents.find((a) => a.slug === "randi-lead");
  const launcherActions = useMemo(
    () => buildLauncherActions(connectedIntegrations),
    [connectedIntegrations]
  );
  const newChatHref = `/chat/new${leadAgent ? `?agentId=${leadAgent.id}` : ""}`;
  const buildPromptHref = (prompt: string) =>
    `${newChatHref}${newChatHref.includes("?") ? "&" : "?"}prompt=${encodeURIComponent(prompt)}`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 min-h-[calc(100vh-8rem)]">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-2xl shadow-black/10 sm:p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-emerald-500/5" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Action launcher
            </div>

            <div className="mt-5 max-w-2xl">
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                What should Randi do right now?
              </h1>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                Pick a job, not a blank chat box. Each button opens a real session with the right
                prompt already loaded, so the agent starts working instead of waiting around.
              </p>
            </div>

            <div className="relative mt-10 min-h-[380px]">
              <div className="absolute inset-x-10 top-10 h-64 rounded-full bg-primary/10 blur-3xl" />

              <div className="absolute left-4 top-8 hidden sm:block">
                <Link
                  href={buildPromptHref(launcherActions[0]?.prompt || "Audit randi.agency for SEO issues and give me a prioritized action plan.")}
                  className={`block max-w-[200px] rounded-full border px-4 py-3 text-left text-sm font-semibold shadow-lg transition-all hover:scale-[1.03] ${launcherActions[0]?.accent || "border-primary/20 bg-primary/10 text-primary"}`}
                >
                  <div>{launcherActions[0]?.label || "Audit SEO"}</div>
                  <div className="mt-1 text-xs font-normal opacity-80">
                    {launcherActions[0]?.helper || "Find the fixes worth doing first."}
                  </div>
                </Link>
              </div>

              <div className="absolute right-4 top-12 hidden sm:block">
                <Link
                  href={buildPromptHref(launcherActions[1]?.prompt || "Research the best keywords for an AI SEO agency targeting founders.")}
                  className={`block max-w-[200px] rounded-full border px-4 py-3 text-left text-sm font-semibold shadow-lg transition-all hover:scale-[1.03] ${launcherActions[1]?.accent || "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"}`}
                >
                  <div>{launcherActions[1]?.label || "Find keywords"}</div>
                  <div className="mt-1 text-xs font-normal opacity-80">
                    {launcherActions[1]?.helper || "Turn search intent into a plan."}
                  </div>
                </Link>
              </div>

              <div className="absolute left-6 bottom-16 hidden sm:block">
                <Link
                  href={buildPromptHref(launcherActions[2]?.prompt || "Write an SEO-optimized landing page for Randi's automated SEO service.")}
                  className={`block max-w-[220px] rounded-full border px-4 py-3 text-left text-sm font-semibold shadow-lg transition-all hover:scale-[1.03] ${launcherActions[2]?.accent || "border-sky-500/20 bg-sky-500/10 text-sky-400"}`}
                >
                  <div>{launcherActions[2]?.label || "Draft content"}</div>
                  <div className="mt-1 text-xs font-normal opacity-80">
                    {launcherActions[2]?.helper || "Get copy moving fast."}
                  </div>
                </Link>
              </div>

              <div className="absolute right-6 bottom-12 hidden sm:block">
                <Link
                  href={buildPromptHref(launcherActions[3]?.prompt || "Analyze the top 3 competitors ranking for 'ai seo agency' on Google.")}
                  className={`block max-w-[220px] rounded-full border px-4 py-3 text-left text-sm font-semibold shadow-lg transition-all hover:scale-[1.03] ${launcherActions[3]?.accent || "border-violet-500/20 bg-violet-500/10 text-violet-400"}`}
                >
                  <div>{launcherActions[3]?.label || "Analyze competitors"}</div>
                  <div className="mt-1 text-xs font-normal opacity-80">
                    {launcherActions[3]?.helper || "See what is already working."}
                  </div>
                </Link>
              </div>

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative flex flex-col items-center gap-3">
                  <div className="flex h-28 w-28 items-center justify-center rounded-full bg-background shadow-[0_0_0_16px_rgba(255,255,255,0.03),0_24px_80px_rgba(0,0,0,0.18)]">
                    <RandiLogo size="md" variant="icon-only" animated />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold tracking-wide text-foreground">Randi</p>
                    <p className="text-xs text-muted-foreground">
                      Click a task and the chat opens ready to work.
                    </p>
                  </div>
                  <Link
                    href={newChatHref}
                    className="mt-2 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] hover:bg-primary/90"
                  >
                    Start a fresh chat
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {connectedIntegrations.length > 0 ? (
                connectedIntegrations.slice(0, 4).map((integration) => (
                  <Link
                    key={integration.slug}
                    href={buildPromptHref(integration.suggestedPrompt || `Use ${integration.label} in this chat.`)}
                    className="rounded-full border border-border bg-background/80 px-3 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                  >
                    {integration.label}
                  </Link>
                ))
              ) : (
                <Link
                  href="/integrations"
                  className="rounded-full border border-border bg-background/80 px-3 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                >
                  Connect tools first
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-card p-5 shadow-2xl shadow-black/10 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Quick actions</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                One click, real prompt, actual session.
              </p>
            </div>
            {sessions.length > 0 && (
              <button
                onClick={() => setShowRecent((v) => !v)}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
              >
                {showRecent ? "Hide recent" : `Recent (${sessions.length})`}
              </button>
            )}
          </div>

          {!showRecent ? (
            <div className="mt-5 grid gap-3">
              {launcherActions.map((action) => (
                <Link
                  key={action.label}
                  href={buildPromptHref(action.prompt)}
                  className={`rounded-3xl border px-4 py-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ${action.accent}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">{action.label}</p>
                      <p className="mt-1 text-xs opacity-80">{action.helper}</p>
                    </div>
                    <svg className="h-4 w-4 shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-5 space-y-2">
              {sessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/chat/${session.id}`}
                  className="flex items-center justify-between rounded-2xl border border-border bg-background/60 p-4 transition-all hover:border-primary/30 hover:bg-background"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-semibold text-foreground truncate">
                      {session.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {session.agent.name} ·{" "}
                      {new Date(session.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <svg className="h-4 w-4 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          )}

          <p className="mt-5 text-xs text-muted-foreground">
            If a tool is missing, open{" "}
            <Link href="/integrations" className="underline underline-offset-2 hover:text-foreground">
              Integrations
            </Link>{" "}
            and connect it first.
          </p>
        </div>
      </div>
    </div>
  );
}
