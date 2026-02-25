"use client";

import { useState, useEffect } from "react";
import { useTokenPrice } from "@/hooks/useTokenPrice";

export function BurnCounter() {
    const [totalBurned, setTotalBurned] = useState<string>("0");
    const [loading, setLoading] = useState(true);
    const { formatRandi } = useTokenPrice();

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("/api/stats/burns");
                if (res.ok) {
                    const data = await res.json();
                    setTotalBurned(data.totalBurned || "0");
                }
            } catch (err) {
                console.error("Failed to fetch burn stats:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    const tokens = Number(BigInt(totalBurned)) / 1e6;

    return (
        <div className="px-3 py-3 bg-orange-500/5 border border-orange-500/20 rounded-lg relative overflow-hidden group">
            <div className="absolute -right-2 -top-2 opacity-10 group-hover:scale-125 transition-transform">
                <svg className="w-12 h-12 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C12 2 12 7 9 7C6 7 6 10 6 12C6 15.31 8.69 18 12 18C15.31 18 18 15.31 18 12C18 7 12 2 12 2ZM14 15C13.45 15.55 12.74 15.86 12 15.89V14.5C12.44 14.47 12.83 14.28 13.12 14C12.8 13.79 12.42 13.66 12 13.66V12.16C12.74 12.19 13.45 12.5 14 13.06C14.56 13.62 14.87 14.33 14.87 15.07C14.87 15.05 14.87 15.02 14.87 15C14.87 15.37 14.79 15.72 14.65 16.04L14 15Z" />
                </svg>
            </div>
            <p className="text-[10px] uppercase tracking-widest text-orange-400 font-bold mb-1">Total Burned 🔥</p>
            <p className="text-lg font-mono font-bold text-orange-500 leading-none">
                {loading ? "---" : formatRandi(tokens)}
            </p>
            <p className="text-[9px] text-muted-foreground mt-1">Deflationary Supply Control</p>
        </div>
    );
}
