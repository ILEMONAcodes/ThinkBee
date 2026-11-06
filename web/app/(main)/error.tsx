"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { useOnline } from "@/lib/hooks/use-online";

export default function ErrorPage({ reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  const t = useTranslations("Shell");
  const online = useOnline();
  return (
    <section className="mx-auto max-w-xl rounded-lg border border-line bg-raised p-8 sm:p-12">
      <h1 className="font-display text-3xl">{t("errorTitle")}</h1>
      <p role="alert" className="mt-4 text-subtle">{t(online ? "errorBody" : "offlineError")}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button className="min-h-12 rounded-pill bg-accent px-6 font-semibold text-on-accent" onClick={reset} type="button">{t("retry")}</button>
        <Link className="inline-flex min-h-12 items-center rounded-pill border border-line px-6" href="/">{t("home")}</Link>
      </div>
    </section>
  );
}
