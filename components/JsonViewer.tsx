"use client";

import { useRef, useState } from "react";

import { FullscreenButton } from "@/components/FullscreenButton";
import { highlightJson } from "@/components/SyntaxHighlight";
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
  const panelRef = useRef<HTMLElement | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const isError = Boolean(error);
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
    <section ref={panelRef} className={`panel json-panel${isError ? " is-error" : ""}`} aria-label="JSON viewer">
      <div className="panel-header">
        <div>
          <p className="section-label">Raw response</p>
          <h2>{isError ? "Fetch details" : "Response sample"}</h2>
          <div className="meta-row" aria-label="Response metadata">
            <span className={`status-pill ${isError ? "error" : "success"}`}>
              {result ? `${result.meta.status}` : error ? `${error.status}` : "Ready"}
            </span>
            {result ? <span>{result.meta.timeMs}ms</span> : null}
            {result?.meta.contentType ? <span>{result.meta.contentType}</span> : null}
          </div>
        </div>
        <div className="panel-actions">
          <button className="button secondary" type="button" onClick={handleCopy} aria-live="polite">
            {copyStatus === "copied" ? "Copied" : copyStatus === "failed" ? "Copy failed" : "Copy JSON"}
          </button>
        </div>
      </div>
      <div className="code-frame">
        <FullscreenButton targetRef={panelRef} label="raw response" />
        <pre className="json-code" tabIndex={0}>
          <code>{highlightJson(json)}</code>
        </pre>
      </div>
    </section>
  );
}
