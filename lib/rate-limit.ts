/**
 * Serverless-compatible rate limiter using Upstash Redis.
 * Falls back to allowing all requests if Upstash is not configured
 * (e.g. local development without Redis).
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Build Redis client once — returns null if env vars are missing
let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

// Cache rate limiter instances by config key
const limiters = new Map<string, Ratelimit>();

function getLimiter(config: RateLimitConfig): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;

  const cacheKey = `${config.limit}:${config.windowMs}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(config.limit, `${config.windowMs} ms`),
      analytics: false,
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

interface RateLimitConfig {
  /** Max requests allowed in the window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const limiter = getLimiter(config);

  // No Redis configured — fail closed in production, allow all in dev
  if (!limiter) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[rate-limit] Redis not configured in production — denying request");
      return { allowed: false, remaining: 0, resetMs: 60_000 };
    }
    return { allowed: true, remaining: config.limit, resetMs: config.windowMs };
  }

  const { success, remaining, reset } = await limiter.limit(key);
  return {
    allowed: success,
    remaining,
    resetMs: Math.max(0, reset - Date.now()),
  };
}

/**
 * Get a rate limit key from the request.
 * Uses userId if available, falls back to IP.
 */
export function getRateLimitKey(
  prefix: string,
  userId?: string,
  req?: Request
): string {
  if (userId) return `${prefix}:${userId}`;
  const forwarded = req?.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `${prefix}:${ip}`;
}

/**
 * Return a 429 Too Many Requests response.
 */
export function rateLimitResponse(resetMs: number): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again later." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil(resetMs / 1000)),
      },
    }
  );
}

// Pre-built configs for different route types
export const RATE_LIMITS = {
  /** AI routes — 20 requests per minute */
  ai: { limit: 20, windowMs: 60_000 },
  /** Memory writes — 30 per minute */
  memoryWrite: { limit: 30, windowMs: 60_000 },
  /** Heavy reads (connections, export) — 10 per minute */
  heavy: { limit: 10, windowMs: 60_000 },
  /** Auth — 5 per minute */
  auth: { limit: 5, windowMs: 60_000 },
  /** Destructive operations (delete, rollback) — 10 per minute */
  destructive: { limit: 10, windowMs: 60_000 },
  /** Billing operations (checkout creation) — 3 per minute */
  billing: { limit: 3, windowMs: 60_000 },
  /** Note CRUD — 60 per minute */
  crud: { limit: 60, windowMs: 60_000 },
} as const;
