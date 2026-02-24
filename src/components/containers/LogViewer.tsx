"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface LogViewerProps {
  containerId: string;
}

export function LogViewer({ containerId }: LogViewerProps) {
  const [logs, setLogs] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/containers/${containerId}/logs?tail=200`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [containerId]);

  useEffect(() => {
    void fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="bg-black rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-muted border-b border-border">
        <span className="text-sm font-medium">Logs</span>
        <button
          onClick={fetchLogs}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Refresh
        </button>
      </div>
      <div className="p-4 h-80 overflow-y-auto font-mono text-xs text-green-400 whitespace-pre-wrap">
        {loading ? (
          <span className="text-muted-foreground">Loading logs...</span>
        ) : logs ? (
          logs
        ) : (
          <span className="text-muted-foreground">No logs available</span>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
