import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getClientIdentifier } from "@/lib/clientIp";
import { fetchTarget, FetchTargetError } from "@/lib/fetchTarget";
import {
  getRateLimitFromEnv,
  rateLimitHeaders,
  RateLimitExceededError,
} from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const result = await fetchTarget({
      target: request.nextUrl.searchParams.get("url") ?? "",
      rateLimit: {
        identifier: getClientIdentifier(request.headers),
        limit: getRateLimitFromEnv("RATE_LIMIT_PROXY_PER_MINUTE", 20),
        prefix: "proxy",
      },
    });

    return NextResponse.json(result, {
      headers: rateLimitHeaders(result.meta.rateLimit),
    });
  } catch (error) {
    return proxyErrorResponse(error);
  }
}

function proxyErrorResponse(error: unknown) {
  if (error instanceof FetchTargetError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status, headers: rateLimitHeaders(error.rateLimit) },
    );
  }

  if (error instanceof RateLimitExceededError) {
    return NextResponse.json(
      { error: error.message, retryAfterSeconds: error.retryAfterSeconds },
      {
        status: error.status,
        headers: {
          ...rateLimitHeaders(error.result),
          "Retry-After": String(error.retryAfterSeconds),
        },
      },
    );
  }

  return NextResponse.json({ error: "Unexpected proxy error." }, { status: 500 });
}
