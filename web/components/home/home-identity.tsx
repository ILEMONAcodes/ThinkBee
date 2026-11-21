"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { HomeAccount } from "@/components/home/home-account";

export function HomeIdentity({ defaultTitle, guestGreeting, guestIcon }: Readonly<{
  defaultTitle: string;
  guestGreeting: string;
  guestIcon: ReactNode;
}>) {
  const t = useTranslations("Home");
  const [account, setAccount] = useState<HomeAccount>({});

  useEffect(() => {
    let active = true;
    let stop: (() => void) | undefined;
    void import("@/components/home/home-account").then(({ watchHomeAccount }) => {
      if (active) stop = watchHomeAccount(setAccount);
    }).catch(() => undefined);
    return () => { active = false; stop?.(); };
  }, []);

  const firstName = account.name?.trim().split(/\s+/)[0];
  const initial = firstName?.match(/^./u)?.[0].toLocaleUpperCase();

  return (
    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
      <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-xl font-semibold text-on-accent sm:size-14">
        {initial || guestIcon}
      </span>
      <div className="min-w-0">
        <p className="text-sm text-on-brand/85 wrap-break-word sm:text-base">
          {firstName ? t("welcomeName", { name: firstName }) : guestGreeting}
        </p>
        <h1 className="font-display text-xl leading-tight wrap-break-word sm:text-3xl">{account.farm || defaultTitle}</h1>
      </div>
    </div>
  );
}
