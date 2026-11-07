"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { SetupError } from "@/components/onboarding/feedback";
import { SetupProgress } from "@/components/onboarding/setup-progress";
import { accountApi } from "@/lib/api/client";
import { useAccount } from "@/lib/hooks/use-account";

export function AccountDetails() {
  const t = useTranslations("Setup");
  const { owner, ready, error: identityError, account, draft } = useAccount();
  const [error, setError] = useState<unknown>();
  const farms = useQuery({ queryKey: ["farms", owner, !!draft?.farmJob], queryFn: () => accountApi.farms(owner!), enabled: !!owner && !!account.data?.user && !draft?.farmJob });
  if (!ready) return <p role="status">{t("loading")}</p>;
  if (!owner) return <div><p className="text-subtle">{t("accountPrompt")}</p><Link className="setup-primary mt-4" href="/sign-in">{t("signIn")}</Link>{identityError ? <SetupError error={identityError} /> : null}</div>;
  return <div>
    {account.isPending ? <p role="status">{t("loading")}</p> : null}
    {account.error || error ? <SetupError error={account.error || error} retry={() => { void account.refetch(); }} /> : null}
    {account.data?.user ? <>
      <h2 className="break-words font-display text-3xl">{draft?.profile?.display_name ?? account.data.profile?.display_name ?? t("yourName")}</h2>
      <p className="mt-2 font-semibold">{account.data.user.farmer_id}</p><p className="mt-2 text-sm text-subtle">{t("internalId")}</p>
      <div className="mt-5 flex flex-wrap gap-3"><Link className="setup-secondary" href="/setup/profile">{t("editProfile")}</Link><Link className="setup-secondary" href="/setup/farm">{t("addFarm")}</Link></div>
      {draft?.profileJob || draft?.farmJob ? <SetupProgress /> : null}
      <h3 className="mt-8 font-display text-2xl">{t("yourFarms")}</h3>
      {farms.error ? <SetupError error={farms.error} retry={() => { void farms.refetch(); }} /> : null}
      {farms.data?.items.length === 0 ? <p className="mt-3 text-subtle">{t("noFarms")}</p> : null}
      <ul className="mt-3 space-y-3">{farms.data?.items.map((farm) => <li key={farm.id} className="rounded-md border border-line p-4"><strong>{farm.name}</strong><p className="mt-1 text-sm text-subtle">{[t(farm.kind), farm.lga, farm.state].filter(Boolean).join(" · ")}</p></li>)}</ul>
    </> : null}
    <SignOutButton pending={!!(draft?.profileJob || draft?.farmJob || draft?.profileDraft || draft?.farmDraft)} onError={setError} />
  </div>;
}
