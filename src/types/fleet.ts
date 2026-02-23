export interface FleetNodeStats {
    nodeId: string;
    nodeRegion: string;
    totalContainers: number;
    totalCpuPercent: number;
    totalMemoryUsed: string;
    totalMemoryLimit: string;
    totalNetworkRx: string;
    totalNetworkTx: string;
    reportedAt: string;
}

export interface FleetAggregateStats {
    totalContainers: number;
    avgCpuPercent: number;
    totalMemoryUsed: string;
    totalMemoryLimit: string;
    totalNetworkRx: string;
    totalNetworkTx: string;
    nodes: number;
}

export interface FleetStatsResponse {
    nodes: FleetNodeStats[];
    aggregate: FleetAggregateStats;
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: string | number | bigint): string {
    const numBytes = typeof bytes === "string" ? parseInt(bytes, 10) : Number(bytes);

    if (isNaN(numBytes) || numBytes === 0) return "0 B";

    const units = ["B", "KB", "MB", "GB", "TB"];
    const k = 1024;
    const i = Math.floor(Math.log(numBytes) / Math.log(k));

    return `${parseFloat((numBytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}
