"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { SetupError } from "@/components/onboarding/feedback";
import { useAccount } from "@/lib/hooks/use-account";

export function SetupGate({ children }: Readonly<{ children: ReactNode }>) {
  const t = useTranslations("Setup");
  const { ready, owner, error, account } = useAccount();
  if (error || account.error) return <SetupError error={error || account.error} retry={() => { void account.refetch(); }} />;
  if (!ready || (owner && account.isPending)) return <p role="status">{t("loading")}</p>;
  if (!owner) return <div><h1 className="setup-title">{t("sessionTitle")}</h1><p className="mt-4">{t("errors.session")}</p><Link className="setup-primary mt-6" href="/sign-in">{t("signIn")}</Link></div>;
  return <div key={owner}>{children}</div>;
}
