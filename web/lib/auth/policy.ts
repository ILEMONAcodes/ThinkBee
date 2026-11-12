// Keep this aligned with Supabase's Confirm email setting when verification returns.
export const requiresEmailConfirmation = process.env.NEXT_PUBLIC_AUTH_REQUIRE_EMAIL_CONFIRMATION === "true";
