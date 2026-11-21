import { ArrowRight, ChatCircleDots } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function CommunityCard() {
  const t = await getTranslations("Home");
  return (
    <section aria-labelledby="home-community-title" className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 rounded-lg bg-accent p-4 text-on-accent [--focus:var(--color-forest-900)] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-5 sm:p-6">
      <span className="comb-cell flex size-12 items-center justify-center self-start bg-forest-900/10 sm:size-14 sm:self-center">
        <ChatCircleDots aria-hidden size={26} />
      </span>
      <div className="min-w-0">
        <h2 id="home-community-title" className="font-display text-2xl leading-tight sm:text-3xl">{t("communityTitle")}</h2>
        <p className="mt-2 text-sm font-semibold">{t("communitySubtitle")}</p>
        <p className="mt-1 max-w-lg">{t("communityBody")}</p>
      </div>
      <Link
        className="col-start-2 inline-flex min-h-12 w-fit max-w-full items-center gap-2 rounded-pill bg-forest-900 px-4 py-2 text-sm font-semibold text-on-brand transition-colors hover:bg-forest-800 sm:col-start-3"
        href="/chats"
      >
        {t("communityAction")}
        <ArrowRight aria-hidden className="shrink-0" size={18} weight="bold" />
      </Link>
    </section>
  );
}
