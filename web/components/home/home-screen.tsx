import { getTranslations } from "next-intl/server";

import { CommunityCard } from "@/components/home/community-card";
import { HomeHero } from "@/components/home/home-hero";
import { QuickActions } from "@/components/home/quick-actions";
import { RecentList } from "@/components/home/recent-list";
import { TodayCard } from "@/components/home/today-card";
import { ThemeToggle } from "@/components/shell/theme-toggle";

export async function HomeScreen() {
  const t = await getTranslations("Home");
  return (
    <div>
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-link">{t("eyebrow")}</p>
          <h1 className="mt-2 max-w-2xl font-display text-4xl sm:text-5xl">{t("greeting")}</h1>
          <p className="mt-3 max-w-xl text-subtle">{t("summary")}</p>
        </div>
        <div className="md:hidden"><ThemeToggle /></div>
      </header>
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(260px,0.75fr)]">
        <HomeHero />
        <TodayCard />
      </div>
      <QuickActions />
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <RecentList />
        <CommunityCard />
      </div>
    </div>
  );
}
