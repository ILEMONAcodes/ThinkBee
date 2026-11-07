import { describe, expect, it } from "vitest";

import { isImmersiveRoute, isNavigationItemActive } from "@/lib/navigation";

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

  it("hides navigation inside flows without hiding their parent sections", () => {
    expect(isImmersiveRoute("/scan")).toBe(true);
    expect(isImmersiveRoute("/scan/review")).toBe(true);
    expect(isImmersiveRoute("/chats/room-1")).toBe(true);
    expect(isImmersiveRoute("/chats")).toBe(false);
    expect(isImmersiveRoute("/records")).toBe(false);
    expect(isImmersiveRoute("/scanning")).toBe(false);
  });
});
