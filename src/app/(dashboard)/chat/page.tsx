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

const SEO_PROMPTS = [
  "Audit randi.agency for SEO issues and give me a prioritized action plan.",
  "Research the best keywords for an AI SEO agency targeting founders.",
  "Analyze the top 3 competitors ranking for 'ai seo agency' on Google.",
  "Write an SEO-optimized landing page for Randi's automated SEO service.",
  "Check the backlink profile for randi.agency and find link building opportunities.",
  "Create a content calendar for randi.agency targeting SEO keywords this month.",
];

const GENERIC_PROMPTS = [
  "Summarize this link and tell me what matters.",
  "Draft a reply from these notes.",
  "Research this topic and give me the best sources.",
  "Help me plan this task before taking action.",
  "Turn this into a checklist with next steps.",
];

function buildPromptChips(connectedIntegrations: IntegrationSummary[]) {
  const integrationPrompts = connectedIntegrations
    .map((i) => i.suggestedPrompt)
    .filter((p): p is string => Boolean(p));

  const combined = [...SEO_PROMPTS, ...integrationPrompts, ...GENERIC_PROMPTS];
  return Array.from(new Set(combined)).slice(0, 6);
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
  const promptChips = useMemo(() => buildPromptChips(connectedIntegrations), [connectedIntegrations]);
  const newChatHref = `/chat/new${leadAgent ? `?agentId=${leadAgent.id}` : ""}`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 min-h-[calc(100vh-8rem)] flex flex-col items-center">
      {/* Logo + heading */}
      <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="mb-5 flex justify-center">
          <RandiLogo size="xl" variant="icon-only" animated className="drop-shadow-2xl" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-3">
          What can I help with?
        </h1>
        <p className="text-base text-muted-foreground">
          SEO audits, keyword research, content, outreach — or anything else.
        </p>
      </div>

      {/* Primary CTA */}
      <div className="w-full flex flex-col sm:flex-row gap-3 justify-center mb-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
        <Link
          href={newChatHref}
          className="px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-base hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New chat
        </Link>
        {sessions.length > 0 && (
          <button
            onClick={() => setShowRecent((v) => !v)}
            className="px-8 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-foreground rounded-xl font-semibold text-base transition-all flex items-center justify-center gap-2 border border-zinc-700 hover:border-zinc-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {showRecent ? "Show prompts" : `Recent (${sessions.length})`}
          </button>
        )}
      </div>

      {/* Prompt chips or recent chats */}
      <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
        {!showRecent ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {promptChips.map((chip) => (
              <Link
                key={chip}
                href={`${newChatHref}${newChatHref.includes("?") ? "&" : "?"}prompt=${encodeURIComponent(chip)}`}
                className="p-4 bg-zinc-900 border border-zinc-700 rounded-xl text-sm font-medium hover:border-primary/50 hover:bg-zinc-800 transition-all text-left group"
              >
                <span className="text-zinc-300 group-hover:text-white transition-colors line-clamp-2 leading-relaxed">
                  {chip}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/chat/${session.id}`}
                className="flex items-center justify-between bg-zinc-900 border border-zinc-700 rounded-xl p-4 hover:border-primary/40 hover:bg-zinc-800 transition-all group"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {session.title}
                  </p>
                  <p className="text-sm text-zinc-500 mt-0.5">
                    {session.agent.name} ·{" "}
                    {new Date(session.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <svg className="w-4 h-4 text-zinc-600 group-hover:text-primary transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <p className="mt-8 text-xs text-zinc-600 text-center animate-in fade-in duration-700 delay-400">
        {connectedIntegrations.length > 0
          ? `${connectedIntegrations.length} tool${connectedIntegrations.length === 1 ? "" : "s"} connected · `
          : ""}
        <Link href="/integrations" className="hover:text-zinc-400 transition-colors underline-offset-2 hover:underline">
          Manage tools
        </Link>
      </p>
    </div>
  );
}
