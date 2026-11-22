"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { SetupError } from "@/components/onboarding/feedback";
import { useAccount } from "@/lib/hooks/use-account";
import { BrandLoader } from "@/components/ui/brand-loader";

function SetupLoading() {
  const t = useTranslations("Setup");
  return (
    <div className="setup-page grid place-items-center min-h-[50vh]" role="status" aria-label={t("loading")}>
      <div className="text-center space-y-4">
        <BrandLoader size={56} />
      </div>
    </div>
  );
}

export function SetupGate({ children }: Readonly<{ children: ReactNode }>) {
  const t = useTranslations("Setup");
  const { ready, owner, error, account } = useAccount();
  if (error || account.error) return <SetupError error={error || account.error} retry={() => { void account.refetch(); }} />;
  if (!ready || (owner && account.isPending)) return <SetupLoading />;
  if (!owner) return <div><h1 className="setup-title">{t("sessionTitle")}</h1><p className="mt-4">{t("errors.session")}</p><Link className="setup-primary mt-6" href="/sign-in">{t("signIn")}</Link></div>;
  return <div key={owner}>{children}</div>;
}
