"use client";

import type { ContainerStatus } from "@/types/container";

const statusConfig: Record<ContainerStatus, { label: string; className: string }> = {
  PROVISIONING: { label: "Provisioning", className: "bg-warning/10 text-warning" },
  RUNNING: { label: "Running", className: "bg-success/10 text-success" },
  STOPPING: { label: "Stopping", className: "bg-warning/10 text-warning" },
  STOPPED: { label: "Stopped", className: "bg-muted text-muted-foreground" },
  EXPIRED: { label: "Expired", className: "bg-muted text-muted-foreground" },
  ERROR: { label: "Error", className: "bg-destructive/10 text-destructive" },
};

export function StatusBadge({ status }: { status: ContainerStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {status === "RUNNING" && (
        <span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5 animate-pulse" />
      )}
      {config.label}
    </span>
  );
}
