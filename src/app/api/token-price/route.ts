import { NextResponse } from "next/server";
import { getTokenUsdPrice } from "@/lib/payments/token-pricing";
import { connection } from "@/lib/solana/connection";
import { PublicKey } from "@solana/web3.js";

// Cache: refresh every 30s
let cachedPrice: { usd: string; timestamp: number; supply: number } | null = null;
const CACHE_TTL_MS = 30_000;

/** Round up to nearest 1K */
function roundUpTo1K(value: number): number {
    return Math.ceil(value / 1000) * 1000;
}

export async function GET() {
    try {
        const tokenMint = process.env.TOKEN_MINT || process.env.NEXT_PUBLIC_TOKEN_MINT || "Randi8oX9z123456789012345678901234567890";

        // Fetch actual token supply from Solana blockchain
        let tokenSupply = 0;
        try {
            const mintPubkey = new PublicKey(tokenMint);
            const supply = await connection.getTokenSupply(mintPubkey);
            tokenSupply = Number(supply.value.amount);
            console.log("Fetched token supply:", tokenSupply);
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
                burnPercent: 10,
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
                burnPercent: 10,
                cachedAt: now,
            });
        }

        // Can't calculate market cap without supply
        return NextResponse.json({
            symbol: "RANDI",
            priceUsd: priceNum,
            marketCap: null,
            burnPercent: 10,
            cachedAt: now,
        });
    } catch (error) {
        console.error("Failed to fetch token price:", error);
        return NextResponse.json(
            {
                symbol: "RANDI",
                priceUsd: null,
                marketCap: null,
                burnPercent: 10,
                error: "Price unavailable",
            },
            { status: 503 }
        );
    }
}
