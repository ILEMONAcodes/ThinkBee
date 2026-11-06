import { ChatCircleDots } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function CommunityCard() {
  const t = await getTranslations("Home");
  return (
    <section className="rounded-lg bg-brand-2 p-6 text-on-brand shadow-card sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl">{t("communityTitle")}</h2>
        <ChatCircleDots aria-hidden className="text-mint" size={28} />
      </div>
      <div className="mt-8 flex -space-x-2" aria-hidden>
        {["AO", "KA", "SM"].map((initials, index) => (
          <span className={`grid size-11 place-items-center rounded-full border-2 border-forest-700 text-xs font-bold text-forest-900 ${index === 1 ? "bg-forest-300" : index === 2 ? "bg-comb-400" : "bg-honey-500"}`} key={initials}>
            {initials}
          </span>
        ))}
      </div>
      <h3 className="mt-5 text-lg font-semibold">{t("communityName")}</h3>
      <p className="mt-2 text-sm leading-6 text-white/75">{t("communityPost")}</p>
      <Link className="mt-7 inline-flex min-h-12 items-center rounded-pill border border-mint/40 px-4 text-sm font-semibold text-mint" href="/chats">
        {t("communityUnread")}
      </Link>
    </section>
  );
}
