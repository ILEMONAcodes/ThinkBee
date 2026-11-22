import { ArrowLeft } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { ConnectionStatus } from "@/components/shell/connection-status";
import { BrandMark } from "@/components/ui/brand-mark";
import { getPlaceholder } from "@/lib/images/placeholders";

const photos = {
  "sign-in": "/onboarding/welcome-beekeeper.webp",
  register: "/photos/brood-comb.webp",
} as const;

export async function AuthFrame({ children, variant = "sign-in" }: Readonly<{
  children: ReactNode;
  variant?: keyof typeof photos;
}>) {
  const t = await getTranslations("Setup");
  const src = photos[variant];
  const placeholder = getPlaceholder(src);
  return <div className="auth-page" data-variant={variant}>
    <ConnectionStatus />
    <main className="auth-layout" id="setup-content">
      <div className="auth-hero">
        <Image
          alt=""
          src={src}
          fill
          sizes="(min-width: 900px) 550px, 100vw"
          priority
          placeholder="blur"
          blurDataURL={placeholder}
        />
        <header className="auth-header">
          <Link className="auth-back" href="/welcome" aria-label={t("backWelcome")}><ArrowLeft size={22} aria-hidden="true" /></Link>
          <Link className="auth-wordmark" href="/welcome" aria-label={t("brand")}><BrandMark surface="dark" width={166} priority /></Link>
        </header>
      </div>
      <div className="auth-surface">{children}</div>
    </main>
    <footer className="auth-footer">{t.rich("byMacaney", { macaney: (chunks) => <a className="brand-credit" href="https://www.macaney.com/">{chunks}</a> })}</footer>
  </div>;
}
