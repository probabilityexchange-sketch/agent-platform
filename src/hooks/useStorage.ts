"use client";

import { useState, useCallback } from "react";
import type { StorageSnapshotStatus } from "@/types/storage";

interface UseStorageReturn {
    storage: StorageSnapshotStatus | null;
    loading: boolean;
    snapshotting: boolean;
    fetchStorage: (agentSlug: string) => Promise<void>;
    createSnapshot: (containerId: string, agentSlug: string) => Promise<boolean>;
}

export function useStorage(): UseStorageReturn {
    const [storage, setStorage] = useState<StorageSnapshotStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [snapshotting, setSnapshotting] = useState(false);

    const fetchStorage = useCallback(async (agentSlug: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/storage/snapshot?agentSlug=${encodeURIComponent(agentSlug)}`);
            if (res.ok) {
                const data = await res.json();
                setStorage(data);
            } else {
                setStorage({ exists: false });
            }
        } catch {
            setStorage({ exists: false });
        } finally {
            setLoading(false);
        }
    }, []);

    const createSnapshot = useCallback(async (containerId: string, agentSlug: string): Promise<boolean> => {
        setSnapshotting(true);
        try {
            // First, trigger the snapshot via the container endpoint
            const res = await fetch(`/api/containers/${containerId}/snapshot`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ agentSlug }),
            });

            if (res.ok) {
                // Refresh storage info after snapshot
                await fetchStorage(agentSlug);
                return true;
            }
            return false;
        } catch {
            return false;
        } finally {
            setSnapshotting(false);
        }
    }, [fetchStorage]);

    return {
        storage,
        loading,
        snapshotting,
        fetchStorage,
        createSnapshot,
    };
}
