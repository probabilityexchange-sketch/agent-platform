"use client";

import { useState } from "react";
import type { StorageSnapshotStatus } from "@/types/storage";
import { formatStorageSize } from "@/types/storage";

interface StorageCardProps {
    agentSlug: string;
    storage: StorageSnapshotStatus | null;
    loading?: boolean;
    onSnapshot?: () => void;
    snapshotting?: boolean;
}

export function StorageCard({
    agentSlug,
    storage,
    loading = false,
    onSnapshot,
    snapshotting = false,
}: StorageCardProps) {
    const [expanded, setExpanded] = useState(false);

    if (loading) {
        return (
            <div className="bg-card border border-border rounded-xl p-4">
                <div className="animate-pulse flex items-center justify-between">
                    <div className="h-4 bg-muted rounded w-24"></div>
                    <div className="h-4 bg-muted rounded w-16"></div>
                </div>
            </div>
        );
    }

    const hasStorage = storage?.exists && storage.sizeBytes;
    const lastSync = storage?.lastSyncAt ? new Date(storage.lastSyncAt) : null;
    const syncAgo = lastSync
        ? Math.floor((Date.now() - lastSync.getTime()) / (1000 * 60))
        : null;

    return (
        <div className="bg-card border border-border rounded-xl p-4">
            <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2">
                    <svg
                        className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                        />
                    </svg>
                    <span className="font-medium text-sm">Storage</span>
                </div>
                <div className="flex items-center gap-2">
                    {hasStorage ? (
                        <>
                            <span className="text-sm text-muted-foreground">
                                {formatStorageSize(storage.sizeBytes!)}
                            </span>
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        </>
                    ) : (
                        <span className="text-sm text-muted-foreground">No snapshot</span>
                    )}
                </div>
            </div>

            {expanded && (
                <div className="mt-4 pt-4 border-t border-border">
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Agent</span>
                            <span className="font-mono">{agentSlug}</span>
                        </div>

                        {hasStorage && (
                            <>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Size</span>
                                    <span>{formatStorageSize(storage.sizeBytes!)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Last Sync</span>
                                    <span>
                                        {syncAgo !== null
                                            ? syncAgo < 60
                                                ? `${syncAgo}m ago`
                                                : `${Math.floor(syncAgo / 60)}h ago`
                                            : "Never"}
                                    </span>
                                </div>
                            </>
                        )}

                        {onSnapshot && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSnapshot();
                                }}
                                disabled={snapshotting}
                                className="w-full mt-2 px-3 py-2 bg-primary hover:bg-accent text-primary-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {snapshotting
                                    ? "Creating Snapshot..."
                                    : hasStorage
                                        ? "Update Snapshot"
                                        : "Create Snapshot"}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
