"use client";

import { useState, useEffect } from "react";
import { AgentCard } from "@/components/agents/AgentCard";
import { LaunchDialog } from "@/components/agents/LaunchDialog";
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

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold mb-2">Agent Catalog</h1>
      <p className="text-muted-foreground mb-6">
        Choose an AI agent to launch. Each agent runs in an isolated container
        with its own URL.
      </p>

      {loading ? (
        <div className="text-muted-foreground">Loading agents...</div>
      ) : agents.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <p className="text-muted-foreground">No agents available</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              userTier={userTier}
              onLaunch={setSelectedAgent}
            />
          ))}
        </div>
      )}

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
