import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { CombField } from "@/components/ui/comb-field";

export async function HomeHero() {
  const t = await getTranslations("Home");
  return (
    <section className="relative min-h-80 overflow-hidden rounded-lg bg-brand p-7 text-on-brand shadow-card sm:p-9">
      <CombField className="absolute -right-8 -top-3 rotate-12 opacity-70" count={12} />
      <div className="relative z-10 flex h-full max-w-xl flex-col items-start">
        <p className="rounded-pill border border-mint/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-mint">
          {t("scanKicker")}
        </p>
        <h2 className="mt-5 max-w-md font-display text-4xl leading-tight sm:text-5xl">{t("scanTitle")}</h2>
        <p className="mt-4 max-w-md text-base text-white/75 sm:text-lg">{t("scanBody")}</p>
        <Link className="mt-8 inline-flex min-h-14 items-center gap-3 rounded-pill bg-accent px-6 font-semibold text-on-accent transition-transform hover:-translate-y-0.5" href="/scan">
          {t("scanAction")}
          <ArrowRight aria-hidden size={20} weight="bold" />
        </Link>
      </div>
    </section>
  );
}
