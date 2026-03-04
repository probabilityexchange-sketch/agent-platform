"use client";

import { useState, useEffect, useCallback } from "react";

interface TokenPrice {
    symbol: string;
    priceUsd: number | null;
    marketCap: number | null;
    burnPercent: number;
}

const REFRESH_INTERVAL_MS = 30_000;

export function useTokenPrice() {
    const [price, setPrice] = useState<TokenPrice>({
        symbol: "RANDI",
        priceUsd: null,
        marketCap: null,
        burnPercent: 70,
    });
    const [loading, setLoading] = useState(true);

    const fetchPrice = useCallback(async () => {
        try {
            const response = await fetch("/api/token-price");
            if (!response.ok) throw new Error("Failed to fetch price");
            const data = await response.json();
            setPrice({
                symbol: data.symbol ?? "RANDI",
                priceUsd: data.priceUsd ?? null,
                marketCap: data.marketCap ?? null,
                burnPercent: data.burnPercent ?? 10,
            });
        } catch {
            // Keep previous price on error
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPrice();
        const interval = setInterval(fetchPrice, REFRESH_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [fetchPrice]);

    /** Calculate how many RANDI tokens a given USD amount costs */
    const usdToRandi = useCallback(
        (usdAmount: number): number | null => {
            if (!price.priceUsd || price.priceUsd <= 0) return null;
            return usdAmount / price.priceUsd;
        },
        [price.priceUsd]
    );

    /** Format RANDI amount with appropriate precision */
    const formatRandi = useCallback((amount: number | null): string => {
        if (amount === null) return "—";
        if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
        if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
        return amount.toFixed(2);
    }, []);

    /** Format USD amount with abbreviations (e.g. $1.2M) */
    const formatUsdCompact = useCallback((amount: number | null): string => {
        if (amount === null) return "—";
        const formatter = new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            notation: amount >= 1_000_000 ? "compact" : "standard",
            maximumFractionDigits: amount >= 1_000_000 ? 2 : 0,
        });
        return formatter.format(amount);
    }, []);

    return { ...price, loading, usdToRandi, formatRandi, formatUsdCompact, refresh: fetchPrice };
}
