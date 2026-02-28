"use client";

import { useState, useEffect, useCallback } from "react";

interface RuntimeStatus {
    id?: string;
    state?: "starting" | "active" | "failed" | "stopped" | "none";
    lastErrorCategory?: string;
    lastErrorMessage?: string;
    lastErrorRequestId?: string;
    lastErrorStatusCode?: number;
    runtimeTarget: "shared" | "dedicated";
}

export function RuntimeBadge({ agentId, sessionId }: { agentId: string; sessionId?: string }) {
    const [status, setStatus] = useState<RuntimeStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [showDetails, setShowDetails] = useState(false);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch(`/api/runtimes/status?agentId=${agentId}`);
            if (res.ok) {
                const data = await res.json();
                setStatus(data);

                // If it's starting, poll more frequently
                if (data.state === "starting") {
                    return true; // continue polling
                }
            }
        } catch (error) {
            console.error("Failed to fetch runtime status:", error);
        }
        return false;
    }, [agentId]);

    useEffect(() => {
        let isMounted = true;
        let pollTimer: NodeJS.Timeout;

        const poll = async () => {
            const shouldContinuePolling = await fetchStatus();
            setLoading(false);

            if (isMounted && shouldContinuePolling) {
                pollTimer = setTimeout(poll, 3000); // poll every 3 seconds while starting
            }
        };

        poll();

        return () => {
            isMounted = false;
            if (pollTimer) clearTimeout(pollTimer);
        };
    }, [fetchStatus]);

    const handleRetry = async () => {
        setLoading(true);
        setStatus(prev => prev ? { ...prev, state: "starting" } : { state: "starting", runtimeTarget: "shared" });
        try {
            await fetch("/api/runtimes/retry", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ agentId, sessionId })
            });
            // Polling will take over
        } catch (error) {
            console.error("Retry failed:", error);
        }
    };

    if (loading && !status) return null;
    if (!status || status.state === "none") return null;

    if (status.state === "starting") {
        return (
            <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-[11px] font-bold text-muted-foreground animate-pulse border border-border">
                <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                Dedicated runtime: Starting...
            </div>
        );
    }

    if (status.state === "active") {
        return (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full text-[11px] font-bold text-green-600 border border-green-500/20">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Dedicated runtime: Active
            </div>
        );
    }

    if (status.state === "failed") {
        return (
            <div className="flex flex-col gap-2 p-4 bg-red-50/50 border border-red-200 rounded-2xl max-w-sm">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span className="text-sm font-bold text-red-700">Couldn’t start a dedicated runtime</span>
                </div>
                <p className="text-xs text-red-600/80 leading-relaxed">
                    You can keep chatting normally. We'll retry in the background.
                </p>

                <div className="flex items-center gap-2 mt-1">
                    <button
                        onClick={() => setStatus(null)}
                        className="text-[11px] font-bold px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Continue
                    </button>
                    <button
                        onClick={handleRetry}
                        className="text-[11px] font-bold px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                        Retry
                    </button>
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="text-[11px] font-medium text-red-500 hover:text-red-700 transition-colors ml-1"
                    >
                        {showDetails ? "Hide details" : "View details"}
                    </button>
                </div>

                {showDetails && (
                    <div className="mt-3 p-3 bg-red-100/30 rounded-lg border border-red-200/50 text-[10px] font-mono text-red-800 space-y-1 overflow-x-auto">
                        <p><span className="opacity-50 uppercase tracking-tighter">Request ID:</span> {status.lastErrorRequestId}</p>
                        <p><span className="opacity-50 uppercase tracking-tighter">Status:</span> {status.lastErrorStatusCode}</p>
                        <p><span className="opacity-50 uppercase tracking-tighter">Category:</span> {status.lastErrorCategory}</p>
                        <p><span className="opacity-50 uppercase tracking-tighter">Error:</span> {status.lastErrorMessage}</p>
                    </div>
                )}
            </div>
        );
    }

    if (status.state === "stopped") {
        return (
            <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-[11px] font-medium text-muted-foreground border border-border">
                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                Runtime Offline (Shared Mode)
                <button onClick={handleRetry} className="ml-2 text-primary hover:underline">Restart</button>
            </div>
        );
    }

    return null;
}
