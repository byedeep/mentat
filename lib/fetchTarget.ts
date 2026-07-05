import { checkRateLimit } from "./rateLimit";
import { resolveProtocol } from "./resolveProtocol";
import { assertPublicTarget } from "./ssrfGuard";

export type FetchTargetInput = {
  target: string;
  timeoutMs?: number;
};

export type FetchTargetResult = {
  meta: {
    requestedUrl: string;
    status: number;
    timeMs: number;
    contentType: string | null;
  };
  data: unknown;
};

const DEFAULT_TIMEOUT_MS = 10_000;

export async function fetchTarget({
  target,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: FetchTargetInput): Promise<FetchTargetResult> {
  const trimmedTarget = target.trim();

  if (!trimmedTarget) {
    throw new Error("Target URL is required.");
  }

  const start = Date.now();

  await checkRateLimit();

  const resolvedTarget = await resolveProtocol(trimmedTarget);
  const requestedUrl = new URL(resolvedTarget);

  if (requestedUrl.protocol !== "http:" && requestedUrl.protocol !== "https:") {
    throw new Error("Only HTTP and HTTPS targets are supported.");
  }

  await assertPublicTarget(requestedUrl);

  const response = await fetch(requestedUrl, {
    method: "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      accept: "application/json, text/plain;q=0.9, */*;q=0.8",
    },
  });

  const contentType = response.headers.get("content-type");
  const data = await parseResponseBody(response, contentType);

  return {
    meta: {
      requestedUrl: requestedUrl.toString(),
      status: response.status,
      timeMs: Date.now() - start,
      contentType,
    },
    data,
  };
}

async function parseResponseBody(response: Response, contentType: string | null) {
  if (contentType?.toLowerCase().includes("json")) {
    return response.json();
  }

  return response.text();
}
