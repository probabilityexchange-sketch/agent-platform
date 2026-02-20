import { NextResponse } from "next/server";
import { getTokenUsdPrice } from "@/lib/payments/token-pricing";

// Cache: refresh every 30s
let cachedPrice: { usd: string; timestamp: number } | null = null;
const CACHE_TTL_MS = 30_000;

export async function GET() {
    try {
        const tokenMint = process.env.TOKEN_MINT || process.env.NEXT_PUBLIC_TOKEN_MINT;
        if (!tokenMint) {
            return NextResponse.json(
                { symbol: "RANDI", priceUsd: null, burnPercent: 10, error: "Token mint not configured" },
                { status: 503 }
            );
        }

        const now = Date.now();
        if (cachedPrice && now - cachedPrice.timestamp < CACHE_TTL_MS) {
            return NextResponse.json({
                symbol: "RANDI",
                priceUsd: Number(cachedPrice.usd),
                burnPercent: 10,
                cachedAt: cachedPrice.timestamp,
            });
        }

        const result = await getTokenUsdPrice(tokenMint);

        cachedPrice = { usd: result.priceUsd, timestamp: now };

        return NextResponse.json({
            symbol: "RANDI",
            priceUsd: Number(result.priceUsd),
            burnPercent: 10,
            cachedAt: now,
        });
    } catch (error) {
        console.error("Failed to fetch token price:", error);
        return NextResponse.json(
            {
                symbol: "RANDI",
                priceUsd: null,
                burnPercent: 10,
                error: "Price unavailable",
            },
            { status: 503 }
        );
    }
}
