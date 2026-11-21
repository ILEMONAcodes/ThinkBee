import { accountApi } from "@/lib/api/client";
import { getSupabase } from "@/lib/auth/client";
import { setupDb } from "@/lib/db/onboarding";

export type HomeAccount = { name?: string; farm?: string };

export function watchHomeAccount(update: (account: HomeAccount) => void) {
  let active = true;
  let owner: string | null | undefined;
  let revision = 0;

  const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
    const nextOwner = session?.user.id ?? null;
    if (owner === nextOwner) return;
    owner = nextOwner;
    const current = ++revision;
    update({});
    if (!nextOwner) return;

    const metadataName: unknown = session?.user.user_metadata.display_name;
    const fallbackName = typeof metadataName === "string" ? metadataName.trim() : undefined;

    // Wait until Supabase releases its session lock before making authenticated reads.
    queueMicrotask(async () => {
      if (!active || current !== revision) return;
      const cached = await setupDb.setup.get(nextOwner).catch(() => undefined);
      if (!active || current !== revision) return;
      const cachedName = cached?.profile?.display_name || fallbackName;
      update({ name: cachedName });
      if (!navigator.onLine) return;

      const [profile, farms] = await Promise.allSettled([
        accountApi.profile(nextOwner),
        accountApi.farms(nextOwner),
      ]);
      if (!active || current !== revision) return;
      update({
        name: profile.status === "fulfilled" ? profile.value.display_name : cachedName,
        farm: farms.status === "fulfilled" ? farms.value.items[0]?.name : undefined,
      });
    });
  });
  return () => {
    active = false;
    data.subscription.unsubscribe();
  };
}
