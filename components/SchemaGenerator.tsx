"use client";

import { useState } from "react";

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
    <section className="panel schema-panel" aria-label="Schema and model generator">
      <div className="panel-header">
        <div>
          <p className="section-label">Inferred JSON Schema</p>
          <p className="panel-copy">Generated from the fetched response sample.</p>
        </div>
        <button className="button secondary" type="button" onClick={copySchema}>
          {schemaCopyStatus === "copied" ? "Copied" : schemaCopyStatus === "failed" ? "Copy failed" : "Copy schema"}
        </button>
      </div>

      <pre className="json-code schema-code">
        <code>{schemaJson}</code>
      </pre>

      <div className="model-tools">
        <div className="row">
          <label className="sr-only" htmlFor="model-language">
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
          <button className="button secondary" type="button" onClick={copyCode}>
            {codeCopyStatus === "copied" ? "Copied" : codeCopyStatus === "failed" ? "Copy failed" : "Copy code"}
          </button>
        </div>

        <pre className="model-code">
          <code>{code}</code>
        </pre>
      </div>
    </section>
  );
}
