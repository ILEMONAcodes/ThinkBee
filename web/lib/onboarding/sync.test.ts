import { describe, expect, it, vi } from "vitest";

import type { ApiSchema, accountApi } from "@/lib/api/client";
import type { SetupDraft } from "@/lib/db/onboarding";
import { syncJobs, type SyncStore } from "@/lib/onboarding/sync";

const profile: ApiSchema["ProfileResponse"] = { display_name: "Ada", bio: "Farmer", area_state: null, area_lga: null, photo_key: null, show_crops: false, show_hive_type: false, created_at: "2026-11-07T00:00:00Z", updated_at: "2026-11-07T00:00:00Z" };
const farm: ApiSchema["FarmResponse"] = { id: "farm-server-id", client_id: "farm-client-id", name: "North", kind: "bees", created_at: profile.created_at, updated_at: profile.updated_at };

function fixture() {
  let draft: SetupDraft | undefined = { ownerId: "owner", profileJob: { id: "profile-job", payload: { display_name: "Ada", bio: "Farmer" } }, farmJob: { id: "farm-job", farm, units: [{ client_id: "hive-client-id", kind: "hive", name: "Hive 1", details: {} }] } };
  const store: SyncStore = {
    read: async () => structuredClone(draft),
    change: async (_, update) => { if (draft) update(draft); },
  };
  const api = {
    saveProfile: vi.fn(async () => profile), createFarm: vi.fn(async () => farm),
    createUnit: vi.fn(async (_owner, farmId, data) => ({ ...data, farm_id: farmId, id: "hive-server-id", created_at: profile.created_at, updated_at: profile.updated_at })),
  } as unknown as typeof accountApi;
  return { store, api, get: () => draft, clear: () => { draft = undefined; } };
}

describe("durable setup sync", () => {
  it("retains work and reuses client IDs after a partial farm failure", async () => {
    const { store, api, get } = fixture();
    vi.mocked(api.createUnit).mockRejectedValueOnce(new Error("Connection lost"));
    await expect(syncJobs("owner", api, store)).rejects.toThrow();
    expect(get()?.profileJob).toBeUndefined();
    expect(get()?.farmJob?.units[0].client_id).toBe("hive-client-id");
    await syncJobs("owner", api, store);
    expect(api.saveProfile).toHaveBeenCalledTimes(1);
    expect(api.createFarm).toHaveBeenNthCalledWith(1, "owner", farm);
    expect(api.createFarm).toHaveBeenNthCalledWith(2, "owner", farm);
    expect(api.createUnit).toHaveBeenNthCalledWith(2, "owner", "farm-server-id", expect.objectContaining({ client_id: "hive-client-id" }));
    expect(get()?.farmJob).toBeUndefined();
  });
  it("preserves a newer profile edit while an earlier request is in flight", async () => {
    const { store, api, get } = fixture();
    vi.mocked(api.saveProfile).mockImplementationOnce(async () => {
      await store.change("owner", (draft) => { draft.profileJob = { id: "new-edit", payload: { display_name: "New name" } }; });
      return profile;
    });
    await syncJobs("owner", api, store);
    expect(get()?.profileJob?.id).toBe("new-edit");
  });
  it("does not restore a cleared local account after a request finishes", async () => {
    const { store, api, get, clear } = fixture();
    vi.mocked(api.saveProfile).mockImplementationOnce(async () => { clear(); return profile; });
    await syncJobs("owner", api, store);
    expect(get()).toBeUndefined();
  });
});
