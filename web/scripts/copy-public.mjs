import fs from "fs-extra";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = join(fileURLToPath(import.meta.url), "..", "..");
const publicDir = join(__dirname, "public");
const standaloneDir = join(__dirname, ".next", "standalone");
const targetDir = join(standaloneDir, "public");
const staticSourceDir = join(__dirname, ".next", "static");
const staticTargetDir = join(standaloneDir, ".next", "static");

if (fs.existsSync(publicDir)) {
  fs.copySync(publicDir, targetDir);
  console.log("Copied public/ to .next/standalone/public/");
} else {
  console.warn("public/ directory not found, skipping copy");
}

if (fs.existsSync(staticSourceDir)) {
  fs.copySync(staticSourceDir, staticTargetDir);
  console.log("Copied .next/static/ to .next/standalone/.next/static/");
} else {
  console.warn(".next/static/ directory not found, skipping copy");
}