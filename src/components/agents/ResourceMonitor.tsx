"use client";

import { useState, useEffect, useRef } from "react";

interface Stats {
    cpuPercent: number;
    memoryMb: number;
    memoryLimitMb: number;
}

interface ResourceMonitorProps {
    containerId: string;
    pollIntervalMs?: number;
}

function ProgressBar({
    value,
    max,
    color,
}: {
    value: number;
    max: number;
    color: string;
}) {
    const pct = Math.min(100, (value / max) * 100);
    return (
        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div
                className={`h-full rounded-full transition-all duration-500 ${color}`}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}

export function ResourceMonitor({
    containerId,
    pollIntervalMs = 5000,
}: ResourceMonitorProps) {
    const [stats, setStats] = useState<Stats | null>(null);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchStats = async () => {
        try {
            const res = await fetch(`/api/containers/${containerId}/stats`);
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to fetch stats");
            }
            const data: Stats = await res.json();
            setStats(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        }
    };

    useEffect(() => {
        fetchStats();
        intervalRef.current = setInterval(fetchStats, pollIntervalMs);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [containerId, pollIntervalMs]);

    if (error) {
        return (
            <div className="text-xs text-yellow-400/70 px-1">
                Stats unavailable
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="text-xs text-white/40 animate-pulse px-1">
                Loading stats…
            </div>
        );
    }

    const memPct = Math.round((stats.memoryMb / stats.memoryLimitMb) * 100);

    return (
        <div className="space-y-2 text-xs text-white/70">
            <div className="flex items-center justify-between">
                <span>CPU</span>
                <span className="font-mono text-white/90">{stats.cpuPercent.toFixed(1)}%</span>
            </div>
            <ProgressBar
                value={stats.cpuPercent}
                max={100}
                color={stats.cpuPercent > 80 ? "bg-red-400" : "bg-emerald-400"}
            />

            <div className="flex items-center justify-between mt-1">
                <span>RAM</span>
                <span className="font-mono text-white/90">
                    {stats.memoryMb.toFixed(0)} / {stats.memoryLimitMb.toFixed(0)} MB ({memPct}%)
                </span>
            </div>
            <ProgressBar
                value={stats.memoryMb}
                max={stats.memoryLimitMb}
                color={memPct > 85 ? "bg-red-400" : "bg-sky-400"}
            />
        </div>
    );
}
