import { Users, Hash, Lock } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

interface ChatSpaceCardProps {
  id: string;
  name: string;
  description: string;
  kind: "community" | "group";
  visibility: "public" | "private";
  memberCount: number;
  isSystem: boolean;
}

export async function ChatSpaceCard({
  id,
  name,
  description,
  kind,
  visibility,
  memberCount,
  isSystem,
}: ChatSpaceCardProps) {
  const t = await getTranslations("Chat");
  return (
    <Link
      href={`/chats/${id}`}
      className="group flex gap-4 rounded-lg bg-raised p-5 shadow-card transition-colors hover:bg-sunken"
    >
      <div
        className="flex shrink-0 items-center justify-center size-14 rounded-xl bg-honey-100 text-forest-900 dark:bg-forest-800 dark:text-mint"
        aria-hidden="true"
      >
        {kind === "community" ? (
          <Users size={28} weight="fill" />
        ) : (
          <Hash size={28} weight="fill" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg truncate">{name}</h3>
          {isSystem && (
            <span className="shrink-0 rounded-pill bg-honey-100 px-2 py-0.5 text-xs font-medium text-forest-900 dark:bg-forest-800 dark:text-mint">
              {t("systemBadge")}
            </span>
          )}
          {visibility === "private" && (
            <Lock className="shrink-0 text-subtle" size={16} aria-hidden="true" />
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-subtle text-sm">{description}</p>
        <div className="mt-3 flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1">
            <Users size={14} aria-hidden="true" />
            {memberCount.toLocaleString()} {t("members")}
          </span>
          <span className="capitalize">{kind}</span>
        </div>
      </div>
    </Link>
  );
}