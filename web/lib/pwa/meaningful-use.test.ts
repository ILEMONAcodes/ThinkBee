/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";

import {
  markPwaMeaningfulUse,
  PWA_MEANINGFUL_USE_EVENT,
  PWA_MEANINGFUL_USE_KEY,
} from "@/lib/pwa/meaningful-use";

describe("PWA meaningful use", () => {
  it("stores the qualifying action and notifies the install UI", () => {
    const listener = vi.fn();
    window.addEventListener(PWA_MEANINGFUL_USE_EVENT, listener);
    markPwaMeaningfulUse("sent_message");
    expect(localStorage.getItem(PWA_MEANINGFUL_USE_KEY)).toBe("sent_message");
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(PWA_MEANINGFUL_USE_EVENT, listener);
  });
});
