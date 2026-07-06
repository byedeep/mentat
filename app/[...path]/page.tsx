import { headers } from "next/headers";

import { JsonViewer } from "@/components/JsonViewer";
import { LanguageSelect } from "@/components/LanguageSelect";
import { UrlInput } from "@/components/UrlInput";
import { getClientIdentifier } from "@/lib/clientIp";
import { fetchTarget, FetchTargetError, type FetchTargetResult } from "@/lib/fetchTarget";
import { getRateLimitFromEnv, RateLimitExceededError } from "@/lib/rateLimit";

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
        limit: getRateLimitFromEnv("RATE_LIMIT_PROXY_PER_MINUTE", 20),
        prefix: "proxy",
      },
    });
  } catch (caughtError) {
    error = toPageError(caughtError);
  }

  const displayUrl = result?.meta.requestedUrl ?? requestedPath;

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">API Peek</p>
        <h1>{error ? "Could not fetch that API." : "Fetched API response."}</h1>
        <p className="lede">Target: {displayUrl}</p>
      </section>

      <UrlInput initialValue={displayUrl} buttonLabel="Fetch another" key={displayUrl} />
      {result ? <LanguageSelect url={result.meta.requestedUrl} key={result.meta.requestedUrl} /> : null}
      {error ? (
        <section className="panel" aria-label="Request error">
          <strong>{error.status}</strong>
          <p className="lede">{error.message}</p>
        </section>
      ) : null}
      <JsonViewer requestedUrl={displayUrl} result={result} error={error} />
    </main>
  );
}

function buildTarget(path: string[], searchParams: Record<string, string | string[] | undefined>) {
  const targetPath =
    path[0] === "http:" || path[0] === "https:"
      ? `${path[0]}//${path.slice(1).join("/")}`
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
