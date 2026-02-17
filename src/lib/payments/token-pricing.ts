const USD_SCALE = 6;
const PRICE_SCALE = 12;
const DEFAULT_CACHE_MS = 20_000;

type PriceQuote = {
  mint: string;
  priceUsd: string;
  source: string;
  fetchedAtMs: number;
};

const globalPriceCache = globalThis as unknown as {
  tokenPriceQuote?: PriceQuote;
};

function pow10(value: number): bigint {
  let result = BigInt(1);
  for (let i = 0; i < value; i += 1) result *= BigInt(10);
  return result;
}

function parseScaledDecimal(input: string, scale: number): bigint {
  const value = input.trim();
  if (!/^\d+(\.\d+)?$/.test(value)) {
    throw new Error(`Invalid decimal value: ${input}`);
  }

  const [whole, frac = ""] = value.split(".");
  const paddedFrac = (frac + "0".repeat(scale)).slice(0, scale);
  return BigInt(whole) * pow10(scale) + BigInt(paddedFrac);
}

function divCeil(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator - BigInt(1)) / denominator;
}

function formatAmount(amountBaseUnits: bigint, decimals: number, maxFraction = 6): string {
  const divisor = pow10(decimals);
  const whole = amountBaseUnits / divisor;
  const fraction = amountBaseUnits % divisor;

  if (fraction === BigInt(0) || maxFraction <= 0) return whole.toString();

  const fractionFull = fraction.toString().padStart(decimals, "0");
  const clipped = fractionFull.slice(0, Math.min(maxFraction, decimals)).replace(/0+$/, "");

  return clipped.length > 0 ? `${whole.toString()}.${clipped}` : whole.toString();
}

function parseBurnBps(): number {
  const raw = process.env.PAYMENT_BURN_BPS || "0";
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 0;
  if (parsed < 0) return 0;
  if (parsed > 10_000) return 10_000;
  return Math.trunc(parsed);
}

function getPriceCacheMs(): number {
  const raw = Number(process.env.TOKEN_PRICE_CACHE_MS || DEFAULT_CACHE_MS);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_CACHE_MS;
  return raw;
}

async function fetchDexScreenerPriceUsd(mint: string): Promise<string> {
  const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`DexScreener request failed with ${response.status}`);
  }

  const data = (await response.json()) as {
    pairs?: Array<{
      chainId?: string;
      priceUsd?: string;
      liquidity?: { usd?: number | string };
    }>;
  };

  const solanaPairs = (data.pairs || [])
    .filter((pair) => pair.chainId === "solana")
    .map((pair) => {
      const liquidity = Number(pair.liquidity?.usd || 0);
      return {
        priceUsd: pair.priceUsd || "",
        liquidity: Number.isFinite(liquidity) ? liquidity : 0,
      };
    })
    .filter((pair) => /^\d+(\.\d+)?$/.test(pair.priceUsd) && Number(pair.priceUsd) > 0);

  if (solanaPairs.length === 0) {
    throw new Error("No valid Solana price pairs found on DexScreener");
  }

  solanaPairs.sort((a, b) => b.liquidity - a.liquidity);
  return solanaPairs[0].priceUsd;
}

export async function getTokenUsdPrice(mint: string): Promise<{ priceUsd: string; source: string }> {
  const override = process.env.TOKEN_USD_PRICE_OVERRIDE?.trim();
  if (override && /^\d+(\.\d+)?$/.test(override) && Number(override) > 0) {
    return { priceUsd: override, source: "env_override" };
  }

  const now = Date.now();
  const cacheMs = getPriceCacheMs();
  const cached = globalPriceCache.tokenPriceQuote;
  if (cached && cached.mint === mint && now - cached.fetchedAtMs < cacheMs) {
    return { priceUsd: cached.priceUsd, source: cached.source };
  }

  const priceUsd = await fetchDexScreenerPriceUsd(mint);
  globalPriceCache.tokenPriceQuote = {
    mint,
    priceUsd,
    source: "dexscreener",
    fetchedAtMs: now,
  };

  return { priceUsd, source: "dexscreener" };
}

export function splitTokenAmountsByBurn(
  grossTokenAmount: bigint,
  burnBps = parseBurnBps()
): {
  burnBps: number;
  burnTokenAmount: bigint;
  treasuryTokenAmount: bigint;
} {
  const burnTokenAmount = (grossTokenAmount * BigInt(burnBps)) / BigInt(10_000);
  const treasuryTokenAmount = grossTokenAmount - burnTokenAmount;

  if (treasuryTokenAmount <= BigInt(0)) {
    throw new Error("Invalid burn settings: treasury amount becomes zero");
  }

  return { burnBps, burnTokenAmount, treasuryTokenAmount };
}

export async function quoteTokenAmountForUsd(params: {
  usdAmount: string;
  tokenMint: string;
  tokenDecimals: number;
}): Promise<{
  usdAmount: string;
  tokenUsdPrice: string;
  tokenAmountBaseUnits: bigint;
  tokenAmountDisplay: string;
  source: string;
}> {
  const usdAmount = params.usdAmount.trim();
  if (!/^\d+(\.\d+)?$/.test(usdAmount) || Number(usdAmount) <= 0) {
    throw new Error(`Invalid USD amount configured: ${params.usdAmount}`);
  }

  const { priceUsd, source } = await getTokenUsdPrice(params.tokenMint);

  const usdScaled = parseScaledDecimal(usdAmount, USD_SCALE);
  const priceScaled = parseScaledDecimal(priceUsd, PRICE_SCALE);
  const tokenDecimalsPow = pow10(params.tokenDecimals);

  const numerator = usdScaled * tokenDecimalsPow * pow10(PRICE_SCALE);
  const denominator = priceScaled * pow10(USD_SCALE);
  const tokenAmountBaseUnits = divCeil(numerator, denominator);

  if (tokenAmountBaseUnits <= BigInt(0)) {
    throw new Error("Calculated token amount is zero");
  }

  return {
    usdAmount,
    tokenUsdPrice: priceUsd,
    tokenAmountBaseUnits,
    tokenAmountDisplay: formatAmount(tokenAmountBaseUnits, params.tokenDecimals),
    source,
  };
}

export function parseBurnBpsFromMemo(memo: string): number {
  const match = memo.match(/:b(\d{1,5})$/);
  if (!match) return parseBurnBps();
  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  if (parsed > 10_000) return 10_000;
  return Math.trunc(parsed);
}
