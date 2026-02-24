"use client";

import { useState } from "react";
import type { AgentCatalogItem } from "@/types/agent";

interface LaunchDialogProps {
  agent: AgentCatalogItem;
  onConfirm: (agentId: string, hours: number) => Promise<void>;
  onClose: () => void;
  balance: number;
}

const HOUR_OPTIONS = [1, 2, 4, 8, 12, 24];

export function LaunchDialog({
  agent,
  onConfirm,
  onClose,
  balance,
}: LaunchDialogProps) {
  const [hours, setHours] = useState(4);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalTokens = hours * agent.tokensPerHour;
  const canAfford = balance >= totalTokens;

  const handleLaunch = async () => {
    setLaunching(true);
    setError(null);
    try {
      await onConfirm(agent.id, hours);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to launch");
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-1">Launch {agent.name}</h2>
        <p className="text-sm text-muted-foreground mb-6">
          {agent.description}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Duration</label>
            <div className="grid grid-cols-3 gap-2">
              {HOUR_OPTIONS.map((h) => (
                <button
                  key={h}
                  onClick={() => setHours(h)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${hours === h
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground hover:bg-border"
                    }`}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>

          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Rate</span>
              <span>{agent.tokensPerHour} tokens/hr</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Duration</span>
              <span>{hours} hours</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-medium">
              <span>Total</span>
              <span className={canAfford ? "" : "text-destructive"}>
                {totalTokens} tokens
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Your balance</span>
              <span>{balance} tokens</span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-muted hover:bg-border rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleLaunch}
            disabled={!canAfford || launching}
            className="flex-1 px-4 py-2 bg-primary hover:bg-accent text-primary-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {launching ? "Launching..." : "Launch"}
          </button>
        </div>
      </div>
    </div>
  );
}
