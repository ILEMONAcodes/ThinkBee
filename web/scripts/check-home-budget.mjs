import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const html = readFileSync(".next/server/app/index.html", "utf8");
const scripts = [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*>/g)];
const files = [...new Set(scripts
  .filter(([tag]) => !/\bnomodule\b/i.test(tag))
  .map(([, source]) => source)
  .filter((source) => source.startsWith("/_next/")))];
if (!files.length) throw new Error("No initial Home JavaScript found. Build the app first.");
const bytes = files.reduce((total, file) => (
  total + gzipSync(readFileSync(file.replace("/_next/", ".next/"))).length
), 0);
console.log(`Initial Home JavaScript: ${(bytes / 1000).toFixed(1)} KB gzipped (limit: 170 KB).`);
if (bytes >= 170_000) process.exitCode = 1;
