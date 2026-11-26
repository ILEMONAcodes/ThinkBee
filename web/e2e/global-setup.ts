import { FullConfig } from "@playwright/test";

export default async function globalSetup(config: FullConfig) {
  console.log("=== Playwright Global Setup ===");
  console.log("Projects:", config.projects.map(p => p.name).join(", "));
  console.log("Test dir:", config.rootDir);
}