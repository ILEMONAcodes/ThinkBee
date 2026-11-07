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

  it.each([
    ["public/icons/icon-192.png", "../assets/app-icons/icon-192.png"],
    ["public/icons/icon-512.png", "../assets/app-icons/icon-512.png"],
    ["public/icons/maskable-192.png", "../assets/app-icons/maskable-192.png"],
    ["public/icons/maskable-512.png", "../assets/app-icons/maskable-512.png"],
    ["public/brand/thinkbee-wordmark.svg", "../assets/wordmark/thinkbee-wordmark.svg"],
    ["public/brand/thinkbee-short.svg", "../assets/short-form/thinkbee-short.svg"],
  ])("keeps %s synced with the supplied brand kit", (webPath, assetPath) => {
    expect(readProjectFile(webPath)).toBe(readProjectFile(assetPath));
  });
});
