'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCredits } from '@/hooks/useCredits';

interface ChatSession {
  id: string;
  title: string;
  agent: { name: string; image: string };
  createdAt: string;
}

interface ModelOption {
  id: string;
  name?: string;
}

interface ConnectedIntegration {
  slug: string;
  label: string;
  connected: boolean;
}

function DashboardContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const { isSubscribed, subscription, balance } = useCredits();
  const [recentSessions, setRecentSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [connectedIntegrations, setConnectedIntegrations] = useState<ConnectedIntegration[]>([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  const [workflowCount, setWorkflowCount] = useState(0);
  const [workflowsLoading, setWorkflowsLoading] = useState(true);

  useEffect(() => {
    const savedModel = localStorage.getItem('randi_selected_model');
    if (savedModel) setSelectedModel(savedModel);
  }, []);

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem('randi_selected_model', modelId);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) return;

        const data = await res.json();
        if (data.user?.username) {
          setUsername(data.user.username);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };

    fetchProfile();

    const urlUsername = searchParams.get('set-username');
    if (urlUsername && urlUsername.length >= 3 && urlUsername.length <= 20) {
      setUsername(urlUsername.toLowerCase().replace(/[^a-z0-9-]/g, ''));
    }
  }, [searchParams]);

  useEffect(() => {
    fetch('/api/chat/sessions')
      .then(res => res.json())
      .then(data => {
        setRecentSessions(data.sessions?.slice(0, 4) || []);
      })
      .catch(error => {
        console.error('Error fetching sessions:', error);
      })
      .finally(() => setLoading(false));

    setModelsLoading(true);
    fetch('/api/models')
      .then(res => res.json())
      .then(data => {
        setModels(data.models || []);
      })
      .catch(error => console.error('Error fetching models:', error))
      .finally(() => setModelsLoading(false));

    setIntegrationsLoading(true);
    fetch('/api/composio/integrations', { cache: 'no-store' })
      .then(async res => {
        if (!res.ok) throw new Error('Failed to load integrations');
        return res.json();
      })
      .then(data => {
        const connected = (data.integrations || []).filter(
          (integration: ConnectedIntegration) => integration.connected
        );
        setConnectedIntegrations(connected);
      })
      .catch(() => setConnectedIntegrations([]))
      .finally(() => setIntegrationsLoading(false));

    setWorkflowsLoading(true);
    fetch('/api/workflows')
      .then(async res => {
        if (!res.ok) throw new Error('Failed to load workflows');
        return res.json();
      })
      .then(data => {
        setWorkflowCount(data.workflows?.length || 0);
      })
      .catch(() => setWorkflowCount(0))
      .finally(() => setWorkflowsLoading(false));
  }, []);

  const handleSaveUsername = async () => {
    if (!username || username.length < 3) return;
    setSaving(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error('Failed to save username:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/${username}`;
    navigator.clipboard.writeText(url);
    alert('Profile link copied to clipboard!');
  };

  const displayName =
    username ||
    (user?.walletAddress
      ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
      : 'there');

  const daysUntilRenewal = subscription.expiresAt
    ? Math.max(
        0,
        Math.ceil((new Date(subscription.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      )
    : null;

  const connectedCount = connectedIntegrations.length;
  const currentModel = models.find(model => model.id === selectedModel);
  const currentModelName =
    currentModel?.name ||
    (selectedModel ? selectedModel.split('/').pop()?.split(':')[0] || selectedModel : 'Automatic');

  const setupSteps = [
    {
      title: 'Connect tools',
      complete: connectedCount > 0,
      detail:
        connectedCount > 0
          ? `${connectedCount} connected and ready for actions.`
          : 'Connect the apps Randi should be allowed to read from or act in.',
      href: '/integrations',
      cta: connectedCount > 0 ? 'Manage tools' : 'Connect tools',
    },
    {
      title: 'Start with one real task',
      complete: recentSessions.length > 0,
      detail:
        recentSessions.length > 0
          ? `${recentSessions.length} recent conversation${recentSessions.length === 1 ? '' : 's'} available.`
          : 'Open chat and ask Randi to help with something you already need done.',
      href: '/chat',
      cta: 'Open chat',
    },
    {
      title: 'Save an automation',
      complete: workflowCount > 0,
      detail:
        workflowCount > 0
          ? `${workflowCount} saved automation${workflowCount === 1 ? '' : 's'}.`
          : 'Once a task works well in chat, turn it into something repeatable.',
      href: '/workflows',
      cta: 'Open automations',
    },
  ];

  const completedSetupSteps = setupSteps.filter(step => step.complete).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gradient mb-2">
            Welcome back, {displayName}
          </h1>
          <p className="max-w-2xl text-muted-foreground font-medium leading-relaxed">
            Start with one real task. Randi can research, draft, plan, and take actions with your
            approval.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/chat"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Open chat
            </Link>
            <Link
              href="/integrations"
              className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-3 text-sm font-semibold transition-colors hover:bg-muted"
            >
              Connect tools
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-muted/30 p-5 lg:max-w-sm">
          <p className="text-sm font-semibold text-primary">Workspace readiness</p>
          <p className="mt-2 text-2xl font-black tracking-tight">
            {completedSetupSteps}/3 setup steps complete
          </p>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {connectedCount > 0
              ? `${connectedCount} connected tool${connectedCount === 1 ? ' is' : 's are'} ready for real actions.`
              : 'Connect one tool to let Randi move beyond chat-only work.'}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 mb-12">
        <section className="glass-card rounded-3xl p-6 lg:col-span-5">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <p className="text-sm font-semibold text-primary">Getting Started</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">What to do next</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                You only need one real task to get moving. These steps make the workspace more
                useful over time.
              </p>
            </div>
            <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {completedSetupSteps} of 3 done
            </div>
          </div>

          <div className="space-y-3">
            {setupSteps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-2xl border border-border/60 bg-background/40 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div
                      className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        step.complete
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {step.complete ? '✓' : index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{step.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={step.href}
                    className="inline-flex shrink-0 items-center rounded-lg border border-border/60 px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
                  >
                    {step.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card rounded-3xl p-6 lg:col-span-4">
          <p className="text-sm font-semibold text-primary">Overview</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Ready right now</h2>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
              <p className="text-sm font-medium text-muted-foreground">Connected tools</p>
              <p className="mt-2 text-2xl font-black">
                {integrationsLoading ? '—' : connectedCount}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
              <p className="text-sm font-medium text-muted-foreground">Automations</p>
              <p className="mt-2 text-2xl font-black">{workflowsLoading ? '—' : workflowCount}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
              <p className="text-sm font-medium text-muted-foreground">Available models</p>
              <p className="mt-2 text-2xl font-black">{modelsLoading ? '—' : models.length}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
              <p className="text-sm font-medium text-muted-foreground">Current model</p>
              <p className="mt-2 text-sm font-semibold leading-snug">{currentModelName}</p>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Connected tools</p>
              <Link
                href="/integrations"
                className="text-sm font-semibold text-primary hover:underline"
              >
                Manage tools
              </Link>
            </div>
            {integrationsLoading ? (
              <p className="mt-3 text-sm text-muted-foreground">Checking your connected tools…</p>
            ) : connectedCount > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {connectedIntegrations.slice(0, 6).map(integration => (
                  <span
                    key={integration.slug}
                    className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400"
                  >
                    {integration.label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                No tools connected yet. Start with the apps you already trust and use every day.
              </p>
            )}
          </div>

          <div className="mt-6 border-t border-border/60 pt-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-sm font-semibold">Model preference</p>
              <span className="text-xs text-muted-foreground">Optional</span>
            </div>
            <p className="mb-3 text-sm text-muted-foreground leading-relaxed">
              Leave this on Automatic unless you already know which model you want.
            </p>
            <div className="max-h-[180px] space-y-2 overflow-y-auto pr-1 no-scrollbar">
              {modelsLoading ? (
                [1, 2, 3].map(index => (
                  <div key={index} className="h-9 animate-pulse rounded-xl bg-muted/40" />
                ))
              ) : models.length > 0 ? (
                models.map(model => (
                  <button
                    key={model.id}
                    onClick={() => handleModelSelect(model.id)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                      selectedModel === model.id
                        ? 'border-primary/50 bg-primary/10 text-primary'
                        : 'border-border/60 bg-background/40 hover:bg-muted/60'
                    }`}
                  >
                    <span className="truncate pr-3">
                      {model.name || model.id.split('/').pop()?.split(':')[0] || model.id}
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {model.id.includes(':free') ? 'Free' : 'Premium'}
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No models available right now.</p>
              )}
            </div>
          </div>
        </section>

        <section className="glass-card rounded-3xl p-6 lg:col-span-3">
          <p className="text-sm font-semibold text-primary">Credits</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Usage and plan</h2>

          <div className="mt-6 rounded-2xl border border-border/60 bg-background/40 p-5">
            <p className="text-sm font-medium text-muted-foreground">Available credits</p>
            <p className="mt-2 text-4xl font-black tracking-tight">
              {(balance || 0).toLocaleString()}
            </p>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Credits cover model usage and other paid work. You only need to think about them when
              you need more room.
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-border/60 bg-background/40 p-5">
            <p className="text-sm font-medium text-muted-foreground">Current plan</p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {isSubscribed ? 'Pro plan active' : 'Free plan'}
            </p>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {isSubscribed && daysUntilRenewal !== null
                ? `Renews in ${daysUntilRenewal} day${daysUntilRenewal === 1 ? '' : 's'}.`
                : 'Upgrade when you need more usage or premium features.'}
            </p>
          </div>

          <Link
            href="/credits"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-white/90"
          >
            Manage credits
          </Link>
        </section>
      </div>

      <div className="mb-12">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-black tracking-tight">Recent work</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Jump back into your latest conversations and continue where you left off.
            </p>
          </div>
          <Link href="/chat" className="text-sm font-semibold text-primary hover:underline">
            Open chat
          </Link>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2].map(index => (
              <div
                key={index}
                className="h-28 bg-card/50 animate-pulse rounded-2xl border border-border/50"
              />
            ))}
          </div>
        ) : recentSessions.length === 0 ? (
          <div className="glass-card rounded-3xl p-10 border-dashed border-border/50">
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xl font-semibold">Start with one real task.</p>
                <p className="mt-2 max-w-2xl text-muted-foreground leading-relaxed">
                  Start with a real task in chat. If Randi needs to use one of your tools, she can
                  ask for approval before taking action.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/chat"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                >
                  Open chat
                </Link>
                <Link
                  href="/integrations"
                  className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-3 text-sm font-semibold transition-colors hover:bg-muted"
                >
                  Connect tools
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {recentSessions.map(session => (
              <Link
                key={session.id}
                href={`/chat/${session.id}`}
                className="group relative glass-card rounded-2xl p-6 transition-all hover:-translate-y-0.5 hover:border-primary/50 overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                  <span className="text-4xl font-black select-none">#{session.id.slice(-3)}</span>
                </div>
                <h3 className="font-bold text-xl mb-2 group-hover:text-primary transition-colors pr-10">
                  {session.title}
                </h3>
                <div className="flex items-center justify-between mt-6 gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    {session.agent.image && (
                      <Image
                        src={session.agent.image}
                        alt=""
                        width={20}
                        height={20}
                        className="h-5 w-5 rounded-full object-cover"
                      />
                    )}
                    <span className="truncate text-sm font-medium text-primary">
                      {session.agent.name}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(session.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="glass-card rounded-3xl p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight">Public profile</h2>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Optional
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground leading-relaxed">
            Claim a simple public link if you want a shareable Randi page. You can always set this
            up later.
          </p>

          <div className="mt-6 flex gap-2">
            <div className="relative flex-1 group">
              <label htmlFor="public-handle" className="sr-only">
                Public profile handle
              </label>
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground font-mono text-xs">
                randi.chat/
              </div>
              <input
                id="public-handle"
                type="text"
                value={username}
                onChange={event =>
                  setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                }
                placeholder="yourname"
                className="w-full pl-24 pr-4 py-3 bg-black/40 border border-border/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-mono text-sm"
                minLength={3}
                maxLength={20}
              />
            </div>
            <button
              onClick={handleSaveUsername}
              disabled={saving || username.length < 3}
              className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-2xl font-semibold disabled:opacity-50 transition-all text-sm"
            >
              {saving ? 'Saving…' : saved ? 'Saved' : 'Save handle'}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Use 3–20 letters, numbers, or hyphens.
          </p>
        </div>

        <div className="glass-card rounded-3xl p-6">
          <p className="text-sm font-semibold text-primary">Preview</p>
          <div className="mt-4 rounded-2xl border border-border/60 bg-background/40 p-4">
            <p className="text-sm text-muted-foreground">Your shareable link</p>
            <div className="mt-2 rounded-xl bg-muted/40 px-3 py-2 font-mono text-sm text-primary break-all">
              randi.chat/{username || '...'}
            </div>
            <button
              onClick={handleCopyLink}
              disabled={!username}
              className="mt-4 w-full rounded-xl border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted disabled:opacity-40"
            >
              Copy link
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-border/60 bg-background/40 p-4">
            <p className="text-sm font-semibold">What to do next</p>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              If you’re not sure what to do next, connect one tool and ask Randi to complete a
              simple real task for you.
            </p>
            <Link
              href="/how-it-works"
              className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline"
            >
              Getting Started
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto px-4 py-10 animate-pulse">
          <div className="h-10 w-64 bg-card rounded-lg mb-4" />
          <div className="h-4 w-72 bg-card rounded-lg mb-10" />
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="h-64 bg-card rounded-3xl" />
            <div className="h-64 bg-card rounded-3xl" />
            <div className="h-64 bg-card rounded-3xl" />
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
