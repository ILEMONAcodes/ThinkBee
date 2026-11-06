import { Hexagon, Leaf } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function ScanPage() {
  const t = await getTranslations("Scan");
  return (
    <main className="min-h-dvh bg-app px-5 pb-10 pt-[max(20px,env(safe-area-inset-top))] text-app md:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <Link className="inline-flex min-h-12 items-center rounded-pill px-4 font-semibold hover:bg-raised" href="/">
            {t("back")}
          </Link>
          <span className="text-sm font-medium text-muted">{t("step")}</span>
        </div>
        <div className="mx-auto mt-12 max-w-3xl text-center">
          <h1 className="font-display text-4xl md:text-5xl">{t("title")}</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-subtle">{t("body")}</p>
        </div>
        <div className="mx-auto mt-10 grid max-w-3xl gap-5 md:grid-cols-2">
          <button className="group min-h-64 rounded-lg rounded-tr-sm bg-brand-2 p-7 text-left text-on-brand shadow-card transition-transform hover:-translate-y-1 focus-visible:outline-none">
            <Hexagon aria-hidden size={42} weight="regular" />
            <span className="mt-20 block font-display text-3xl">{t("hive")}</span>
            <span className="mt-2 block text-sm text-white/75">{t("hiveHint")}</span>
          </button>
          <button className="group min-h-64 rounded-lg rounded-bl-sm bg-accent p-7 text-left text-on-accent shadow-card transition-transform hover:-translate-y-1 focus-visible:outline-none">
            <Leaf aria-hidden size={42} weight="regular" />
            <span className="mt-20 block font-display text-3xl">{t("crop")}</span>
            <span className="mt-2 block text-sm text-forest-900/75">{t("cropHint")}</span>
          </button>
        </div>
        <p className="mx-auto mt-8 max-w-2xl rounded-md border border-line bg-raised p-4 text-center text-sm text-subtle">
          {t("notice")}
        </p>
      </div>
    </main>
  );
}
