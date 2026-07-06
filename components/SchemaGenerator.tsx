"use client";

import { useRef, useState } from "react";

import { FullscreenButton } from "@/components/FullscreenButton";
import { highlightJson, highlightModelCode } from "@/components/SyntaxHighlight";
import {
  generateTypeDefinitions,
  MODEL_LANGUAGES,
  type JsonSchema,
  type ModelLanguage,
} from "@/lib/schema";

type SchemaGeneratorProps = {
  schema: JsonSchema;
};

export function SchemaGenerator({ schema }: SchemaGeneratorProps) {
  const schemaPanelRef = useRef<HTMLElement | null>(null);
  const modelPanelRef = useRef<HTMLElement | null>(null);
  const [language, setLanguage] = useState<ModelLanguage>("typescript");
  const [schemaCopyStatus, setSchemaCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [codeCopyStatus, setCodeCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const schemaJson = JSON.stringify(schema, null, 2);
  const code = generateTypeDefinitions(schema, language);

  async function copySchema() {
    try {
      await navigator.clipboard.writeText(schemaJson);
      setSchemaCopyStatus("copied");
    } catch {
      setSchemaCopyStatus("failed");
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCodeCopyStatus("copied");
    } catch {
      setCodeCopyStatus("failed");
    }
  }

  return (
    <section className="schema-stack" aria-label="Schema and model generator">
      <article ref={schemaPanelRef} className="panel schema-panel">
        <div className="panel-header">
          <div>
            <p className="section-label">Generated schema</p>
            <h2>JSON Schema</h2>
          </div>
          <div className="panel-actions">
            <button className="button secondary" type="button" onClick={copySchema} aria-live="polite">
              {schemaCopyStatus === "copied" ? "Copied" : schemaCopyStatus === "failed" ? "Copy failed" : "Copy schema"}
            </button>
          </div>
        </div>

        <div className="code-frame">
          <FullscreenButton targetRef={schemaPanelRef} label="JSON Schema" />
          <pre className="json-code schema-code" tabIndex={0}>
            <code>{highlightJson(schemaJson)}</code>
          </pre>
        </div>
      </article>

      <article ref={modelPanelRef} className="panel model-panel">
        <div className="model-toolbar">
          <div className="field">
            <label className="field-label" htmlFor="model-language">
              Model language
            </label>
            <select
              id="model-language"
              className="select"
              value={language}
              onChange={(event) => {
                setLanguage(event.target.value as ModelLanguage);
                setCodeCopyStatus("idle");
              }}
            >
              {MODEL_LANGUAGES.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="panel-actions">
            <button className="button secondary" type="button" onClick={copyCode} aria-live="polite">
              {codeCopyStatus === "copied" ? "Copied" : codeCopyStatus === "failed" ? "Copy failed" : "Copy code"}
            </button>
          </div>
        </div>

        <div className="code-frame">
          <FullscreenButton targetRef={modelPanelRef} label="generated model" />
          <pre className="model-code" tabIndex={0}>
            <code>{highlightModelCode(code)}</code>
          </pre>
        </div>
      </article>
    </section>
  );
}
