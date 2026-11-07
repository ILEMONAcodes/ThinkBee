// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";

import ErrorPage from "@/app/(main)/error";
import messages from "@/messages/en.json";

let root: Root | undefined;
const environment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean };
environment.IS_REACT_ACT_ENVIRONMENT = true;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
});

it("offers retry without exposing raw error details", async () => {
  const reset = vi.fn();
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(
      <NextIntlClientProvider locale="en-NG" messages={messages}>
        <ErrorPage error={new Error("Private server details")} reset={reset} />
      </NextIntlClientProvider>,
    );
  });
  expect(host.textContent).toContain("This page could not load");
  expect(host.textContent).not.toContain("Private server details");
  await act(async () => host.querySelector("button")?.click());
  expect(reset).toHaveBeenCalledOnce();
  await act(async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    window.dispatchEvent(new Event("offline"));
  });
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("Reconnect");
});
