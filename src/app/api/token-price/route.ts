import { NextRequest, NextResponse } from "next/server";
import { getCreditPacks } from "@/lib/tokenomics";
import { getTokenUsdPrice } from "@/lib/payments/token-pricing";
import { connection } from "@/lib/solana/connection";
import { PublicKey } from "@solana/web3.js";
import { checkRateLimit, RATE_LIMITS } from "@/lib/utils/rate-limit";

// Cache: refresh every 30s
let cachedPrice: { usd: string; timestamp: number; supply: number } | null = null;
const CACHE_TTL_MS = 30_000;

/** Round up to nearest 1K */
function roundUpTo1K(value: number): number {
    return Math.ceil(value / 1000) * 1000;
}

export async function GET(request: NextRequest) {
    // FIX (HIGH): Rate limit this public endpoint to prevent price-scraping abuse
    const ip = request.headers.get("x-forwarded-for") ?? "anon";
    const { allowed } = await checkRateLimit(`token-price:${ip}`, RATE_LIMITS.general);
    if (!allowed) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    try {
        const tokenMint = process.env.TOKEN_MINT || process.env.NEXT_PUBLIC_TOKEN_MINT || "FYAz1bPKJUFRwT4pzhUzdN3UqCN5ppXRL2pfto4zpump";

        // Fetch actual token supply from Solana blockchain
        let tokenSupply = 0;
        try {
            const mintPubkey = new PublicKey(tokenMint);
            const supply = await connection.getTokenSupply(mintPubkey);
            // FIX (HIGH): Supply is returned in atomic units (6 decimals for $RANDI). 
            // Divide by decimals to get human-readable supply for market cap.
            tokenSupply = Number(supply.value.amount) / Math.pow(10, 6); // $RANDI uses 6 decimals
            console.log("Fetched human-readable token supply:", tokenSupply);
        } catch (supplyError) {
            console.warn("Failed to fetch token supply from Solana:", supplyError);
        }

        const now = Date.now();

        // Use cached if available and supply was fetched
        if (cachedPrice && now - cachedPrice.timestamp < CACHE_TTL_MS && tokenSupply > 0) {
            const marketCap = Number(cachedPrice.usd) * tokenSupply;
            return NextResponse.json({
                symbol: "RANDI",
                priceUsd: Number(cachedPrice.usd),
                marketCap: roundUpTo1K(marketCap),
                burnPercent: 70,
                cachedAt: cachedPrice.timestamp,
            });
        }

        const result = await getTokenUsdPrice(tokenMint);
        const priceNum = Number(result.priceUsd);

        // Only cache and return market cap if we have valid supply
        if (tokenSupply > 0) {
            cachedPrice = { usd: result.priceUsd, timestamp: now, supply: tokenSupply };
            const marketCap = priceNum * tokenSupply;
            return NextResponse.json({
                symbol: "RANDI",
                priceUsd: priceNum,
                marketCap: roundUpTo1K(marketCap),
                burnPercent: 70,
                cachedAt: now,
            });
        }

        // Can't calculate market cap without supply
        return NextResponse.json({
            symbol: "RANDI",
            priceUsd: priceNum,
            marketCap: null,
            burnPercent: 70,
            cachedAt: now,
        });
    } catch (error) {
        console.error("Failed to fetch token price:", error);
        return NextResponse.json(
            {
                symbol: "RANDI",
                priceUsd: null,
                marketCap: null,
                burnPercent: 70,
                error: "Price unavailable",
            },
            { status: 503 }
        );
    }
}
