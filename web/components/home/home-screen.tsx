import { getFormatter, getTranslations } from "next-intl/server";

import { CommunityCard } from "@/components/home/community-card";
import { HomeHero } from "@/components/home/home-hero";
import { QuickActions } from "@/components/home/quick-actions";
import { RecentList } from "@/components/home/recent-list";
import { TodayCard } from "@/components/home/today-card";

export async function HomeScreen() {
  const t = await getTranslations("Home");
  const format = await getFormatter();
  const date = format.dateTime(new Date(), {
    day: "numeric",
    month: "long",
    weekday: "long",
  });

  return (
    <div>
      <header className="flex items-start justify-between gap-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-link">{t("eyebrow")}</p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">{t("greeting")}</h1>
          <p className="mt-2 text-subtle">{date} · {t("summary")}</p>
        </div>
        <button aria-label="Notifications" className="grid size-12 shrink-0 place-items-center rounded-full border border-line bg-raised shadow-card" type="button">
          <span aria-hidden className="size-2 rounded-full bg-accent" />
        </button>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
        <HomeHero />
        <TodayCard />
      </div>

      <QuickActions />

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <RecentList />
        <CommunityCard />
      </div>
    </div>
  );
}
