import { changeDraft, markPending } from "@/lib/db/onboarding";
import { cropNames, farmSchema, profileSchema, type FarmFormValues, type ProfileFormValues } from "@/lib/onboarding/forms";

export async function queueProfile(ownerId: string, values: ProfileFormValues): Promise<void> {
  const payload = profileSchema.parse(values);
  await changeDraft(ownerId, (draft) => {
    draft.profileDraft = payload;
    draft.profileJob = { id: crypto.randomUUID(), payload };
    delete draft.syncError;
  });
  markPending();
}

export async function queueFarm(ownerId: string, values: FarmFormValues, hiveName: (number: number) => string): Promise<void> {
  const value = farmSchema.parse(values);
  await changeDraft(ownerId, (draft) => {
    // A submitted create keeps its original IDs until all unit requests succeed.
    if (draft.farmJob) return;
    draft.farmDraft = value;
    draft.farmJob = {
      id: crypto.randomUUID(),
      farm: { client_id: crypto.randomUUID(), name: value.name, kind: value.kind, state: value.state || null, lga: value.lga || null },
      units: [
        ...Array.from({ length: value.kind === "crops" ? 0 : value.hiveCount }, (_, index) => ({
          client_id: crypto.randomUUID(), name: hiveName(index + 1), kind: "hive" as const,
          details: value.hiveType ? { hive_type: value.hiveType } : {},
        })),
        ...(value.kind === "bees" ? [] : cropNames(value.crops)).map((crop) => ({
          client_id: crypto.randomUUID(), name: crop, kind: "crop_block" as const, details: { crop },
        })),
      ],
    };
    draft.completed = true;
    delete draft.syncError;
  });
  markPending();
}
