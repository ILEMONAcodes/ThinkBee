import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

type MockServer = {
  close: () => void;
  listen: (options: { onUnhandledRequest: "error" }) => void;
  resetHandlers: () => void;
};

type Manifest = {
  operations: Array<{ method: string; path: string; status: number }>;
};

const generatedDirectory = resolve(process.cwd(), "mocks/generated");
const generatedServerPath = resolve(generatedDirectory, "server.mjs");
const generatedMocksExist = existsSync(generatedServerPath);
let server: MockServer | undefined;

describe.runIf(generatedMocksExist)("generated OpenAPI mocks", () => {
  beforeAll(async () => {
    const moduleUrl = pathToFileURL(generatedServerPath).href;
    const generatedModule: unknown = await import(/* @vite-ignore */ moduleUrl);
    const candidate = (generatedModule as { server?: MockServer }).server;
    if (!candidate) throw new Error("The generated MSW server does not export a server.");
    server = candidate;
    server.listen({ onUnhandledRequest: "error" });
  });

  afterEach(() => server?.resetHandlers());
  afterAll(() => server?.close());

  it("covers every operation in the exported OpenAPI schema", () => {
    const schema = JSON.parse(
      readFileSync(resolve(process.cwd(), "lib/api/openapi.json"), "utf8"),
    ) as { paths: Record<string, Record<string, unknown>> };
    const manifest = JSON.parse(
      readFileSync(resolve(generatedDirectory, "manifest.json"), "utf8"),
    ) as Manifest;
    const operationCount = Object.values(schema.paths).reduce(
      (count, pathItem) =>
        count + ["delete", "get", "patch", "post", "put"].filter((method) => pathItem[method]).length,
      0,
    );

    expect(manifest.operations).toHaveLength(operationCount);
  });

  it("returns schema-shaped health responses", async () => {
    const response = await fetch("http://localhost:8000/health/live");
    const body: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "string" });
  });

  it("fails requests that are not present in the OpenAPI schema", async () => {
    await expect(fetch("http://localhost:8000/not-in-schema")).rejects.toThrow();
  });
});
