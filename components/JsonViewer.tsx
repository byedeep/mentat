"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import type { FetchTargetResult } from "@/lib/fetchTarget";

type JsonViewerProps = {
  requestedUrl?: string;
  result?: FetchTargetResult;
  error?: {
    message: string;
    status: number;
    code?: string;
  };
};

export function JsonViewer({ requestedUrl = "https://api.example.com/users", result, error }: JsonViewerProps) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const payload = error
    ? {
        error: error.message,
        status: error.status,
        code: error.code,
        requestedUrl,
      }
    : result ?? {
        meta: {
          requestedUrl,
          status: 200,
        },
        data: [],
      };
  const json = JSON.stringify(payload, null, 2);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(json);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  return (
    <section className="panel json-panel" aria-label="JSON viewer">
      <div className="panel-header">
        <div>
          <p className="section-label">Response sample</p>
          <div className="meta-row" aria-label="Response metadata">
            <span>{result ? `${result.meta.status}` : error ? `${error.status}` : "Ready"}</span>
            {result ? <span>{result.meta.timeMs}ms</span> : null}
            {result?.meta.contentType ? <span>{result.meta.contentType}</span> : null}
          </div>
        </div>
        <button className="button secondary" type="button" onClick={handleCopy}>
          {copyStatus === "copied" ? "Copied" : copyStatus === "failed" ? "Copy failed" : "Copy JSON"}
        </button>
      </div>
      <pre className="json-code">
        <code>{highlightJson(json)}</code>
      </pre>
    </section>
  );
}

function highlightJson(json: string): ReactNode[] {
  const tokenPattern = /("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"\s*:?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g;
  const tokens: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(json)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(json.slice(lastIndex, match.index));
    }

    const token = match[0];
    tokens.push(
      <span className={jsonTokenClassName(token)} key={`${match.index}-${token}`}>
        {token}
      </span>,
    );
    lastIndex = tokenPattern.lastIndex;
  }

  if (lastIndex < json.length) {
    tokens.push(json.slice(lastIndex));
  }

  return tokens;
}

function jsonTokenClassName(token: string): string {
  if (token.endsWith(":")) {
    return "json-key";
  }

  if (token.startsWith('"')) {
    return "json-string";
  }

  if (token === "true" || token === "false") {
    return "json-boolean";
  }

  if (token === "null") {
    return "json-null";
  }

  return "json-number";
}
