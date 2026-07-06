import type { ReactNode } from "react";

export function highlightJson(json: string): ReactNode[] {
  const tokenPattern = /("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"\s*:?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g;

  return highlightTokens(json, tokenPattern, jsonTokenClassName);
}

export function highlightModelCode(code: string): ReactNode[] {
  const tokenPattern = /(`[^`]*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#\[[^\n\]]*\]|@[A-Za-z_]\w*|\/\/[^\n]*|#[^\n]*|\b(?:export|interface|type|struct|pub|use|from|import|class|dataclass|as|None|pass)\b|\b(?:string|number|boolean|unknown|null|Array|Record|any|bool|int|float64|map|i64|f64|String|Vec|Option|Value|Deserialize|Serialize|Any|list|dict|str|float)\b|-?\b\d+(?:\.\d+)?\b)/g;

  return highlightTokens(code, tokenPattern, modelTokenClassName);
}

function highlightTokens(source: string, tokenPattern: RegExp, classNameForToken: (token: string) => string): ReactNode[] {
  const tokens: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(source)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(source.slice(lastIndex, match.index));
    }

    const token = match[0];
    tokens.push(
      <span className={classNameForToken(token)} key={`${match.index}-${token}`}>
        {token}
      </span>,
    );
    lastIndex = tokenPattern.lastIndex;
  }

  if (lastIndex < source.length) {
    tokens.push(source.slice(lastIndex));
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

function modelTokenClassName(token: string): string {
  if (token.startsWith("#[") || token.startsWith("@")) {
    return "code-attribute";
  }

  if (token.startsWith("//") || token.startsWith("#")) {
    return "code-comment";
  }

  if (token.startsWith('"') || token.startsWith("'") || token.startsWith("`")) {
    return "code-string";
  }

  if (/^-?\d/.test(token)) {
    return "code-number";
  }

  if (MODEL_TYPE_TOKENS.has(token)) {
    return "code-type";
  }

  return "code-keyword";
}

const MODEL_TYPE_TOKENS = new Set([
  "string",
  "number",
  "boolean",
  "unknown",
  "null",
  "Array",
  "Record",
  "any",
  "bool",
  "int",
  "float64",
  "map",
  "i64",
  "f64",
  "String",
  "Vec",
  "Option",
  "Value",
  "Deserialize",
  "Serialize",
  "Any",
  "list",
  "dict",
  "str",
  "float",
]);
