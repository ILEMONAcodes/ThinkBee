import { createClient } from "@supabase/supabase-js";

import { AppError } from "@/lib/api/errors";
import { getSupabaseConfiguration } from "@/lib/auth/client";

export async function registerWithoutConfirmation(name: string, email: string, password: string): Promise<void> {
  const { url, key } = getSupabaseConfiguration();
  // Supabase's PKCE signup requires confirmation. This isolated SDK client
  // accepts autoconfirm without persisting or broadcasting a signed-in session.
  const registration = createClient(url, key, {
    auth: {
      flowType: "implicit", persistSession: false, autoRefreshToken: false,
      detectSessionInUrl: false, storageKey: `thinkbee-registration-${crypto.randomUUID()}`,
    },
  });
  try {
    await registration.auth.initialize();
    const { data, error } = await registration.auth.signUp({
      email, password, options: { data: { display_name: name, chat_age_confirmed: true } },
    });
    if (error) throw new AppError(error.code ?? "auth_unavailable", error.status);
    // Avoid claiming that sign-in is ready when the hosted setting still requires email.
    if (!data.session) throw new AppError("email_confirmation_required");
  } finally {
    await registration.auth.dispose();
  }
}
