import { getSupabase } from "@/lib/auth/client";
import { syncSetup } from "@/lib/onboarding/sync";

export async function syncPendingSetup(): Promise<void> {
  const { data } = await getSupabase().auth.getSession();
  if (data.session) await syncSetup(data.session.user.id);
}
