"use client";

import { useState, useEffect } from "react";

interface PlatformConfig {
  tokenMint: string;
  solanaNetwork: string;
  solanaRpcUrl: string;
  domain: string;
}

let cachedConfig: PlatformConfig | null = null;

export function useConfig() {
  const [config, setConfig] = useState<PlatformConfig | null>(cachedConfig);
  const [loading, setLoading] = useState(!cachedConfig);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedConfig) return;

    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        cachedConfig = data;
        setConfig(data);
      })
      .catch((err) => {
        console.error("Failed to load platform config:", err);
        setError(err instanceof Error ? err.message : "Failed to load config");
      })
      .finally(() => setLoading(false));
  }, []);

  return { config, loading, error };
}
