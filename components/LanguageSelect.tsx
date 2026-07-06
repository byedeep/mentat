"use client";

import { type FormEvent, useState } from "react";

type LanguageSelectProps = {
  url: string;
};

type SnippetResponse = {
  code?: string;
  error?: string;
  retryAfterSeconds?: number;
};

const LANGUAGES = [
  { value: "curl", label: "curl" },
  { value: "python", label: "Python" },
  { value: "javascript", label: "JS fetch" },
  { value: "node:axios", label: "Node axios" },
  { value: "go", label: "Go" },
  { value: "php", label: "PHP" },
  { value: "java", label: "Java" },
  { value: "rust", label: "Rust" },
];

export function LanguageSelect({ url }: LanguageSelectProps) {
  const [language, setLanguage] = useState("curl");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setCopyStatus("idle");

    try {
      const response = await fetch("/api/snippet", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ url, language }),
      });
      const body = (await response.json()) as SnippetResponse;

      if (!response.ok || !body.code) {
        const retryMessage = body.retryAfterSeconds
          ? ` Try again in ${body.retryAfterSeconds} seconds.`
          : "";
        throw new Error(`${body.error ?? "Could not generate snippet."}${retryMessage}`);
      }

      setCode(body.code);
    } catch (caughtError) {
      setCode("");
      setError(caughtError instanceof Error ? caughtError.message : "Could not generate snippet.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  return (
    <section className="panel" aria-label="Snippet language">
      <form className="row" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="snippet-language">
          Convert to
        </label>
        <select
          id="snippet-language"
          className="select"
          value={language}
          onChange={(event) => {
            setLanguage(event.target.value);
            setCode("");
            setError("");
            setCopyStatus("idle");
          }}
        >
          {LANGUAGES.map((option) => (
            <option value={option.value} key={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button className="button" type="submit" disabled={isLoading}>
          {isLoading ? "Generating..." : "Generate snippet"}
        </button>
      </form>

      {error ? <p className="form-error">{error}</p> : null}

      {code ? (
        <div className="snippet-block">
          <div className="panel-header compact">
            <p className="section-label">Snippet</p>
            <button className="button secondary" type="button" onClick={handleCopy}>
              {copyStatus === "copied" ? "Copied" : copyStatus === "failed" ? "Copy failed" : "Copy code"}
            </button>
          </div>
          <pre className="snippet-code">
            <code>{code}</code>
          </pre>
        </div>
      ) : null}
    </section>
  );
}
