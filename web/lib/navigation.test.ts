import { describe, expect, it } from "vitest";

import { isNavigationItemActive } from "@/lib/navigation";

describe("isNavigationItemActive", () => {
  it("matches only the exact home route", () => {
    expect(isNavigationItemActive("/", "/")).toBe(true);
    expect(isNavigationItemActive("/records", "/")).toBe(false);
  });

  it("matches a section and its nested routes", () => {
    expect(isNavigationItemActive("/chats", "/chats")).toBe(true);
    expect(isNavigationItemActive("/chats/space-1", "/chats")).toBe(true);
    expect(isNavigationItemActive("/records", "/chats")).toBe(false);
  });
});
