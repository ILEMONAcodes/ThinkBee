import { ArrowRight, ChatCircleDots, Hexagon, Leaf } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

const items = [
  { icon: Hexagon, meta: "recentHiveMeta" as const, title: "recentHive" as const },
  { icon: Leaf, meta: "recentCropMeta" as const, title: "recentCrop" as const },
  { icon: ChatCircleDots, meta: "recentQuestionMeta" as const, title: "recentQuestion" as const },
];

export async function RecentList() {
  const t = await getTranslations("Home");
  return (
    <section className="rounded-lg bg-raised p-6 shadow-card sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-3xl">{t("recentTitle")}</h2>
        <Link className="inline-flex min-h-12 items-center gap-2 rounded-pill px-3 text-sm font-semibold text-link" href="/records">
          {t("viewAll")} <ArrowRight aria-hidden size={18} />
        </Link>
      </div>
      <div className="mt-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link className="flex min-h-20 items-center gap-4 border-t border-line first:border-t-0" href="/records" key={item.title}>
              <span className="grid size-11 shrink-0 place-items-center rounded-md bg-sunken text-link">
                <Icon aria-hidden size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{t(item.title)}</span>
                <span className="mt-1 block truncate text-sm text-muted">{t(item.meta)}</span>
              </span>
              <ArrowRight aria-hidden className="text-muted" size={18} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
