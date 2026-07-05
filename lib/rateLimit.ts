export type RateLimitResult = {
  limit: number;
  remaining: number;
  reset: number;
};

export async function checkRateLimit(): Promise<RateLimitResult> {
  throw new Error("Rate limiter implementation pending.");
}
