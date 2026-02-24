"use client";

import type { AgentCatalogItem } from "@/types/agent";

interface AgentCardProps {
  agent: AgentCatalogItem;
  onLaunch: (agent: AgentCatalogItem) => void;
  userTier?: string;
}

export function AgentCard({ agent, onLaunch, userTier = "FREE" }: AgentCardProps) {
  const requiredTier = agent.requiredTier || "FREE";
  const isLocked = requiredTier !== "BOTH" && requiredTier !== userTier;

  const getTierBadge = () => {
    if (requiredTier === "BOTH") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600">
          All Users
        </span>
      );
    }
    if (requiredTier === "PRO") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600">
          PRO Only
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600">
        Free
      </span>
    );
  };

  return (
    <div className={`bg-card border border-border rounded-xl p-6 flex flex-col ${isLocked ? 'opacity-75' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">{agent.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {agent.description}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {getTierBadge()}
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
            {agent.creditsPerHour} credits/hr
          </span>
        </div>
      </div>
      <div className="mt-auto pt-4">
        <button
          onClick={() => onLaunch(agent)}
          disabled={isLocked}
          className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${isLocked
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-primary hover:bg-accent text-primary-foreground"
            }`}
        >
          {isLocked ? "Upgrade to Pro" : "Launch"}
        </button>
      </div>
    </div>
  );
}
