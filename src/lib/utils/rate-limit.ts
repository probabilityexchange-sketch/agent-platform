interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const inMemoryStore = new Map<string, RateLimitEntry>();
const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redisEnabled = Boolean(redisUrl && redisToken);

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of inMemoryStore) {
    if (entry.resetAt < now) {
      inMemoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const RATE_LIMITS = {
  auth: { maxRequests: 5, windowMs: 60 * 1000 },
  purchase: { maxRequests: 3, windowMs: 60 * 1000 },
  purchaseVerify: {
    maxRequests: envInt("RATE_LIMIT_PURCHASE_VERIFY_MAX_REQUESTS", 12),
    windowMs: envInt("RATE_LIMIT_PURCHASE_VERIFY_WINDOW_MS", 60 * 1000),
  },
  provision: {
    maxRequests: envInt("RATE_LIMIT_PROVISION_MAX_REQUESTS", 6),
    windowMs: envInt("RATE_LIMIT_PROVISION_WINDOW_MS", 60 * 1000),
  },
  general: { maxRequests: 30, windowMs: 60 * 1000 },
} as const;

type RateLimitResult = { allowed: boolean; remaining: number; resetAt: number };

function parsePipelineResult(entry: unknown): unknown {
  if (Array.isArray(entry)) {
    return entry[1];
  }

  if (entry && typeof entry === "object" && "result" in entry) {
    return (entry as { result: unknown }).result;
  }

  return undefined;
}

async function checkRedisRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult | null> {
  if (!redisEnabled) {
    return null;
  }

  const redisKey = `ratelimit:${key}`;
  const now = Date.now();

  try {
    const response = await fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["PEXPIRE", redisKey, config.windowMs, "NX"],
        ["PTTL", redisKey],
      ]),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Redis rate-limit request failed");
    }

    const payload = (await response.json()) as unknown[];
    const count = Number(parsePipelineResult(payload[0]));
    const ttlMs = Number(parsePipelineResult(payload[2]));

    if (!Number.isFinite(count) || count <= 0) {
      return null;
    }

    const effectiveTtlMs =
      Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : config.windowMs;
    const remaining = Math.max(config.maxRequests - count, 0);
    return {
      allowed: count <= config.maxRequests,
      remaining,
      resetAt: now + effectiveTtlMs,
    };
  } catch {
    return null;
  }
}

function checkInMemoryRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = inMemoryStore.get(key);

  if (!entry || entry.resetAt < now) {
    inMemoryStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const redisResult = await checkRedisRateLimit(key, config);
  if (redisResult) {
    return redisResult;
  }

  return checkInMemoryRateLimit(key, config);
}
