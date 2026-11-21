"use client";

import { Hexagon } from "@phosphor-icons/react/dist/csr/Hexagon";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { SetupError } from "@/components/onboarding/feedback";
import { SetupProgress } from "@/components/onboarding/setup-progress";
import { PhotoBackdrop } from "@/components/ui/photo-backdrop";
import { accountApi } from "@/lib/api/client";
import { useAccount } from "@/lib/hooks/use-account";

const profileCard = "mb-6 rounded-xl border border-line bg-raised p-5 sm:p-7";

export function AccountDetails() {
  const t = useTranslations("Setup");
  const { owner, ready, error: identityError, account, draft } = useAccount();
  const [error, setError] = useState<unknown>();
  const farms = useQuery({
    queryKey: ["farms", owner, !!draft?.farmJob],
    queryFn: () => accountApi.farms(owner!),
    enabled: !!owner && !!account.data?.user && !draft?.farmJob,
  });

  if (!ready) return <p className={profileCard} role="status">{t("loading")}</p>;

  if (!owner) {
    return (
      <section className={profileCard}>
        <p className="text-subtle">{t("accountPrompt")}</p>
        <Link className="setup-primary mt-4" href="/sign-in">{t("signIn")}</Link>
        {identityError ? <SetupError error={identityError} /> : null}
      </section>
    );
  }

  const farmer = account.data?.user;
  const name = draft?.profile?.display_name ?? account.data?.profile?.display_name ?? t("yourName");
  const signOut = (
    <SignOutButton pending={!!(draft?.profileJob || draft?.farmJob || draft?.profileDraft || draft?.farmDraft)} onError={setError} />
  );

  return (
    <>
      <section className={profileCard}>
        {account.isPending ? <p role="status">{t("loading")}</p> : null}
        {account.error || error ? <SetupError error={account.error || error} retry={() => { void account.refetch(); }} /> : null}
        {farmer ? (
          <>
            <div className="flex items-center gap-4">
              <span aria-hidden="true" className="grid size-16 shrink-0 place-items-center rounded-lg bg-accent text-on-accent">
                <Hexagon size={32} />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-2xl leading-tight wrap-break-word sm:text-3xl">{name}</h2>
                <p className="mt-1 font-semibold wrap-break-word">{farmer.farmer_id}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-subtle">{t("internalId")}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link className="setup-secondary" href="/setup/profile">{t("editProfile")}</Link>
              <Link className="setup-secondary" href="/setup/farm">{t("addFarm")}</Link>
            </div>
            {draft?.profileJob || draft?.farmJob ? <SetupProgress /> : null}
          </>
        ) : signOut}
      </section>
      {farmer ? (
        <section aria-labelledby="my-farms-title" className="mb-6 overflow-hidden rounded-xl border border-line bg-raised">
          <header className="relative isolate flex min-h-32 items-end bg-brand p-5 text-on-brand sm:min-h-40 sm:px-7">
            <PhotoBackdrop src="/photos/glossy-leaves.webp" sizes="(min-width: 1024px) 896px, calc(100vw - 40px)" />
            <h2 id="my-farms-title" className="font-display text-2xl sm:text-3xl">{t("yourFarms")}</h2>
          </header>
          <div className="p-5 sm:p-7">
            {farms.isLoading ? <p role="status">{t("loading")}</p> : null}
            {farms.error ? <SetupError error={farms.error} retry={() => { void farms.refetch(); }} /> : null}
            {farms.data?.items.length === 0 ? <p className="text-subtle">{t("noFarms")}</p> : null}
            {farms.data?.items.length ? (
              <ul className="space-y-3">
                {farms.data.items.map((farm) => (
                  <li key={farm.id} className="rounded-md border border-line p-4 wrap-break-word">
                    <strong>{farm.name}</strong>
                    <p className="mt-1 text-sm text-subtle">{[t(farm.kind), farm.lga, farm.state].filter(Boolean).join(" · ")}</p>
                  </li>
                ))}
              </ul>
            ) : null}
            {signOut}
          </div>
        </section>
      ) : null}
    </>
  );
}
