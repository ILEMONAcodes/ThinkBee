import { Bell, Hexagon, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { HomeIdentity } from "@/components/home/home-identity";

export async function HomeHeader() {
  const t = await getTranslations("Home");

  return (
    <header className="-mx-5 -mt-[max(24px,env(safe-area-inset-top))] rounded-b-xl bg-forest-700 px-5 pb-5 pt-[max(24px,env(safe-area-inset-top))] text-on-brand sm:mx-0 sm:mt-0 sm:rounded-xl sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <HomeIdentity defaultTitle={t("dashboard")} guestGreeting={t("welcomeGuest")} guestIcon={<Hexagon aria-hidden size={25} />} />
        <Link
          href="/records"
          aria-label={t("reminders")}
          className="grid size-12 shrink-0 place-items-center rounded-full border border-white/25 bg-white/10 hover:bg-white/20"
        >
          <Bell aria-hidden size={22} />
        </Link>
      </div>
      <form action="/scan" role="search" className="mt-4 flex min-h-12 max-w-2xl items-center rounded-pill border border-white/25 bg-white/10 sm:mt-5">
        <button type="submit" aria-label={t("submitSearch")} className="grid size-12 shrink-0 place-items-center rounded-full hover:bg-white/15">
          <MagnifyingGlass aria-hidden size={21} />
        </button>
        <input
          type="search"
          name="q"
          aria-label={t("searchTopics")}
          placeholder={t("searchPlaceholder")}
          maxLength={80}
          className="min-h-12 min-w-0 flex-1 rounded-pill bg-transparent pe-4 text-base placeholder:text-white/80"
        />
      </form>
    </header>
  );
}
