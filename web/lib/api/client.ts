import { AppError } from "@/lib/api/errors";
import { accountTimeoutMs, requestTimeoutMs } from "@/lib/api/config";
import type { components } from "@/lib/api/schema";
import { getSupabase } from "@/lib/auth/client";

export type ApiSchema = components["schemas"];

export async function apiRequest<T>(path: string, ownerId: string, method = "GET", body?: unknown, options: { accountStartup?: boolean } = {}): Promise<T> {
  const { data, error } = await getSupabase().auth.getSession();
  if (error || !data.session) throw new AppError("auth_required", 401);
  if (data.session.user.id !== ownerId) throw new AppError("account_changed", 401);
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) throw new AppError("auth_configuration");
  let response: Response;
  const deadline = AbortSignal.timeout(options.accountStartup ? accountTimeoutMs : requestTimeoutMs);
  try {
    response = await fetch(`${base.replace(/\/$/, "")}${path}`, {
      method, cache: "no-store", signal: deadline,
      headers: { Authorization: `Bearer ${data.session.access_token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    if (deadline.aborted && options.accountStartup) throw new AppError("account_startup_timeout");
    throw new AppError("network_unavailable");
  }
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const code = payload && typeof payload === "object" && "error" in payload
      && payload.error && typeof payload.error === "object" && "code" in payload.error
      && typeof payload.error.code === "string" ? payload.error.code : "request_failed";
    throw new AppError(code, response.status);
  }
  const current = await getSupabase().auth.getSession();
  if (current.data.session?.user.id !== ownerId) throw new AppError("account_changed", 401);
  return response.json() as Promise<T>;
}

export const accountApi = {
  bootstrap: (owner: string) => apiRequest<ApiSchema["BootstrapResponse"]>("/auth/bootstrap", owner, "POST", undefined, { accountStartup: true }),
  profile: (owner: string) => apiRequest<ApiSchema["ProfileResponse"]>("/me/chat-profile", owner, "GET", undefined, { accountStartup: true }),
  saveProfile: (owner: string, body: ApiSchema["ProfilePatch"]) => apiRequest<ApiSchema["ProfileResponse"]>("/me/chat-profile", owner, "PATCH", body),
  farms: (owner: string) => apiRequest<ApiSchema["FarmPage"]>("/farms", owner),
  createFarm: (owner: string, body: ApiSchema["FarmCreate"]) => apiRequest<ApiSchema["FarmResponse"]>("/farms", owner, "POST", body),
  createUnit: (owner: string, farm: string, body: ApiSchema["UnitCreate"]) => apiRequest<ApiSchema["UnitResponse"]>(`/farms/${farm}/units`, owner, "POST", body),
};
