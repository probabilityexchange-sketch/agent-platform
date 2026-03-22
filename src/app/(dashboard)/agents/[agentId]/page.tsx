'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { LaunchDialog } from '@/components/agents/LaunchDialog';
import { useContainers } from '@/hooks/useContainers';
import { useCredits } from '@/hooks/useCredits';
import type { AgentCatalogItem } from '@/types/agent';

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [agent, setAgent] = useState<AgentCatalogItem | null>(null);
  const [showLaunch, setShowLaunch] = useState(false);
  const [loading, setLoading] = useState(true);
  const { launchContainer } = useContainers();
  const { balance } = useCredits();

  useEffect(() => {
    fetch('/api/agents')
      .then(res => res.json())
      .then(data => {
        const found = (data.agents || []).find((a: AgentCatalogItem) => a.id === params.agentId);
        setAgent(found || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.agentId]);

  if (loading) return <div className="text-muted-foreground">Loading...</div>;
  if (!agent) return <div className="text-muted-foreground">Agent not found</div>;

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => router.back()}
        className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block"
      >
        &larr; Back
      </button>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{agent.name}</h1>
            <p className="text-muted-foreground mt-1">{agent.description}</p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
            {agent.tokensPerHour} tokens/hr
          </span>
        </div>

        <button
          onClick={() => setShowLaunch(true)}
          className="px-6 py-2 bg-primary hover:bg-accent text-primary-foreground rounded-lg font-medium transition-colors"
        >
          Launch
        </button>
      </div>

      {showLaunch && (
        <LaunchDialog
          agent={agent}
          onConfirm={async (agentId, hours) => {
            await launchContainer(agentId, hours);
            router.push('/containers');
          }}
          onClose={() => setShowLaunch(false)}
          balance={balance}
        />
      )}
    </div>
  );
}
