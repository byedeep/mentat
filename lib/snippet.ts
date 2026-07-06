import { HTTPSnippet, targets, type TargetId } from "httpsnippet";

import { resolveProtocol } from "./resolveProtocol";
import { assertPublicTarget } from "./ssrfGuard";

type SnippetTarget = {
  target: TargetId;
  client: string;
};

export type CreateSnippetInput = {
  url: string;
  language?: string;
};

export type CreateSnippetResult = {
  code: string;
  url: string;
  target: string;
  client: string;
};

const SNIPPET_TARGETS: Record<string, SnippetTarget> = {
  curl: { target: "shell", client: "curl" },
  javascript: { target: "javascript", client: "fetch" },
  js: { target: "javascript", client: "fetch" },
  node: { target: "node", client: "fetch" },
  python: { target: "python", client: "requests" },
  go: { target: "go", client: "native" },
  php: { target: "php", client: "curl" },
  java: { target: "java", client: "unirest" },
  rust: { target: "rust", client: "reqwest" },
};

export async function createSnippet({
  url,
  language = "curl",
}: CreateSnippetInput): Promise<CreateSnippetResult> {
  const requestedUrl = await normalizeUrl(url);
  const { target, client } = resolveSnippetTarget(language);
  const snippet = new HTTPSnippet({
    method: "GET",
    url: requestedUrl,
    httpVersion: "HTTP/1.1",
    headers: [{ name: "accept", value: "application/json" }],
    queryString: [],
    cookies: [],
    postData: undefined,
  });
  const code = snippet.convert(target, client, { indent: "  " });

  if (typeof code !== "string" || !code) {
    throw new Error(`Unable to generate a snippet for ${target}/${client}.`);
  }

  return {
    code,
    url: requestedUrl,
    target,
    client,
  };
}

async function normalizeUrl(url: string): Promise<string> {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    throw new Error("URL is required.");
  }

  const resolvedUrl = new URL(await resolveProtocol(trimmedUrl));

  if (resolvedUrl.protocol !== "http:" && resolvedUrl.protocol !== "https:") {
    throw new Error("Only HTTP and HTTPS targets are supported.");
  }

  await assertPublicTarget(resolvedUrl);

  return resolvedUrl.toString();
}

function resolveSnippetTarget(language: string): SnippetTarget {
  const normalizedLanguage = language.trim().toLowerCase();
  const mappedTarget = SNIPPET_TARGETS[normalizedLanguage];

  if (mappedTarget) {
    return mappedTarget;
  }

  const [target, client] = normalizedLanguage.split(":");

  if (target && client && target in targets) {
    return { target: target as TargetId, client };
  }

  throw new Error(`Unsupported snippet language: ${language}.`);
}
