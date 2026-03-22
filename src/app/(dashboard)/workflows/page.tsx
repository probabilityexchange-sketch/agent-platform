'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { WorkflowList } from '@/components/workflows/WorkflowList';
import { type SavedWorkflow } from '@/lib/workflows/schema';

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const readyCount = workflows.filter(workflow => workflow.status === 'ready').length;
  const needsInputCount = workflows.filter(
    workflow => workflow.status === 'draft' && workflow.plan.openQuestions.length > 0
  ).length;

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const res = await fetch('/api/workflows');
        if (!res.ok) {
          throw new Error("We couldn't load your automations right now.");
        }

        const data = await res.json();
        setWorkflows(data.workflows || []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'We hit a connection issue while loading your automations.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflows();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <header className="mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              Saved automations
            </span>
            <h1 className="mt-4 text-4xl font-black tracking-tight">Automations</h1>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground leading-relaxed">
              Save repeatable tasks here after they work well in chat. Review what is ready, what
              still needs input, and what to do next.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-border bg-white/[0.03] px-6 py-5 md:max-w-xs">
            <p className="text-sm font-medium text-muted-foreground">Saved automations</p>
            <p className="mt-2 text-3xl font-black tracking-tight">{workflows.length}</p>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {workflows.length === 0
                ? 'Start with one real task in chat, then save it here.'
                : `${readyCount} ready right now${needsInputCount > 0 ? ` • ${needsInputCount} need input` : ''}.`}
            </p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-5 h-14 w-14 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading your automations…</p>
        </div>
      ) : error ? (
        <div className="rounded-[2rem] border border-rose-500/20 bg-rose-500/[0.02] p-10 text-center">
          <span className="mb-4 block text-4xl">📡</span>
          <h2 className="text-2xl font-bold text-rose-400">Couldn’t load automations</h2>
          <p className="mt-2 text-muted-foreground">{error}</p>
        </div>
      ) : workflows.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-border/60 bg-card/40 p-12 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-primary/20 bg-primary/10">
            <span className="text-4xl text-primary">⚡</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight">No saved automations yet</h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground leading-relaxed">
            Start with one real task in chat. Once the flow works the way you want, ask Randi to
            save it as an automation.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/chat"
              className="inline-flex items-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Open chat
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center rounded-xl border border-border px-5 py-3 text-sm font-semibold transition-colors hover:bg-muted"
            >
              Getting Started
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex items-center gap-4 px-2">
            <div className="h-px flex-1 bg-white/5" />
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Your saved automations
            </p>
            <div className="h-px flex-1 bg-white/5" />
          </div>
          <WorkflowList workflows={workflows} />
        </div>
      )}

      {!loading && !error && workflows.length > 0 && (
        <footer className="mt-16 border-t border-white/5 pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Tip: once a task works well in chat, ask Randi to “save this as an automation.”
          </p>
        </footer>
      )}
    </div>
  );
}
