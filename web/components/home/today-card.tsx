import { CalendarCheck, Clock } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";

export async function TodayCard() {
  const t = await getTranslations("Home");
  return (
    <section className="flex min-h-80 flex-col rounded-lg bg-raised p-6 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">{t("todayTitle")}</h2>
        <span className="grid size-11 place-items-center rounded-full bg-comb-100 text-forest-900 dark:bg-forest-800 dark:text-mint">
          <CalendarCheck aria-hidden size={23} />
        </span>
      </div>
      <div className="mt-8 flex items-center gap-2 text-sm font-semibold text-link">
        <Clock aria-hidden size={18} />
        {t("todayTime")}
      </div>
      <h3 className="mt-3 font-display text-3xl leading-tight">{t("todayReminder")}</h3>
      <p className="mt-2 text-sm text-muted">{t("todayFarm")}</p>
      <div className="mt-auto flex flex-wrap gap-3 pt-7">
        <button className="min-h-12 flex-1 rounded-pill bg-accent px-4 font-semibold text-on-accent" type="button">{t("markDone")}</button>
        <button className="min-h-12 flex-1 rounded-pill border border-line px-4 font-semibold" type="button">{t("postpone")}</button>
      </div>
    </section>
  );
}
