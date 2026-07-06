import { headers } from "next/headers";

import { JsonViewer } from "@/components/JsonViewer";
import { SchemaGenerator } from "@/components/SchemaGenerator";
import { UrlInput } from "@/components/UrlInput";
import { getClientIdentifier } from "@/lib/clientIp";
import { fetchTarget, FetchTargetError, type FetchTargetResult } from "@/lib/fetchTarget";
import { getRateLimitFromEnv, RateLimitExceededError } from "@/lib/rateLimit";
import { inferJsonSchema } from "@/lib/schema";

type ResultPageProps = {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type PageError = {
  message: string;
  status: number;
  code?: string;
};

export const runtime = "nodejs";

export default async function ResultPage({ params, searchParams }: ResultPageProps) {
  const { path } = await params;
  const requestedPath = buildTarget(path, await searchParams);
  const requestHeaders = await headers();
  let result: FetchTargetResult | undefined;
  let error: PageError | undefined;

  try {
    result = await fetchTarget({
      target: requestedPath,
      rateLimit: {
        identifier: getClientIdentifier(requestHeaders),
        limit: getRateLimitFromEnv("RATE_LIMIT_SCHEMA_PER_MINUTE", 20),
        prefix: "schema",
      },
    });
  } catch (caughtError) {
    error = toPageError(caughtError);
  }

  const displayUrl = result?.meta.requestedUrl ?? requestedPath;
  const schema = result ? inferJsonSchema(result.data) : undefined;

  return (
    <main className="shell results-shell">
      <UrlInput initialValue={displayUrl} buttonLabel="Generate another" key={displayUrl} />
      {error ? (
        <section className="panel notice-panel" aria-label="Request error">
          <span className="notice-dot" aria-hidden="true" />
          <div>
            <p className="section-label">Request failed</p>
            <h2>{error.status}</h2>
            <p className="panel-copy">{error.message}</p>
          </div>
        </section>
      ) : null}
      <div className="result-grid">
        {schema ? <SchemaGenerator schema={schema} key={result?.meta.requestedUrl} /> : null}
        <JsonViewer requestedUrl={displayUrl} result={result} error={error} />
      </div>
    </main>
  );
}

function buildTarget(path: string[], searchParams: Record<string, string | string[] | undefined>) {
  const firstSegment = decodeProtocolSegment(path[0] ?? "");
  const targetPath =
    firstSegment === "http:" || firstSegment === "https:"
      ? `${firstSegment}//${path.slice(1).join("/")}`
      : path.join("/");
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        query.append(key, item);
      }
    } else if (value !== undefined) {
      query.set(key, value);
    }
  }

  const queryString = query.toString();

  return queryString ? `${targetPath}?${queryString}` : targetPath;
}

function decodeProtocolSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function toPageError(error: unknown): PageError {
  if (error instanceof FetchTargetError) {
    return {
      message: error.message,
      status: error.status,
      code: error.code,
    };
  }

  if (error instanceof RateLimitExceededError) {
    return {
      message: `${error.message} Try again in ${error.retryAfterSeconds} seconds.`,
      status: error.status,
      code: "rate_limit_exceeded",
    };
  }

  return {
    message: "Unexpected proxy error.",
    status: 500,
    code: "unexpected_error",
  };
}
