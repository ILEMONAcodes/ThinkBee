import { accountApi } from "@/lib/api/client";
import { AppError } from "@/lib/api/errors";
import { changeDraft, setupDb, setupGeneration } from "@/lib/db/onboarding";

export async function loadAccount(owner: string) {
  const generation = setupGeneration();
  const cached = await setupDb.setup.get(owner).catch(() => undefined);
  if (!navigator.onLine && cached?.user) return cached;
  const { user } = await accountApi.bootstrap(owner);
  const profile = await accountApi.profile(owner).catch((error: unknown) => {
    if (error instanceof AppError && error.code === "profile_not_found") return undefined;
    throw error;
  });
  if (generation !== setupGeneration()) throw new AppError("account_changed", 401);
  // Account details can load when storage is blocked; a write must still be saved locally first.
  await changeDraft(owner, (draft) => { draft.user = user; draft.profile = profile; }).catch(() => undefined);
  return { ...cached, ownerId: owner, user, profile };
}
