import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("shared design assets", () => {
  it("keeps the web token copy in sync with the design source", () => {
    expect(readProjectFile("styles/tokens.css")).toBe(readProjectFile("../design/tokens.css"));
  });

  it("keeps the web motion copy in sync with the design source", () => {
    expect(readProjectFile("lib/motion.ts")).toBe(readProjectFile("../design/motion.ts"));
  });
});
