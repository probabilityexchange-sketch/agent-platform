import { NextResponse } from "next/server";
import { getTokenUsdPrice } from "@/lib/payments/token-pricing";
import { connection } from "@/lib/solana/connection";
import { PublicKey } from "@solana/web3.js";

// Cache: refresh every 30s
let cachedPrice: { usd: string; timestamp: number } | null = null;
const CACHE_TTL_MS = 30_000;

export async function GET() {
    try {
        const tokenMint = process.env.TOKEN_MINT || process.env.NEXT_PUBLIC_TOKEN_MINT || "Randi8oX9z123456789012345678901234567890";

        // Fetch actual token supply from Solana blockchain
        let tokenSupply = 1000000000; // fallback
        try {
            const mintPubkey = new PublicKey(tokenMint);
            const supply = await connection.getTokenSupply(mintPubkey);
            tokenSupply = Number(supply.value.amount);
        } catch (supplyError) {
            console.warn("Failed to fetch token supply from Solana, using fallback:", supplyError);
            tokenSupply = Number(process.env.TOKEN_SUPPLY || "1000000000");
        }

        const now = Date.now();
        if (cachedPrice && now - cachedPrice.timestamp < CACHE_TTL_MS) {
            return NextResponse.json({
                symbol: "RANDI",
                priceUsd: Number(cachedPrice.usd),
                marketCap: Number(cachedPrice.usd) * tokenSupply,
                burnPercent: 10,
                cachedAt: cachedPrice.timestamp,
            });
        }

        const result = await getTokenUsdPrice(tokenMint);
        const priceNum = Number(result.priceUsd);

        cachedPrice = { usd: result.priceUsd, timestamp: now };

        return NextResponse.json({
            symbol: "RANDI",
            priceUsd: priceNum,
            marketCap: priceNum * tokenSupply,
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
