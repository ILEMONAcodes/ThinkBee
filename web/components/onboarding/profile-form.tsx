"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { SetupError } from "@/components/onboarding/feedback";
import { getSupabase } from "@/lib/auth/client";
import { changeDraft } from "@/lib/db/onboarding";
import { useAccount } from "@/lib/hooks/use-account";
import { profileSchema, type ProfileFormValues } from "@/lib/onboarding/forms";
import { queueProfile } from "@/lib/onboarding/queue";
import { syncSetup } from "@/lib/onboarding/sync";

export function ProfileForm() {
  const t = useTranslations("Setup");
  const router = useRouter();
  const { owner, account } = useAccount();
  const [error, setError] = useState<unknown>();
  const [saved, setSaved] = useState(false);
  const initial = account.data?.profileDraft ?? account.data?.profile ?? { display_name: "", bio: "" };
  const { register, handleSubmit, subscribe, control, getFieldState, setValue, formState: { errors, isSubmitting } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema), defaultValues: { display_name: initial.display_name, bio: initial.bio },
  });
  const values = useWatch({ control });
  useEffect(() => {
    if (initial.display_name) return;
    let active = true;
    void getSupabase().auth.getSession().then(({ data }) => {
      const name: unknown = data.session?.user.user_metadata.display_name;
      if (active && typeof name === "string" && name.trim().length <= 80 && !getFieldState("display_name").isDirty) {
        // This is only a suggestion; the farmer confirms their public profile below.
        setValue("display_name", name.trim());
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [getFieldState, initial.display_name, setValue]);
  useEffect(() => {
    const unsubscribe = subscribe({ formState: { values: true }, callback: ({ values: value }) => {
      if (!owner) return;
      setSaved(false);
      void changeDraft(owner, (draft) => { draft.profileDraft = { display_name: value.display_name ?? "", bio: value.bio ?? "" }; })
        .then(() => { setSaved(true); setError(undefined); }).catch(setError);
    } });
    return unsubscribe;
  }, [owner, subscribe]);
  const submit = async (value: ProfileFormValues) => {
    if (!owner) return;
    try { await queueProfile(owner, value); void syncSetup(owner).catch(() => undefined); router.push("/setup/farm"); }
    catch (failure) { setError(failure); }
  };
  return <div className="setup-columns">
    <section>
      <p className="setup-kicker">{t("profileStep")}</p><h1 className="setup-title">{t("profileTitle")}</h1>
      <p className="mt-5 text-lg text-subtle">{t("profileBody")}</p>
      <form className="mt-8 space-y-5" onSubmit={handleSubmit(submit)} noValidate>
        <div><label className="setup-label" htmlFor="display_name">{t("displayName")}</label><input {...register("display_name")} id="display_name" className="setup-input" autoComplete="nickname" maxLength={80} aria-invalid={!!errors.display_name} aria-describedby={errors.display_name ? "name-error" : undefined} />
          {errors.display_name ? <p className="setup-field-error" id="name-error">{t("nameInvalid")}</p> : null}</div>
        <div><label className="setup-label" htmlFor="bio">{t("bio")}</label><textarea {...register("bio")} id="bio" className="setup-input" rows={4} maxLength={280} aria-describedby="bio-hint" /><p className="mt-2 text-sm text-subtle" id="bio-hint">{t("bioHint", { count: values.bio?.length ?? 0 })}</p></div>
        <p className="text-sm text-subtle">{t("photoLater")}</p>
        {saved ? <p role="status" className="text-sm text-link">{t("draftSaved")}</p> : null}
        {error ? <SetupError error={error} /> : null}
        <button className="setup-primary w-full" type="submit" disabled={isSubmitting}>{isSubmitting ? t("saving") : t("continue")}</button>
      </form>
    </section>
    <aside className="setup-preview">
      <p className="setup-kicker">{t("preview")}</p>
      <div className="mt-8 flex size-20 items-center justify-center rounded-full bg-accent font-display text-3xl text-on-accent" aria-hidden>{values.display_name?.trim().slice(0, 1).toUpperCase() || "—"}</div>
      <h2 className="mt-6 wrap-break-word font-display text-3xl">{values.display_name?.trim() || t("yourName")}</h2>
      <p className="mt-3 whitespace-pre-wrap wrap-break-word text-subtle">{values.bio?.trim() || t("yourBio")}</p>
      <p className="mt-8 text-sm text-subtle">{t("profilePrivacy")}</p>
      <div className="mt-8 border-t border-line pt-6"><p className="text-sm text-subtle">{t("farmerId")}</p><p className="mt-2 font-semibold">{account.data?.user?.farmer_id}</p><p className="mt-2 text-sm text-subtle">{t("internalId")}</p></div>
    </aside>
  </div>;
}
