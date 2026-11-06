import { CalendarCheck } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function TodayCard() {
  const t = await getTranslations("Home");
  return (
    <section className="flex flex-col rounded-lg border border-line bg-raised p-6 sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl">{t("todayTitle")}</h2>
        <CalendarCheck aria-hidden size={28} className="text-link" />
      </div>
      <h3 className="mt-8 max-w-64 font-display text-3xl leading-tight">{t("todayEmpty")}</h3>
      <p className="mt-3 text-subtle">{t("todayEmptyBody")}</p>
      <Link className="mt-6 inline-flex min-h-12 items-center self-start rounded-pill border border-line px-5 font-semibold text-link" href="/records">{t("recordsAction")}</Link>
    </section>
  );
}
