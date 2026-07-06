import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getClientIdentifier } from "@/lib/clientIp";
import {
  checkRateLimit,
  getRateLimitFromEnv,
  rateLimitHeaders,
  RateLimitExceededError,
} from "@/lib/rateLimit";
import { createSnippet } from "@/lib/snippet";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let rateLimit;

  try {
    rateLimit = await checkRateLimit({
      identifier: getClientIdentifier(request.headers),
      limit: getRateLimitFromEnv("RATE_LIMIT_SNIPPET_PER_MINUTE", 60),
      prefix: "snippet",
    });

    const body = await readJsonBody(request);
    const result = await createSnippet({
      url: String(body.url ?? ""),
      language: String(body.language ?? body.lang ?? "curl"),
    });

    return NextResponse.json(result, {
      headers: rateLimitHeaders(rateLimit),
    });
  } catch (error) {
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

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected snippet error." },
      { status: 400, headers: rateLimitHeaders(rateLimit) },
    );
  }
}

async function readJsonBody(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();

    return typeof body === "object" && body !== null ? body : {};
  } catch {
    return {};
  }
}
