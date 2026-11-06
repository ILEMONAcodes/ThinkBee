import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HTTP_METHODS = ["delete", "get", "patch", "post", "put"];
const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = resolve(webRoot, "../api/openapi.json");
const outputDirectory = resolve(webRoot, "mocks/generated");
const schema = JSON.parse(readFileSync(schemaPath, "utf8"));

function resolveReference(reference) {
  return reference
    .replace(/^#\//, "")
    .split("/")
    .reduce((value, segment) => value?.[segment], schema);
}

function createExample(value, seenReferences = new Set()) {
  if (!value || typeof value !== "object") return null;
  if (value.example !== undefined) return value.example;
  if (value.default !== undefined) return value.default;
  if (Array.isArray(value.examples) && value.examples.length > 0) return value.examples[0];
  if (Array.isArray(value.enum) && value.enum.length > 0) return value.enum[0];
  if (value.const !== undefined) return value.const;

  if (value.$ref) {
    if (seenReferences.has(value.$ref)) return null;
    const resolved = resolveReference(value.$ref);
    return createExample(resolved, new Set([...seenReferences, value.$ref]));
  }

  const alternative = value.anyOf?.find((item) => item.type !== "null") ?? value.oneOf?.[0];
  if (alternative) return createExample(alternative, seenReferences);

  if (value.type === "object" || value.properties) {
    return Object.fromEntries(
      Object.entries(value.properties ?? {}).map(([key, property]) => [
        key,
        createExample(property, seenReferences),
      ]),
    );
  }
  if (value.type === "array") return [];
  if (value.type === "boolean") return false;
  if (value.type === "integer" || value.type === "number") return 0;
  if (value.type === "string") return "string";
  return null;
}

function responseFor(operation) {
  const responseEntries = Object.entries(operation.responses ?? {});
  const [statusText, response] =
    responseEntries.find(([status]) => /^2\d\d$/.test(status)) ?? responseEntries[0] ?? ["200", {}];
  const status = Number.parseInt(statusText, 10) || 200;
  const jsonSchema = response?.content?.["application/json"]?.schema;
  return { body: jsonSchema ? createExample(jsonSchema) : null, status };
}

const operations = [];
const handlerLines = [];

for (const [path, pathItem] of Object.entries(schema.paths ?? {})) {
  for (const method of HTTP_METHODS) {
    const operation = pathItem?.[method];
    if (!operation) continue;

    const { body, status } = responseFor(operation);
    const route = `*${path.replaceAll(/\{([^}]+)\}/g, ":$1")}`;
    const responseExpression =
      body === null
        ? `new HttpResponse(null, { status: ${status} })`
        : `HttpResponse.json(${JSON.stringify(body)}, { status: ${status} })`;

    handlerLines.push(
      `  http.${method}(${JSON.stringify(route)}, () => ${responseExpression}),`,
    );
    operations.push({ method: method.toUpperCase(), path, status });
  }
}

mkdirSync(outputDirectory, { recursive: true });
writeFileSync(
  resolve(outputDirectory, "handlers.mjs"),
  `import { http, HttpResponse } from "msw";\n\nexport const generatedHandlers = [\n${handlerLines.join("\n")}\n];\n`,
);
writeFileSync(
  resolve(outputDirectory, "server.mjs"),
  `import { setupServer } from "msw/node";\nimport { generatedHandlers } from "./handlers.mjs";\n\nexport const server = setupServer(...generatedHandlers);\n`,
);
writeFileSync(
  resolve(outputDirectory, "browser.mjs"),
  `import { setupWorker } from "msw/browser";\nimport { generatedHandlers } from "./handlers.mjs";\n\nexport const worker = setupWorker(...generatedHandlers);\n`,
);
writeFileSync(
  resolve(outputDirectory, "manifest.json"),
  `${JSON.stringify({ operations }, null, 2)}\n`,
);
