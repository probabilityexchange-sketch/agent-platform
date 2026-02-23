export interface StorageVolumeInfo {
    id: string;
    agentSlug: string;
    storageKey: string;
    sizeBytes: bigint | null;
    snapshotPath: string | null;
    lastSyncAt: string | null;
    createdAt: string;
}

export interface StorageSnapshotStatus {
    exists: boolean;
    agentSlug?: string;
    sizeBytes?: string;
    lastSyncAt?: string;
}

export interface SnapshotActionResponse {
    success: boolean;
    signedUrl?: string;
    storageKey?: string;
    error?: string;
}

/**
 * Format bytes to human-readable string
 */
export function formatStorageSize(bytes: bigint | number | null | undefined): string {
    if (bytes === null || bytes === undefined) return "0 B";

    const numBytes = typeof bytes === "bigint" ? Number(bytes) : bytes;

    if (numBytes === 0) return "0 B";

    const units = ["B", "KB", "MB", "GB", "TB"];
    const k = 1024;
    const i = Math.floor(Math.log(numBytes) / Math.log(k));

    return `${parseFloat((numBytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}
