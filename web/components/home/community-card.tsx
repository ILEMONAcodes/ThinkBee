import { ArrowRight, ChatCircleDots } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function CommunityCard() {
  const t = await getTranslations("Home");
  return (
    <section className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 rounded-lg border border-comb-300 bg-comb-100 p-4 text-forest-900 dark:border-forest-600 dark:bg-brand-2 dark:text-on-brand sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-5 sm:p-6">
      <span className="comb-cell flex size-12 items-center justify-center self-start bg-comb-400 text-forest-900 sm:size-14 sm:self-center">
        <ChatCircleDots aria-hidden size={26} />
      </span>
      <div className="min-w-0">
        <h2 className="font-display text-2xl leading-tight sm:text-3xl">{t("communityTitle")}</h2>
        <p className="mt-1 text-forest-800 dark:text-on-brand/85">{t("communityBody")}</p>
      </div>
      <Link
        className="col-start-2 inline-flex min-h-12 w-fit max-w-full items-center gap-2 rounded-pill bg-brand px-4 py-2 text-sm font-semibold text-on-brand transition-colors hover:bg-forest-700 dark:bg-comb-400 dark:text-on-accent dark:hover:bg-comb-300 sm:col-start-3"
        href="/chats"
      >
        {t("communityAction")}
        <ArrowRight aria-hidden className="shrink-0" size={18} weight="bold" />
      </Link>
    </section>
  );
}
