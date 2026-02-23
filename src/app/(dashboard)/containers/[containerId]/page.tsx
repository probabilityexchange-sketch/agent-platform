"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/containers/StatusBadge";
import { LogViewer } from "@/components/containers/LogViewer";
import { StorageCard } from "@/components/storage/StorageCard";
import { useStorage } from "@/hooks/useStorage";
import type { ContainerInfo } from "@/types/container";

export default function ContainerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const containerId = String(params.containerId);
  const [container, setContainer] = useState<ContainerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [extending, setExtending] = useState(false);
  const [stopping, setStopping] = useState(false);

  const { storage, loading: storageLoading, snapshotting, fetchStorage, createSnapshot } = useStorage();

  const fetchContainer = useCallback(async () => {
    try {
      const res = await fetch(`/api/containers/${containerId}`);
      if (res.ok) {
        const data = await res.json();
        setContainer(data);
        // Fetch storage info when container is loaded
        if (data.agentId) {
          await fetchStorage(data.agentId);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [containerId, fetchStorage]);

  useEffect(() => {
    void fetchContainer();
    const interval = setInterval(fetchContainer, 10000);
    return () => clearInterval(interval);
  }, [fetchContainer]);

  const handleSnapshot = async () => {
    if (container) {
      await createSnapshot(container.id, container.agentId);
    }
  };

  const handleStop = async () => {
    setStopping(true);
    try {
      await fetch(`/api/containers/${containerId}`, { method: "DELETE" });
      await fetchContainer();
    } catch {
      // ignore
    } finally {
      setStopping(false);
    }
  };

  const handleExtend = async (hours: number) => {
    setExtending(true);
    try {
      await fetch(`/api/containers/${containerId}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours }),
      });
      await fetchContainer();
    } catch {
      // ignore
    } finally {
      setExtending(false);
    }
  };

  if (loading) return <div className="text-muted-foreground">Loading...</div>;
  if (!container) return <div className="text-muted-foreground">Container not found</div>;

  const expiresAt = new Date(container.expiresAt);
  const timeLeft = expiresAt.getTime() - Date.now();
  const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)));
  const minutesLeft = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)));

  return (
    <div className="max-w-4xl">
      <button
        onClick={() => router.back()}
        className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block"
      >
        &larr; Back
      </button>

      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{container.agentName}</h1>
            <p className="text-sm text-muted-foreground">{container.subdomain}</p>
          </div>
          <StatusBadge status={container.status} />
        </div>

        {container.url && container.status === "RUNNING" && (
          <a
            href={container.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-primary hover:text-accent mb-4"
          >
            {container.url}
          </a>
        )}

        {container.password && container.status === "RUNNING" && (
          <div className="bg-muted rounded-lg p-3 mb-4">
            <p className="text-xs text-muted-foreground">Password</p>
            <p className="font-mono">{container.password}</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="text-sm font-medium">{container.status}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Time Remaining</p>
            <p className="text-sm font-medium">
              {container.status === "RUNNING"
                ? `${hoursLeft}h ${minutesLeft}m`
                : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Credits Used</p>
            <p className="text-sm font-medium">{container.creditsUsed}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="text-sm font-medium">
              {new Date(container.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {container.status === "RUNNING" && (
          <div className="flex gap-3">
            <button
              onClick={() => handleExtend(2)}
              disabled={extending}
              className="px-4 py-2 bg-muted hover:bg-border rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {extending ? "Extending..." : "Extend +2h"}
            </button>
            <button
              onClick={handleStop}
              disabled={stopping}
              className="px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {stopping ? "Stopping..." : "Stop Container"}
            </button>
          </div>
        )}
      </div>

      {/* Storage Section */}
      <div className="mb-6">
        <StorageCard
          agentSlug={container.agentId}
          storage={storage}
          loading={storageLoading}
          onSnapshot={container.status === "RUNNING" ? handleSnapshot : undefined}
          snapshotting={snapshotting}
        />
      </div>

      {container.status === "RUNNING" && (
        <LogViewer containerId={container.id} />
      )}
    </div>
  );
}
