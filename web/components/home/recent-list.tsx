import { Notebook } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function RecentList() {
  const t = await getTranslations("Home");
  return (
    <section className="rounded-lg bg-raised p-6 shadow-card sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-3xl">{t("recentTitle")}</h2>
        <Notebook aria-hidden className="text-link" size={28} />
      </div>
      <div className="mt-6 border-t border-line pt-6">
        <h3 className="font-semibold">{t("recentEmpty")}</h3>
        <p className="mt-2 text-subtle">{t("recentEmptyBody")}</p>
        <Link className="mt-4 inline-flex min-h-12 items-center rounded-pill px-3 font-semibold text-link" href="/records">{t("recordsAction")}</Link>
      </div>
    </section>
  );
}
