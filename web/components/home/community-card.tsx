import { ChatCircleDots } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function CommunityCard() {
  const t = await getTranslations("Home");
  return (
    <section className="rounded-lg bg-brand-2 p-6 text-on-brand sm:p-7">
      <ChatCircleDots aria-hidden className="text-mint" size={32} />
      <h2 className="mt-6 font-display text-3xl">{t("communityEmpty")}</h2>
      <p className="mt-3 leading-relaxed text-on-brand">{t("communityEmptyBody")}</p>
      <Link className="mt-5 inline-flex min-h-12 items-center rounded-pill border border-mint px-5 font-semibold text-mint" href="/chats">{t("communityAction")}</Link>
    </section>
  );
}
