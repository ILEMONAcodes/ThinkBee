import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { ConnectionStatus } from "@/components/shell/connection-status";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { BrandMark } from "@/components/ui/brand-mark";

export async function OnboardingFrame({ children }: Readonly<{ children: ReactNode }>) {
  const t = await getTranslations("Setup");
  return <div className="setup-page">
    <ConnectionStatus />
    <header className="setup-header">
      <Link className="inline-flex min-h-12 items-center gap-3" href="/welcome" aria-label={t("brand")}>
        <BrandMark />
      </Link>
      <ThemeToggle />
    </header>
    <main className="setup-main" id="setup-content">{children}</main>
  </div>;
}
