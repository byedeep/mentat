export type JsonSchemaType = "array" | "boolean" | "integer" | "null" | "number" | "object" | "string";

export type JsonSchema = {
  $schema?: string;
  title?: string;
  type?: JsonSchemaType | JsonSchemaType[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  additionalProperties?: boolean;
};

export type ModelLanguage = "go" | "python" | "rust" | "typescript";

export const MODEL_LANGUAGES: { value: ModelLanguage; label: string }[] = [
  { value: "typescript", label: "TypeScript" },
  { value: "go", label: "Go structs" },
  { value: "rust", label: "Rust structs" },
  { value: "python", label: "Python dataclasses" },
];

const TYPE_ORDER: JsonSchemaType[] = ["null", "boolean", "integer", "number", "string", "array", "object"];
const TS_RESERVED = new Set(["any", "boolean", "class", "export", "extends", "interface", "number", "string", "type"]);
const PY_RESERVED = new Set([
  "and",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "class",
  "continue",
  "def",
  "del",
  "elif",
  "else",
  "except",
  "false",
  "finally",
  "for",
  "from",
  "global",
  "if",
  "import",
  "in",
  "is",
  "lambda",
  "none",
  "nonlocal",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "true",
  "try",
  "while",
  "with",
  "yield",
]);
const RUST_RESERVED = new Set([
  "as",
  "async",
  "await",
  "break",
  "const",
  "continue",
  "crate",
  "dyn",
  "else",
  "enum",
  "extern",
  "false",
  "fn",
  "for",
  "if",
  "impl",
  "in",
  "let",
  "loop",
  "match",
  "mod",
  "move",
  "mut",
  "pub",
  "ref",
  "return",
  "self",
  "static",
  "struct",
  "super",
  "trait",
  "true",
  "type",
  "unsafe",
  "use",
  "where",
  "while",
]);

export function inferJsonSchema(data: unknown, title = "ApiResponse"): JsonSchema {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title,
    ...inferValueSchema(data),
  };
}

export function generateTypeDefinitions(schema: JsonSchema, language: string, rootName = schema.title ?? "ApiResponse"): string {
  const typeName = toPascalCase(rootName, "ApiResponse");

  switch (resolveModelLanguage(language)) {
    case "typescript":
      return generateTypeScript(schema, typeName);
    case "go":
      return generateGo(schema, typeName);
    case "rust":
      return generateRust(schema, typeName);
    case "python":
      return generatePython(schema, typeName);
  }
}

export function resolveModelLanguage(language: string): ModelLanguage {
  const normalized = language.trim().toLowerCase();

  if (normalized === "ts" || normalized === "typescript") {
    return "typescript";
  }

  if (normalized === "go" || normalized === "golang") {
    return "go";
  }

  if (normalized === "rust" || normalized === "rs") {
    return "rust";
  }

  if (normalized === "python" || normalized === "py") {
    return "python";
  }

  throw new Error(`Unsupported model language: ${language}.`);
}

function inferValueSchema(value: unknown): JsonSchema {
  if (value === null) {
    return { type: "null" };
  }

  if (Array.isArray(value)) {
    return {
      type: "array",
      items: value.length > 0 ? mergeSchemas(value.map(inferValueSchema)) : {},
    };
  }

  switch (typeof value) {
    case "boolean":
      return { type: "boolean" };
    case "number":
      return { type: Number.isInteger(value) ? "integer" : "number" };
    case "string":
      return { type: "string" };
    case "object": {
      const properties: Record<string, JsonSchema> = {};

      for (const [key, propertyValue] of Object.entries(value as Record<string, unknown>)) {
        properties[key] = inferValueSchema(propertyValue);
      }

      return {
        type: "object",
        properties,
        required: Object.keys(properties),
        additionalProperties: false,
      };
    }
    default:
      return {};
  }
}

function mergeSchemas(schemas: JsonSchema[]): JsonSchema {
  return schemas.reduce<JsonSchema>((merged, schema) => mergeSchemaPair(merged, schema), {});
}

function mergeSchemaPair(left: JsonSchema, right: JsonSchema): JsonSchema {
  const leftTypes = schemaTypes(left);
  const rightTypes = schemaTypes(right);

  if (leftTypes.length === 0) {
    return right;
  }

  if (rightTypes.length === 0) {
    return left;
  }

  const nullable = leftTypes.includes("null") || rightTypes.includes("null");
  const nonNullTypes = normalizeTypeSet(new Set([...leftTypes, ...rightTypes].filter((type) => type !== "null")));

  if (nonNullTypes.length === 1) {
    const [type] = nonNullTypes;
    const merged = mergeSchemaDetails(left, right, type);
    return withSchemaTypes(merged, nullable ? [type, "null"] : [type]);
  }

  return { type: nullable ? normalizeTypeSet(new Set([...nonNullTypes, "null"])) : nonNullTypes };
}

function mergeSchemaDetails(left: JsonSchema, right: JsonSchema, type: JsonSchemaType): JsonSchema {
  if (type === "object") {
    return mergeObjectSchemas(left, right);
  }

  if (type === "array") {
    return mergeArraySchemas(left, right);
  }

  return { type };
}

function mergeObjectSchemas(left: JsonSchema, right: JsonSchema): JsonSchema {
  const leftHasObject = hasSchemaType(left, "object");
  const rightHasObject = hasSchemaType(right, "object");

  if (!leftHasObject) {
    return objectDetails(right);
  }

  if (!rightHasObject) {
    return objectDetails(left);
  }

  const leftProperties = left.properties ?? {};
  const rightProperties = right.properties ?? {};
  const properties: Record<string, JsonSchema> = {};
  const propertyNames = new Set([...Object.keys(leftProperties), ...Object.keys(rightProperties)]);
  const leftRequired = new Set(left.required ?? []);
  const rightRequired = new Set(right.required ?? []);

  for (const propertyName of propertyNames) {
    const leftProperty = leftProperties[propertyName];
    const rightProperty = rightProperties[propertyName];

    if (leftProperty && rightProperty) {
      properties[propertyName] = mergeSchemaPair(leftProperty, rightProperty);
    } else {
      properties[propertyName] = leftProperty ?? rightProperty ?? {};
    }
  }

  return {
    type: "object",
    properties,
    required: [...propertyNames].filter((propertyName) => leftRequired.has(propertyName) && rightRequired.has(propertyName)),
    additionalProperties: false,
  };
}

function mergeArraySchemas(left: JsonSchema, right: JsonSchema): JsonSchema {
  const leftHasArray = hasSchemaType(left, "array");
  const rightHasArray = hasSchemaType(right, "array");

  if (!leftHasArray) {
    return { type: "array", items: right.items ?? {} };
  }

  if (!rightHasArray) {
    return { type: "array", items: left.items ?? {} };
  }

  return {
    type: "array",
    items: mergeSchemaPair(left.items ?? {}, right.items ?? {}),
  };
}

function objectDetails(schema: JsonSchema): JsonSchema {
  return {
    type: "object",
    properties: schema.properties ?? {},
    required: schema.required ?? [],
    additionalProperties: schema.additionalProperties ?? false,
  };
}

function schemaTypes(schema: JsonSchema): JsonSchemaType[] {
  if (Array.isArray(schema.type)) {
    return schema.type;
  }

  if (schema.type) {
    return [schema.type];
  }

  if (schema.properties) {
    return ["object"];
  }

  if (schema.items) {
    return ["array"];
  }

  return [];
}

function hasSchemaType(schema: JsonSchema, type: JsonSchemaType): boolean {
  return schemaTypes(schema).includes(type);
}

function isNullableSchema(schema: JsonSchema): boolean {
  return hasSchemaType(schema, "null");
}

function isSingleNonNullType(schema: JsonSchema, type: JsonSchemaType): boolean {
  const types = schemaTypes(schema);
  return types.length === 1 && types[0] === type;
}

function nonNullSchemaTypes(schema: JsonSchema): JsonSchemaType[] {
  return normalizeTypeSet(new Set(schemaTypes(schema).filter((type) => type !== "null")));
}

function normalizeTypeSet(types: Set<JsonSchemaType>): JsonSchemaType[] {
  const normalized = new Set(types);

  if (normalized.has("number") && normalized.has("integer")) {
    normalized.delete("integer");
  }

  return TYPE_ORDER.filter((type) => normalized.has(type));
}

function withSchemaTypes(schema: JsonSchema, types: JsonSchemaType[]): JsonSchema {
  const orderedTypes = normalizeTypeSet(new Set(types));
  return {
    ...schema,
    type: orderedTypes.length === 1 ? orderedTypes[0] : orderedTypes,
  };
}

function generateTypeScript(schema: JsonSchema, rootName: string): string {
  const declarations: string[] = [];
  const usedNames = new Set<string>();

  if (isSingleNonNullType(schema, "object")) {
    collectTypeScriptInterface(schema, rootName, declarations, usedNames);
    return declarations.join("\n\n");
  }

  const rootType = typeScriptType(schema, `${rootName}Value`, declarations, usedNames);
  return [...declarations, `export type ${rootName} = ${rootType};`].join("\n\n");
}

function collectTypeScriptInterface(
  schema: JsonSchema,
  requestedName: string,
  declarations: string[],
  usedNames: Set<string>,
): string {
  const typeName = uniqueTypeName(toPascalCase(requestedName, "Model"), usedNames);
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const lines = Object.entries(properties).map(([propertyName, propertySchema]) => {
    const optional = required.has(propertyName) ? "" : "?";
    const propertyType = typeScriptType(propertySchema, `${typeName}${toPascalCase(propertyName, "Field")}`, declarations, usedNames);
    return `  ${typeScriptPropertyName(propertyName)}${optional}: ${propertyType};`;
  });

  declarations.push(`export interface ${typeName} {\n${lines.length > 0 ? lines.join("\n") : "  [key: string]: never;"}\n}`);
  return typeName;
}

function typeScriptType(schema: JsonSchema, requestedName: string, declarations: string[], usedNames: Set<string>): string {
  const nullable = isNullableSchema(schema);
  const baseType = typeScriptNonNullType(schema, requestedName, declarations, usedNames);

  return nullable && baseType !== "unknown" ? `${baseType} | null` : baseType;
}

function typeScriptNonNullType(schema: JsonSchema, requestedName: string, declarations: string[], usedNames: Set<string>): string {
  const types = nonNullSchemaTypes(schema);

  if (types.length !== 1) {
    return "unknown";
  }

  switch (types[0]) {
    case "boolean":
      return "boolean";
    case "integer":
    case "number":
      return "number";
    case "string":
      return "string";
    case "array":
      return `Array<${typeScriptType(schema.items ?? {}, `${requestedName}Item`, declarations, usedNames)}>`;
    case "object":
      return Object.keys(schema.properties ?? {}).length > 0
        ? collectTypeScriptInterface(schema, requestedName, declarations, usedNames)
        : "Record<string, unknown>";
    default:
      return "unknown";
  }
}

function typeScriptPropertyName(name: string): string {
  if (/^[$A-Z_a-z][$\w]*$/.test(name) && !TS_RESERVED.has(name.toLowerCase())) {
    return name;
  }

  return JSON.stringify(name);
}

function generateGo(schema: JsonSchema, rootName: string): string {
  const declarations: string[] = [];
  const usedNames = new Set<string>();

  if (isSingleNonNullType(schema, "object")) {
    collectGoStruct(schema, rootName, declarations, usedNames);
    return declarations.join("\n\n");
  }

  const rootType = goType(schema, rootName, declarations, usedNames, false);
  return [...declarations, `type ${rootName} ${rootType}`].join("\n\n");
}

function collectGoStruct(schema: JsonSchema, requestedName: string, declarations: string[], usedNames: Set<string>): string {
  const typeName = uniqueTypeName(toPascalCase(requestedName, "Model"), usedNames);
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const usedFields = new Set<string>();
  const lines = Object.entries(properties).map(([propertyName, propertySchema]) => {
    const optional = !required.has(propertyName) || isNullableSchema(propertySchema);
    const fieldName = uniqueTypeName(toPascalCase(propertyName, "Field"), usedFields);
    const fieldType = goType(propertySchema, `${typeName}${fieldName}`, declarations, usedNames, optional);
    const tag = `json:"${propertyName}${optional ? ",omitempty" : ""}"`;
    return `  ${fieldName} ${fieldType} \`${tag}\``;
  });

  declarations.push(`type ${typeName} struct {\n${lines.join("\n")}\n}`);
  return typeName;
}

function goType(
  schema: JsonSchema,
  requestedName: string,
  declarations: string[],
  usedNames: Set<string>,
  optional: boolean,
): string {
  const baseType = goNonNullType(schema, requestedName, declarations, usedNames);

  if ((optional || isNullableSchema(schema)) && canGoPointer(baseType)) {
    return `*${baseType}`;
  }

  return baseType;
}

function goNonNullType(schema: JsonSchema, requestedName: string, declarations: string[], usedNames: Set<string>): string {
  const types = nonNullSchemaTypes(schema);

  if (types.length !== 1) {
    return "any";
  }

  switch (types[0]) {
    case "boolean":
      return "bool";
    case "integer":
      return "int";
    case "number":
      return "float64";
    case "string":
      return "string";
    case "array":
      return `[]${goType(schema.items ?? {}, `${requestedName}Item`, declarations, usedNames, false)}`;
    case "object":
      return Object.keys(schema.properties ?? {}).length > 0
        ? collectGoStruct(schema, requestedName, declarations, usedNames)
        : "map[string]any";
    default:
      return "any";
  }
}

function canGoPointer(typeName: string): boolean {
  return typeName !== "any" && !typeName.startsWith("[]") && !typeName.startsWith("map[");
}

function generateRust(schema: JsonSchema, rootName: string): string {
  const declarations: string[] = [];
  const usedNames = new Set<string>();

  if (isSingleNonNullType(schema, "object")) {
    collectRustStruct(schema, rootName, declarations, usedNames);
    return `use serde::{Deserialize, Serialize};\nuse serde_json::Value;\n\n${declarations.join("\n\n")}`;
  }

  const rootType = rustType(schema, rootName, declarations, usedNames);
  return `use serde::{Deserialize, Serialize};\nuse serde_json::Value;\n\n${[...declarations, `pub type ${rootName} = ${rootType};`].join("\n\n")}`;
}

function collectRustStruct(schema: JsonSchema, requestedName: string, declarations: string[], usedNames: Set<string>): string {
  const typeName = uniqueTypeName(toPascalCase(requestedName, "Model"), usedNames);
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const usedFields = new Set<string>();
  const lines = Object.entries(properties).flatMap(([propertyName, propertySchema]) => {
    const omitted = !required.has(propertyName);
    const nullable = isNullableSchema(propertySchema);
    const fieldName = uniqueTypeName(toSnakeCase(propertyName, "field"), usedFields);
    const baseType = rustNonNullType(propertySchema, `${typeName}${toPascalCase(propertyName, "Field")}`, declarations, usedNames);
    const fieldType = omitted || nullable ? `Option<${baseType}>` : baseType;
    const attributes: string[] = [];

    if (fieldName !== propertyName) {
      attributes.push(`  #[serde(rename = ${JSON.stringify(propertyName)})]`);
    }

    if (omitted) {
      attributes.push("  #[serde(default, skip_serializing_if = \"Option::is_none\")]");
    }

    return [...attributes, `  pub ${fieldName}: ${fieldType},`];
  });

  declarations.push(
    `#[derive(Debug, Clone, Serialize, Deserialize)]\npub struct ${typeName} {\n${lines.length > 0 ? lines.join("\n") : "  // Empty object"}\n}`,
  );
  return typeName;
}

function rustType(schema: JsonSchema, requestedName: string, declarations: string[], usedNames: Set<string>): string {
  const baseType = rustNonNullType(schema, requestedName, declarations, usedNames);
  return isNullableSchema(schema) ? `Option<${baseType}>` : baseType;
}

function rustNonNullType(schema: JsonSchema, requestedName: string, declarations: string[], usedNames: Set<string>): string {
  const types = nonNullSchemaTypes(schema);

  if (types.length !== 1) {
    return "Value";
  }

  switch (types[0]) {
    case "boolean":
      return "bool";
    case "integer":
      return "i64";
    case "number":
      return "f64";
    case "string":
      return "String";
    case "array":
      return `Vec<${rustType(schema.items ?? {}, `${requestedName}Item`, declarations, usedNames)}>`;
    case "object":
      return Object.keys(schema.properties ?? {}).length > 0
        ? collectRustStruct(schema, requestedName, declarations, usedNames)
        : "Value";
    default:
      return "Value";
  }
}

function generatePython(schema: JsonSchema, rootName: string): string {
  const declarations: string[] = [];
  const usedNames = new Set<string>();
  const imports = "from __future__ import annotations\n\nfrom dataclasses import dataclass\nfrom typing import Any";

  if (isSingleNonNullType(schema, "object")) {
    collectPythonDataclass(schema, rootName, declarations, usedNames);
    return `${imports}\n\n\n${declarations.join("\n\n")}`;
  }

  const rootType = pythonType(schema, rootName, declarations, usedNames);
  return `${imports}\n\n\n${[...declarations, `${rootName} = ${rootType}`].join("\n\n")}`;
}

function collectPythonDataclass(schema: JsonSchema, requestedName: string, declarations: string[], usedNames: Set<string>): string {
  const typeName = uniqueTypeName(toPascalCase(requestedName, "Model"), usedNames);
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const entries = Object.entries(properties).sort(([leftName], [rightName]) => {
    const leftOptional = !required.has(leftName) || isNullableSchema(properties[leftName]);
    const rightOptional = !required.has(rightName) || isNullableSchema(properties[rightName]);
    return Number(leftOptional) - Number(rightOptional);
  });
  const usedFields = new Set<string>();
  const lines = entries.flatMap(([propertyName, propertySchema]) => {
    const omitted = !required.has(propertyName);
    const nullable = isNullableSchema(propertySchema);
    const fieldName = uniqueTypeName(toSnakeCase(propertyName, "field"), usedFields);
    const baseType = pythonNonNullType(propertySchema, `${typeName}${toPascalCase(propertyName, "Field")}`, declarations, usedNames);
    const fieldType = omitted || nullable ? `${baseType} | None` : baseType;
    const suffix = omitted || nullable ? " = None" : "";
    const comment = fieldName !== propertyName ? `  # JSON field: ${propertyName}` : undefined;
    const line = `    ${fieldName}: ${fieldType}${suffix}`;
    return comment ? [comment, line] : [line];
  });

  declarations.push(`@dataclass\nclass ${typeName}:\n${lines.length > 0 ? lines.join("\n") : "    pass"}`);
  return typeName;
}

function pythonType(schema: JsonSchema, requestedName: string, declarations: string[], usedNames: Set<string>): string {
  const baseType = pythonNonNullType(schema, requestedName, declarations, usedNames);
  return isNullableSchema(schema) ? `${baseType} | None` : baseType;
}

function pythonNonNullType(schema: JsonSchema, requestedName: string, declarations: string[], usedNames: Set<string>): string {
  const types = nonNullSchemaTypes(schema);

  if (types.length !== 1) {
    return "Any";
  }

  switch (types[0]) {
    case "boolean":
      return "bool";
    case "integer":
      return "int";
    case "number":
      return "float";
    case "string":
      return "str";
    case "array":
      return `list[${pythonType(schema.items ?? {}, `${requestedName}Item`, declarations, usedNames)}]`;
    case "object":
      return Object.keys(schema.properties ?? {}).length > 0
        ? collectPythonDataclass(schema, requestedName, declarations, usedNames)
        : "dict[str, Any]";
    default:
      return "Any";
  }
}

function uniqueTypeName(requestedName: string, usedNames: Set<string>): string {
  let candidate = requestedName;
  let suffix = 2;

  while (usedNames.has(candidate)) {
    candidate = `${requestedName}${suffix}`;
    suffix += 1;
  }

  usedNames.add(candidate);
  return candidate;
}

function toPascalCase(value: string, fallback: string): string {
  const words = wordsFrom(value);
  const name = words.length > 0 ? words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join("") : fallback;
  const safeName = name.replace(/^[^A-Z_a-z]+/, "");

  return safeName || fallback;
}

function toSnakeCase(value: string, fallback: string): string {
  const words = wordsFrom(value);
  const name = words.length > 0 ? words.join("_").toLowerCase() : fallback;
  const safeName = name.replace(/^[^A-Za-z_]+/, "").replace(/[^A-Za-z0-9_]/g, "_") || fallback;

  if (PY_RESERVED.has(safeName) || RUST_RESERVED.has(safeName)) {
    return `${safeName}_`;
  }

  return safeName;
}

function wordsFrom(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
}
