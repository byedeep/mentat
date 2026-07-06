import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getClientIdentifier } from "@/lib/clientIp";
import { fetchTarget, FetchTargetError } from "@/lib/fetchTarget";
import {
  getRateLimitFromEnv,
  rateLimitHeaders,
  RateLimitExceededError,
} from "@/lib/rateLimit";
import { generateTypeDefinitions, inferJsonSchema } from "@/lib/schema";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return schemaResponse(request, {
    url: request.nextUrl.searchParams.get("url") ?? "",
    language: request.nextUrl.searchParams.get("language") ?? request.nextUrl.searchParams.get("lang") ?? undefined,
  });
}

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);

  return schemaResponse(request, {
    url: String(body.url ?? ""),
    language: body.language || body.lang ? String(body.language ?? body.lang) : undefined,
  });
}

async function schemaResponse(request: NextRequest, input: { url: string; language?: string }) {
  try {
    const result = await fetchTarget({
      target: input.url,
      rateLimit: {
        identifier: getClientIdentifier(request.headers),
        limit: getRateLimitFromEnv("RATE_LIMIT_SCHEMA_PER_MINUTE", 20),
        prefix: "schema",
      },
    });
    const schema = inferJsonSchema(result.data);
    const code = input.language ? generateTypeDefinitions(schema, input.language) : undefined;

    return NextResponse.json(
      {
        meta: result.meta,
        schema,
        code,
        language: input.language,
      },
      { headers: rateLimitHeaders(result.meta.rateLimit) },
    );
  } catch (error) {
    return schemaErrorResponse(error);
  }
}

function schemaErrorResponse(error: unknown) {
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

  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Unexpected schema generation error." },
    { status: 400 },
  );
}

async function readJsonBody(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();

    return typeof body === "object" && body !== null ? body : {};
  } catch {
    return {};
  }
}
