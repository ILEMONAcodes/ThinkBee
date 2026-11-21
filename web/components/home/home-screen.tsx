import { CommunityCard } from "@/components/home/community-card";
import { HomeCategories } from "@/components/home/home-categories";
import { HomeHeader } from "@/components/home/home-header";
import { HomeHero } from "@/components/home/home-hero";
import { QuickActions } from "@/components/home/quick-actions";
import { RecentList } from "@/components/home/recent-list";
import { TodayCard } from "@/components/home/today-card";

export function HomeScreen() {
  return (
    <div>
      <HomeHeader />
      <div className="mt-4 grid gap-4 sm:mt-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-6">
        <HomeHero />
        <HomeCategories />
      </div>
      <div className="mt-8">
        <CommunityCard />
      </div>
      <QuickActions />
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <TodayCard />
        <RecentList />
      </div>
    </div>
  );
}
