import { Camera, ChatCircleDots, Notebook } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

const actions = [
  { href: "/scan", icon: Camera, label: "scanAction" },
  { href: "/records", icon: Notebook, label: "recordsAction" },
  { href: "/chats", icon: ChatCircleDots, label: "communityAction" },
] as const;

export async function QuickActions() {
  const t = await getTranslations("Home");
  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl">{t("quickTitle")}</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        {actions.map(({ href, icon: Icon, label }) => (
          <Link className="inline-flex min-h-12 items-center gap-3 rounded-pill border border-line bg-raised px-5 font-medium text-link hover:bg-sunken" href={href} key={href}>
            <Icon aria-hidden size={22} />{t(label)}
          </Link>
        ))}
      </div>
    </section>
  );
}
