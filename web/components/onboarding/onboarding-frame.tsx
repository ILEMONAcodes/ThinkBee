import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { ConnectionStatus } from "@/components/shell/connection-status";
import { ThemeToggle } from "@/components/shell/theme-toggle";

export async function OnboardingFrame({ children }: Readonly<{ children: ReactNode }>) {
  const t = await getTranslations("Setup");
  return <div className="setup-page">
    <ConnectionStatus />
    <header className="setup-header">
      <Link className="inline-flex min-h-12 items-center gap-3" href="/welcome" aria-label={t("brand")}>
        <Image alt="" width={132} height={54} src="/brand/thinkbee-wordmark.svg" className="rounded-sm bg-paper px-2 py-1" />
      </Link>
      <ThemeToggle />
    </header>
    <main className="setup-main" id="setup-content">{children}</main>
  </div>;
}
