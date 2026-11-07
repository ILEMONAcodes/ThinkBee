import { accountApi } from "@/lib/api/client";
import { AppError, errorKey } from "@/lib/api/errors";
import { changeExistingDraft, setupDb, type SetupDraft } from "@/lib/db/onboarding";

export type SyncStore = {
  read: (owner: string) => Promise<SetupDraft | undefined>;
  change: typeof changeExistingDraft;
};
const defaultStore: SyncStore = { read: (owner) => setupDb.setup.get(owner), change: changeExistingDraft };

export async function syncJobs(owner: string, api = accountApi, store = defaultStore): Promise<void> {
  const draft = await store.read(owner);
  if (!draft) return;
  if (draft.profileJob) {
    const job = draft.profileJob;
    const profile = await api.saveProfile(owner, job.payload);
    await store.change(owner, (current) => {
      current.profile = profile;
      if (current.profileJob?.id === job.id) {
        delete current.profileJob;
        if (current.profileDraft?.display_name === job.payload.display_name && current.profileDraft?.bio === job.payload.bio) delete current.profileDraft;
      }
    });
  }
  if (!await store.read(owner)) return;
  if (draft.farmJob) {
    const job = draft.farmJob;
    const farm = await api.createFarm(owner, job.farm);
    for (const unit of job.units) await api.createUnit(owner, farm.id, unit);
    await store.change(owner, (current) => {
      if (current.farmJob?.id === job.id) { delete current.farmJob; delete current.farmDraft; }
    });
  }
  await store.change(owner, (current) => { delete current.syncError; });
}

const running = new Map<string, Promise<void>>();
export function syncSetup(owner: string): Promise<void> {
  const existing = running.get(owner);
  if (existing) return existing;
  const run = async () => {
    if (!navigator.onLine) return;
    try {
      await syncJobs(owner);
      const drafts = await setupDb.setup.toArray();
      if (!drafts.some((draft) => draft.profileJob || draft.farmJob)) {
        try { localStorage.removeItem("thinkbee-setup-pending"); } catch { /* Optional sync hint. */ }
      }
    }
    catch (error) {
      if (error instanceof AppError && error.code === "account_changed") return;
      await changeExistingDraft(owner, (draft) => { draft.syncError = errorKey(error); });
    }
  };
  const promise = (async () => {
    if (navigator.locks) await navigator.locks.request(`thinkbee-setup-${owner}`, run);
    else await run();
  })().finally(() => running.delete(owner));
  running.set(owner, promise);
  return promise;
}
