import type { IconProps } from "@phosphor-icons/react";
import { CalendarPlus, ChatCircleDots, Hexagon, Leaf } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ComponentType } from "react";

type QuickAction = {
  className: string;
  href: string;
  icon: ComponentType<IconProps>;
  label: "ask" | "newReminder" | "scanCrop" | "scanHive";
};

const actions: QuickAction[] = [
  { className: "bg-honey-100 dark:bg-honey-800", href: "/scan", icon: Hexagon, label: "scanHive" },
  { className: "bg-comb-100 dark:bg-bark-700", href: "/scan", icon: Leaf, label: "scanCrop" },
  { className: "bg-forest-100 dark:bg-forest-800", href: "/chats", icon: ChatCircleDots, label: "ask" },
  { className: "bg-bone dark:bg-raised", href: "/records", icon: CalendarPlus, label: "newReminder" },
];

export async function QuickActions() {
  const t = await getTranslations("Home");
  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl">{t("quickTitle")}</h2>
      <div className="-mx-5 mt-4 flex snap-x gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-4">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Link
              className={`min-h-36 min-w-[185px] snap-start p-5 text-forest-900 shadow-card transition-transform hover:-translate-y-1 dark:text-app ${action.className} ${index % 2 === 0 ? "rounded-lg rounded-tr-sm" : "rounded-lg rounded-bl-sm"}`}
              href={action.href}
              key={action.label}
            >
              <Icon aria-hidden size={30} />
              <span className="mt-8 block max-w-28 font-semibold leading-snug">{t(action.label)}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
