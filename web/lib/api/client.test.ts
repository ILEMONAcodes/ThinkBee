import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { accountApi, apiRequest } from "@/lib/api/client";
import { AppError } from "@/lib/api/errors";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/lib/auth/client", () => ({ getSupabase: () => ({ auth: { getSession } }) }));
const server = setupServer();
beforeAll(() => { vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test/api/v1"); server.listen({ onUnhandledRequest: "error" }); });
afterEach(() => { server.resetHandlers(); getSession.mockReset(); vi.restoreAllMocks(); });
afterAll(() => { server.close(); vi.unstubAllEnvs(); });
const session = { data: { session: { access_token: "synthetic-token", user: { id: "owner" } } }, error: null };

it("attaches the SDK session at request time", async () => {
  getSession.mockResolvedValue(session);
  server.use(http.post("http://api.test/api/v1/auth/bootstrap", ({ request }) => {
    expect(request.headers.get("authorization")).toBe("Bearer synthetic-token");
    return HttpResponse.json({ ok: true });
  }));
  expect(await apiRequest("/auth/bootstrap", "owner", "POST")).toEqual({ ok: true });
});
it("refuses a queued write under a different account", async () => {
  getSession.mockResolvedValue(session);
  await expect(apiRequest("/farms", "other", "POST", {})).rejects.toMatchObject({ code: "account_changed" });
});
it("discards a response when sign-out happens during the request", async () => {
  getSession.mockResolvedValueOnce(session).mockResolvedValueOnce({ data: { session: null } });
  server.use(http.get("http://api.test/api/v1/me", () => HttpResponse.json({ private: "profile" })));
  await expect(apiRequest("/me", "owner")).rejects.toMatchObject({ code: "account_changed" });
});
it("maps error envelopes without exposing server error text", async () => {
  getSession.mockResolvedValue(session);
  server.use(http.get("http://api.test/api/v1/me", () => HttpResponse.json({ error: { code: "account_suspended", message: "private details" } }, { status: 403 })));
  await expect(apiRequest("/me", "owner")).rejects.toEqual(new AppError("account_suspended", 403));
});

it("reports an expired account-startup deadline without clearing the SDK session", async () => {
  getSession.mockResolvedValue(session);
  const controller = new AbortController();
  controller.abort(new DOMException("Timed out", "TimeoutError"));
  vi.spyOn(AbortSignal, "timeout").mockReturnValueOnce(controller.signal);
  await expect(accountApi.bootstrap("owner")).rejects.toMatchObject({ code: "account_startup_timeout" });
  expect(await getSession()).toEqual(session);
});

it("keeps an ordinary write timeout distinct from account startup", async () => {
  getSession.mockResolvedValue(session);
  const controller = new AbortController();
  controller.abort(new DOMException("Timed out", "TimeoutError"));
  vi.spyOn(AbortSignal, "timeout").mockReturnValueOnce(controller.signal);
  await expect(apiRequest("/farms", "owner", "POST", {})).rejects.toMatchObject({ code: "network_unavailable" });
});
