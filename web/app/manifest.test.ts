import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";

describe("PWA manifest", () => {
  it("uses the supplied Think Bee icons and required shortcuts", () => {
    const value = manifest();
    expect(value).toMatchObject({
      name: "Think Bee",
      short_name: "Think Bee",
      display: "standalone",
      start_url: "/",
      scope: "/",
      lang: "en-NG",
      theme_color: "#022C22",
      background_color: "#FAFAFA",
    });
    expect(value.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: "/icons/icon-192.png", purpose: "any" }),
      expect.objectContaining({ src: "/icons/icon-512.png", purpose: "any" }),
      expect.objectContaining({ src: "/icons/maskable-192.png", purpose: "maskable" }),
      expect.objectContaining({ src: "/icons/maskable-512.png", purpose: "maskable" }),
    ]));
    expect(value.shortcuts?.map((shortcut) => shortcut.url)).toEqual(["/scan", "/chats", "/records"]);
  });
});
