import { kv } from "@vercel/kv";

export type RateLimitResult = {
  limit: number;
  remaining: number;
  reset: number;
};

export type RateLimitOptions = {
  identifier?: string;
  limit?: number;
  windowSeconds?: number;
  prefix?: string;
};

type MemoryBucket = {
  count: number;
  resetAtMs: number;
};

const DEFAULT_LIMIT = 20;
const DEFAULT_WINDOW_SECONDS = 60;
const memoryBuckets = new Map<string, MemoryBucket>();

export class RateLimitExceededError extends Error {
  status = 429;
  result: RateLimitResult;
  retryAfterSeconds: number;

  constructor(result: RateLimitResult) {
    super("Rate limit exceeded.");
    this.name = "RateLimitExceededError";
    this.result = result;
    this.retryAfterSeconds = Math.max(1, result.reset - unixNowSeconds());
  }
}

export async function checkRateLimit({
  identifier = "anonymous",
  limit = DEFAULT_LIMIT,
  windowSeconds = DEFAULT_WINDOW_SECONDS,
  prefix = "ratelimit",
}: RateLimitOptions = {}): Promise<RateLimitResult> {
  const safeLimit = Math.max(1, limit);
  const safeWindowSeconds = Math.max(1, windowSeconds);
  const key = `${prefix}:${identifier}`;
  if (hasKvConfig()) {
    try {
      return await checkKvRateLimit(key, safeLimit, safeWindowSeconds);
    } catch (error) {
      if (error instanceof RateLimitExceededError) {
        throw error;
      }

      return checkMemoryRateLimit(key, safeLimit, safeWindowSeconds);
    }
  }

  return checkMemoryRateLimit(key, safeLimit, safeWindowSeconds);
}

export function rateLimitHeaders(result?: RateLimitResult): Record<string, string> {
  if (!result) {
    return {};
  }

  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
  };
}

export function getRateLimitFromEnv(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function checkKvRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const count = await kv.incr(key);
  let ttl = await kv.ttl(key);

  if (count === 1 || ttl < 0) {
    await kv.expire(key, windowSeconds);
    ttl = windowSeconds;
  }

  const result = buildResult(count, limit, unixNowSeconds() + Math.max(1, ttl));

  if (count > limit) {
    throw new RateLimitExceededError(result);
  }

  return result;
}

function checkMemoryRateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const nowMs = Date.now();
  const currentBucket = memoryBuckets.get(key);
  const bucket =
    currentBucket && currentBucket.resetAtMs > nowMs
      ? currentBucket
      : { count: 0, resetAtMs: nowMs + windowSeconds * 1000 };

  bucket.count += 1;
  memoryBuckets.set(key, bucket);

  const result = buildResult(bucket.count, limit, Math.ceil(bucket.resetAtMs / 1000));

  if (bucket.count > limit) {
    throw new RateLimitExceededError(result);
  }

  return result;
}

function buildResult(count: number, limit: number, reset: number): RateLimitResult {
  return {
    limit,
    remaining: Math.max(0, limit - count),
    reset,
  };
}

function hasKvConfig(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function unixNowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
