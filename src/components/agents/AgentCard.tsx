"use client";

import type { AgentCatalogItem } from "@/types/agent";
import Link from "next/link";
import { RandiLogo } from "@/components/branding/RandiLogo";

interface AgentCardProps {
  agent: AgentCatalogItem;
  onLaunch: (agent: AgentCatalogItem) => void;
  userTier?: string;
}

export function AgentCard({ agent, onLaunch, userTier = "FREE" }: AgentCardProps) {
  const requiredTier = agent.requiredTier || "FREE";
  const isLocked = requiredTier !== "BOTH" && requiredTier !== userTier;
  const isPro = requiredTier === "PRO";

  return (
    <div className={`group relative bg-card/40 hover:bg-card border border-border hover:border-primary/30 rounded-2xl p-6 transition-all duration-300 flex flex-col h-full ${isLocked ? 'grayscale opacity-60' : 'hover:shadow-2xl hover:shadow-primary/5'}`}>
      <div className="flex items-start justify-between mb-6">
        <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
          <RandiLogo size="sm" variant="icon-only" />
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {isPro && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
              PRO ONLY
            </span>
          )}
          <span className="text-[10px] font-mono font-bold text-muted-foreground opacity-50">
            {agent.tokensPerHour} TK/HR
          </span>
        </div>
      </div>

      <div className="flex-1 mb-6">
        <h3 className="text-xl font-bold group-hover:text-primary transition-colors duration-300">{agent.name}</h3>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-3">
          {agent.description}
        </p>
      </div>

      <div className="space-y-2 mt-auto">
        <Link
          href={isLocked ? "/credits" : `/chat/new?agentId=${agent.id}`}
          className={`w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${isLocked
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-primary text-primary-foreground hover:scale-[1.02] shadow-lg shadow-primary/10"
            }`}
        >
          {isLocked ? "Upgrade to Unlock" : (
            <>
              Use Capability
              <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </Link>
        {!isLocked && (
          <button
            onClick={() => onLaunch(agent)}
            className="w-full text-[11px] font-bold text-muted-foreground/50 hover:text-primary transition-colors py-1 uppercase tracking-widest"
          >
            Deploy Dedicated Runtime
          </button>
        )}
      </div>
    </div>
  );
}
