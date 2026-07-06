import { checkRateLimit, type RateLimitOptions, type RateLimitResult } from "./rateLimit";
import { resolveProtocol } from "./resolveProtocol";
import { assertPublicTarget } from "./ssrfGuard";

export type FetchTargetInput = {
  target: string;
  timeoutMs?: number;
  rateLimit?: RateLimitOptions | false;
};

export type FetchTargetResult = {
  meta: {
    requestedUrl: string;
    status: number;
    timeMs: number;
    contentType: string | null;
    rateLimit?: RateLimitResult;
  };
  data: unknown;
};

const DEFAULT_TIMEOUT_MS = 10_000;

export class FetchTargetError extends Error {
  status: number;
  code: string;
  rateLimit?: RateLimitResult;

  constructor(message: string, status: number, code: string, rateLimit?: RateLimitResult) {
    super(message);
    this.name = "FetchTargetError";
    this.status = status;
    this.code = code;
    this.rateLimit = rateLimit;
  }
}

export async function fetchTarget({
  target,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  rateLimit: rateLimitOptions,
}: FetchTargetInput): Promise<FetchTargetResult> {
  const trimmedTarget = target.trim();

  if (!trimmedTarget) {
    throw new FetchTargetError("Target URL is required.", 400, "missing_target");
  }

  const start = Date.now();
  const rateLimit =
    rateLimitOptions === false ? undefined : await checkRateLimit(rateLimitOptions);
  let requestedUrl: URL;

  try {
    const resolvedTarget = await resolveProtocol(trimmedTarget);
    requestedUrl = new URL(resolvedTarget);
  } catch (error) {
    throw classifyTargetError(error, rateLimit);
  }

  if (requestedUrl.protocol !== "http:" && requestedUrl.protocol !== "https:") {
    throw new FetchTargetError(
      "Only HTTP and HTTPS targets are supported.",
      400,
      "unsupported_protocol",
      rateLimit,
    );
  }

  try {
    await assertPublicTarget(requestedUrl);
  } catch (error) {
    throw classifyTargetError(error, rateLimit);
  }

  let response: Response;

  try {
    response = await fetch(requestedUrl, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        accept: "application/json, text/plain;q=0.9, */*;q=0.8",
      },
    });
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new FetchTargetError("Target request timed out.", 504, "target_timeout", rateLimit);
    }

    throw new FetchTargetError("Target request failed.", 502, "target_fetch_failed", rateLimit);
  }

  const contentType = response.headers.get("content-type");
  const data = await parseResponseBody(response, contentType);

  return {
    meta: {
      requestedUrl: requestedUrl.toString(),
      status: response.status,
      timeMs: Date.now() - start,
      contentType,
      rateLimit,
    },
    data,
  };
}

async function parseResponseBody(response: Response, contentType: string | null) {
  const body = await response.text();

  if (contentType?.toLowerCase().includes("json")) {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }

  return body;
}

function classifyTargetError(error: unknown, rateLimit?: RateLimitResult): FetchTargetError {
  const message = error instanceof Error ? error.message : "Invalid target URL.";

  if (/private|reserved/i.test(message)) {
    return new FetchTargetError(message, 403, "blocked_target", rateLimit);
  }

  if (/resolve|ENOTFOUND|EAI_AGAIN/i.test(message)) {
    return new FetchTargetError(message, 400, "unresolvable_target", rateLimit);
  }

  return new FetchTargetError("Invalid target URL.", 400, "invalid_target", rateLimit);
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}
