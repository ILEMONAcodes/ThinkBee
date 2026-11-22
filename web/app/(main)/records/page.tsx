import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function RecordsPage() {
  const t = await getTranslations("Feature");

  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center px-1 pt-8 pb-12 text-center sm:pt-14">
      <div aria-hidden="true" className="relative aspect-[1.3] w-full max-w-76 sm:max-w-96">
        <div className="absolute inset-y-[7%] left-[6%] w-[58%] -rotate-6 overflow-hidden rounded-xl bg-brand-2 shadow-card">
          <Image src="/photos/forest-foliage.webp" alt="" fill sizes="(min-width: 640px) 230px, 180px" className="object-cover" />
        </div>
        <div className="absolute top-[16%] right-[6%] bottom-[5%] w-[52%] rotate-6 overflow-hidden rounded-xl border-4 border-app bg-brand shadow-card">
          <Image src="/photos/leaf-veins.webp" alt="" fill sizes="(min-width: 640px) 200px, 160px" className="object-cover" />
        </div>
      </div>
      <h1 className="mt-5 font-display text-4xl leading-tight text-balance sm:mt-8 sm:text-5xl">{t("recordsTitle")}</h1>
      <p className="mt-4 max-w-md text-base text-subtle sm:mt-5 sm:text-lg">{t("recordsEmptyBody")}</p>
      <Link href="/scan?subject=hive" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-pill bg-accent px-5 py-2 font-semibold text-on-accent hover:bg-accent-press sm:min-h-14 sm:px-6">
        {t("recordsScanLink")}
        <ArrowUpRight aria-hidden className="shrink-0" size={19} weight="bold" />
      </Link>
    </section>
  );
}
