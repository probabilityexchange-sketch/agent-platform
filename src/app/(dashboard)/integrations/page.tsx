"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

interface IntegrationItem {
  slug: string;
  label: string;
  hasAuthConfig: boolean;
  authConfigId: string | null;
  authConfigName: string | null;
  authConfigCount: number | null;
  authConfigError: string | null;
  connectedAccountId: string | null;
  connectedStatus: string;
  connectedStatusReason: string | null;
  connectedAccountCount: number;
  connected: boolean;
}

interface IntegrationsResponse {
  composioUserId: string;
  sharedEntityMode: boolean;
  integrations: IntegrationItem[];
}

function statusTone(status: string): string {
  if (status === "ACTIVE") return "text-emerald-400";
  if (status === "INITIATED" || status === "INITIALIZING") return "text-amber-400";
  if (status === "FAILED" || status === "EXPIRED") return "text-rose-400";
  return "text-muted-foreground";
}

function IntegrationsPageContent() {
  const { isAuthenticated, sessionReady, sessionError, retrySessionSync } = useAuth();
  const searchParams = useSearchParams();
  const [data, setData] = useState<IntegrationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyToolkit, setBusyToolkit] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      setData(null);
      setError("Unauthorized");
      return;
    }

    if (!sessionReady) {
      setLoading(true);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let response = await fetch("/api/composio/integrations", { cache: "no-store" });
      let payload = (await response.json()) as IntegrationsResponse & { error?: string };

      // If the server cookie expired while Privy is still authenticated, force a session
      // resync once, then retry the integrations request.
      if (response.status === 401) {
        retrySessionSync();
        await new Promise((resolve) => setTimeout(resolve, 500));
        response = await fetch("/api/composio/integrations", { cache: "no-store" });
        payload = (await response.json()) as IntegrationsResponse & { error?: string };
      }

      if (!response.ok) {
        throw new Error(payload.error || "Failed to load integrations");
      }
      setData(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load integrations");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, sessionReady, retrySessionSync]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      setData(null);
      setError("Unauthorized");
      return;
    }

    if (!sessionReady) {
      setLoading(true);
      return;
    }

    load().catch(() => { });
  }, [isAuthenticated, sessionReady, load]);

  const callbackStatus = searchParams.get("status");
  const callbackToolkit = searchParams.get("toolkit");
  const callbackBanner = useMemo(() => {
    if (!callbackStatus) return null;
    const toolkitSuffix = callbackToolkit ? ` for ${callbackToolkit}` : "";
    if (callbackStatus === "success") {
      return {
        tone: "text-emerald-400",
        text: `Connection completed${toolkitSuffix}.`,
      };
    }
    if (callbackStatus === "failed") {
      return {
        tone: "text-rose-400",
        text: `Connection failed${toolkitSuffix}. Please try again.`,
      };
    }
    return {
      tone: "text-amber-400",
      text: `Connection returned with status "${callbackStatus}"${toolkitSuffix}.`,
    };
  }, [callbackStatus, callbackToolkit]);

  const connect = useCallback(async (toolkit: string) => {
    setBusyToolkit(toolkit);
    setError(null);
    try {
      const response = await fetch("/api/composio/integrations/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolkit }),
      });
      const payload = (await response.json()) as {
        error?: string;
        redirectUrl?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to start integration connection");
      }

      if (!payload.redirectUrl) {
        throw new Error("Missing Composio redirect URL");
      }

      window.location.assign(payload.redirectUrl);
    } catch (connectError) {
      setError(
        connectError instanceof Error
          ? connectError.message
          : "Failed to start integration connection"
      );
      setBusyToolkit(null);
    }
  }, []);

  const disconnect = useCallback(async (toolkit: string) => {
    setBusyToolkit(toolkit);
    setError(null);
    try {
      const response = await fetch("/api/composio/integrations/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolkit }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to disconnect integration");
      }
      await load();
    } catch (disconnectError) {
      setError(
        disconnectError instanceof Error
          ? disconnectError.message
          : "Failed to disconnect integration"
      );
    } finally {
      setBusyToolkit(null);
    }
  }, [load]);

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold mb-2">Integrations</h1>
      <p className="text-muted-foreground mb-6">
        Connect your third-party accounts through Composio so agents can execute actions
        directly instead of returning generic instructions.
      </p>

      {callbackBanner && (
        <div className={`mb-4 text-sm ${callbackBanner.tone}`}>{callbackBanner.text}</div>
      )}

      {error && <div className="mb-4 text-sm text-rose-400">{error}</div>}
      {!sessionReady && isAuthenticated && (
        <div className="mb-4 text-sm text-amber-400">
          Finalizing server session...
          {sessionError ? ` ${sessionError}` : ""}
        </div>
      )}

      {data?.sharedEntityMode && (
        <div className="mb-4 text-sm text-amber-400">
          Shared entity mode is enabled (`COMPOSIO_ENTITY_ID` is set). All users will share
          these integrations.
        </div>
      )}

      {loading ? (
        <div className="text-muted-foreground">Loading integrations...</div>
      ) : !data ? (
        <div className="text-muted-foreground">Unable to load integrations.</div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs text-muted-foreground">
            Composio entity: <span className="font-mono">{data.composioUserId}</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {data.integrations.map((integration) => {
              const isBusy = busyToolkit === integration.slug;
              const statusClass = statusTone(integration.connectedStatus);
              const canConnect = integration.hasAuthConfig;
              return (
                <div
                  key={integration.slug}
                  className="bg-card border border-border rounded-xl p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-lg">{integration.label}</h2>
                      <p className={`text-xs mt-1 ${statusClass}`}>
                        Status: {integration.connectedStatus}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Accounts: {integration.connectedAccountCount}
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <div>
                      Auth Config:{" "}
                      <span className="font-mono">
                        {integration.authConfigId || "Not configured"}
                      </span>
                    </div>
                    {integration.authConfigName && (
                      <div>Auth Config Name: {integration.authConfigName}</div>
                    )}
                    {integration.authConfigCount !== null && (
                      <div>Auth Config Count: {integration.authConfigCount}</div>
                    )}
                    {integration.connectedAccountId && (
                      <div>
                        Connected Account:{" "}
                        <span className="font-mono">{integration.connectedAccountId}</span>
                      </div>
                    )}
                    {integration.connectedStatusReason && (
                      <div className="text-rose-400">
                        Reason: {integration.connectedStatusReason}
                      </div>
                    )}
                    {integration.authConfigError && (
                      <div className="text-rose-400">
                        Auth Config Error: {integration.authConfigError}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => connect(integration.slug)}
                      disabled={isBusy || !canConnect}
                      className="px-3 py-2 text-sm rounded-lg bg-primary hover:bg-primary/90 text-white disabled:opacity-50"
                    >
                      {isBusy
                        ? "Working..."
                        : integration.connected
                          ? "Reconnect"
                          : "Connect"}
                    </button>
                    <button
                      onClick={() => disconnect(integration.slug)}
                      disabled={isBusy || !integration.connectedAccountId}
                      className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted disabled:opacity-50"
                    >
                      Disconnect
                    </button>
                    <button
                      onClick={() => load()}
                      disabled={isBusy}
                      className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted disabled:opacity-50"
                    >
                      Refresh
                    </button>
                  </div>

                  {!canConnect && (
                    <p className="mt-3 text-xs text-amber-400">
                      No auth config found for this toolkit in Composio. Create one first in the
                      Composio dashboard.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div className="max-w-5xl text-muted-foreground">Loading integrations...</div>}>
      <IntegrationsPageContent />
    </Suspense>
  );
}
