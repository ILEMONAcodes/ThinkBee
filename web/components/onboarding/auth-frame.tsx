import { ArrowLeft } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { ConnectionStatus } from "@/components/shell/connection-status";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { BrandMark } from "@/components/ui/brand-mark";

export async function AuthFrame({ children }: Readonly<{ children: ReactNode }>) {
  const t = await getTranslations("Setup");
  return <div className="auth-page">
    <ConnectionStatus />
    <header className="auth-header">
      <Link className="auth-back" href="/welcome" aria-label={t("backWelcome")}><ArrowLeft size={22} aria-hidden="true" /><span>{t("back")}</span></Link>
      <Link className="auth-wordmark" href="/welcome" aria-label={t("brand")}><BrandMark width={140} /></Link>
      <ThemeToggle />
    </header>
    <main className="auth-layout" id="setup-content">
      <aside className="auth-story">
        <BrandMark kind="short" surface="dark" className="auth-bee-desktop" width={150} />
        <p className="auth-story-label">{t("storyLabel")}</p>
        <p className="auth-story-title">{t.rich("storyTitle", { em: (chunks) => <em>{chunks}</em> })}</p>
        <figure className="auth-story-photo"><Image alt={t("storyPhotoAlt")} src="/onboarding/field.webp" fill sizes="(min-width: 900px) 460px, 1px" className="object-cover" /><figcaption>{t("storyCaption")}</figcaption></figure>
      </aside>
      <div className="auth-surface">{children}</div>
    </main>
    <footer className="auth-footer">{t.rich("byMacaney", { macaney: (chunks) => <a className="brand-credit" href="https://www.macaney.com/">{chunks}</a> })}</footer>
  </div>;
}
