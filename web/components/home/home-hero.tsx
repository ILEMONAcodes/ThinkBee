import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function HomeHero() {
  const t = await getTranslations("Home");

  return (
    <section aria-labelledby="home-check-title" className="min-w-0">
      <div className="mb-2 flex min-h-12 items-center justify-between gap-3">
        <h2 id="home-check-title" className="font-display text-2xl sm:text-3xl">{t("checkToday")}</h2>
        <Link href="/scan" aria-label={t("seeAllChecks")} className="inline-flex min-h-12 shrink-0 items-center px-1 text-sm font-semibold text-link hover:underline">
          {t("seeAll")}
        </Link>
      </div>
      <Link
        href="/scan?subject=hive"
        className="relative isolate flex min-h-60 items-end overflow-hidden rounded-xl bg-brand p-3 text-on-brand shadow-card sm:min-h-80 sm:p-5 lg:min-h-96"
      >
        <Image
          src="/onboarding/hive.webp"
          alt=""
          fill
          preload
          sizes="(min-width: 1280px) 680px, (min-width: 1024px) 55vw, calc(100vw - 40px)"
          className="-z-10 object-cover"
        />
        <div className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/20 bg-forest-950/85 p-3 sm:p-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-mint">{t("scanKicker")}</p>
            <h3 className="mt-0.5 text-lg leading-tight font-semibold sm:text-2xl">{t("inspectFrames")}</h3>
          </div>
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-on-accent">
            <ArrowUpRight aria-hidden size={21} weight="bold" />
          </span>
        </div>
      </Link>
    </section>
  );
}
