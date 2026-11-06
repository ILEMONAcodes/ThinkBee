import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { CombField } from "@/components/ui/comb-field";

export default async function WelcomePage() {
  const t = await getTranslations("Onboarding");
  return (
    <main className="relative grid min-h-dvh overflow-hidden bg-brand px-5 py-10 text-on-brand">
      <CombField className="absolute -right-12 top-12 opacity-20" count={12} />
      <div className="relative z-10 flex max-w-xl flex-col justify-end md:mx-auto md:justify-center">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-mint">Think Bee</p>
        <h1 className="mt-4 max-w-lg font-display text-5xl leading-tight">{t("title")}</h1>
        <p className="mt-5 max-w-md text-lg text-white/80">{t("body")}</p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link className="inline-flex min-h-14 items-center justify-center rounded-pill bg-accent px-7 font-semibold text-on-accent" href="/">
            {t("action")}
          </Link>
          <Link className="inline-flex min-h-14 items-center justify-center rounded-pill border border-white/30 px-7 font-semibold" href="/">
            {t("skip")}
          </Link>
        </div>
      </div>
    </main>
  );
}
