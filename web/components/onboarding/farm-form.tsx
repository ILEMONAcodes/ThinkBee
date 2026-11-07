"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { FarmFields } from "@/components/onboarding/farm-fields";
import { SetupError } from "@/components/onboarding/feedback";
import { SetupProgress } from "@/components/onboarding/setup-progress";
import { changeDraft } from "@/lib/db/onboarding";
import { useAccount } from "@/lib/hooks/use-account";
import { emptyFarm, farmSchema, type FarmFormValues } from "@/lib/onboarding/forms";
import { queueFarm } from "@/lib/onboarding/queue";
import { syncSetup } from "@/lib/onboarding/sync";

export function FarmForm() {
  const t = useTranslations("Setup");
  const router = useRouter();
  const { owner, account, draft } = useAccount();
  const [error, setError] = useState<unknown>();
  const [submitted, setSubmitted] = useState(!!account.data?.farmJob);
  const [saved, setSaved] = useState(false);
  const { register, subscribe, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FarmFormValues>({ resolver: zodResolver(farmSchema), defaultValues: account.data?.farmDraft ?? emptyFarm });
  const kind = useWatch({ control, name: "kind" });
  useEffect(() => {
    const unsubscribe = subscribe({ formState: { values: true }, callback: ({ values }) => {
      if (!owner || submitted || draft?.farmJob) return;
      setSaved(false);
      void changeDraft(owner, (current) => { current.farmDraft = { ...emptyFarm, ...values } as FarmFormValues; })
        .then(() => { setSaved(true); setError(undefined); }).catch(setError);
    } });
    return unsubscribe;
  }, [owner, subscribe, submitted, draft?.farmJob]);
  const submit = async (values: FarmFormValues) => {
    if (!owner) return;
    try { await queueFarm(owner, values, (number) => t("hiveName", { number })); setSubmitted(true); void syncSetup(owner).catch(() => undefined); }
    catch (failure) { setError(failure); }
  };
  if (!account.data?.profile && !account.data?.profileJob && !draft?.profile && !draft?.profileJob) return <section><h1 className="setup-title">{t("profileFirst")}</h1><Link className="setup-primary mt-6" href="/setup/profile">{t("profileAction")}</Link></section>;
  if (submitted || draft?.farmJob) return <section className="setup-narrow"><p className="setup-kicker">{t("farmStep")}</p><h1 className="setup-title">{t("setupSaved")}</h1><SetupProgress /><Link className="setup-primary mt-8 w-full" href="/">{t("home")}</Link></section>;
  return <div className="setup-columns"><section>
    <p className="setup-kicker">{t("farmStep")}</p><h1 className="setup-title">{t("farmTitle")}</h1><p className="mt-5 text-lg text-subtle">{t("farmBody")}</p>
    <form className="mt-8 space-y-5" onSubmit={handleSubmit(submit)} noValidate>
      <FarmFields register={register} errors={errors} kind={kind} />
      {saved ? <p role="status" className="text-sm text-link">{t("draftSaved")}</p> : null}
      {error ? <SetupError error={error} /> : null}
      <button className="setup-primary w-full" disabled={isSubmitting} type="submit">{isSubmitting ? t("saving") : t("saveFarm")}</button>
      <button className="setup-secondary w-full" type="button" onClick={async () => {
        if (!owner) return;
        try { await changeDraft(owner, (current) => { current.completed = true; }); router.push("/"); }
        catch (failure) { setError(failure); }
      }}>{t("skipFarm")}</button>
    </form>
  </section><aside className="setup-preview">
    <h2 className="font-display text-3xl">{t("privateFarm")}</h2><p className="mt-4 text-subtle">{t("farmPrivacy")}</p>
    <p className="mt-6 text-subtle">{t("unitsHint")}</p><p className="mt-6 text-sm text-subtle">{t("locationHint")}</p>
    <SetupProgress />
    <Link className="setup-secondary mt-6" href="/setup/profile">{t("editProfile")}</Link>
  </aside></div>;
}
