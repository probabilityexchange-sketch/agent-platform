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

  useEffect(() => {
    if (cachedConfig) return;

    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        cachedConfig = data;
        setConfig(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { config, loading };
}
