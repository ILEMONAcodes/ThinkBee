import Dexie, { type EntityTable } from "dexie";

import { AppError, type errorKey } from "@/lib/api/errors";
import type { ApiSchema } from "@/lib/api/client";
import type { FarmFormValues, ProfileFormValues } from "@/lib/onboarding/forms";

export type ProfileJob = { id: string; payload: ApiSchema["ProfilePatch"] };
export type FarmJob = { id: string; farm: ApiSchema["FarmCreate"]; units: ApiSchema["UnitCreate"][] };
export type SetupDraft = {
  ownerId: string;
  user?: ApiSchema["UserResponse"];
  profile?: ApiSchema["ProfileResponse"];
  profileDraft?: ProfileFormValues;
  farmDraft?: FarmFormValues;
  profileJob?: ProfileJob;
  farmJob?: FarmJob;
  completed?: boolean;
  syncError?: ReturnType<typeof errorKey>;
};
export class SetupDatabase extends Dexie {
  setup!: EntityTable<SetupDraft, "ownerId">;
  constructor() {
    super("thinkbee-onboarding");
    this.version(1).stores({ setup: "ownerId" });
  }
}
export const setupDb = new SetupDatabase();
let generation = 0;
export function setupGeneration(): number { return generation; }

export async function changeDraft(ownerId: string, update: (draft: SetupDraft) => void): Promise<void> {
  const started = generation;
  try {
    await setupDb.transaction("rw", setupDb.setup, async () => {
      if (generation !== started) return;
      const draft = await setupDb.setup.get(ownerId) ?? { ownerId };
      update(draft);
      await setupDb.setup.put(draft);
    });
  } catch { throw new AppError("storage_unavailable"); }
}

export async function clearSetup(): Promise<void> {
  generation++;
  await setupDb.setup.clear();
  try { localStorage.removeItem("thinkbee-setup-pending"); } catch { /* Storage can be blocked. */ }
}

export async function changeExistingDraft(ownerId: string, update: (draft: SetupDraft) => void): Promise<void> {
  await setupDb.transaction("rw", setupDb.setup, async () => {
    const draft = await setupDb.setup.get(ownerId);
    if (!draft) return; // An in-flight sync must not restore data cleared at sign-out.
    update(draft);
    await setupDb.setup.put(draft);
  });
}

export function markPending(): void {
  try { localStorage.setItem("thinkbee-setup-pending", "1"); } catch { /* Sync also runs on setup and Me. */ }
}
