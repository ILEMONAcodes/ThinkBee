import { CaretRight, Lock } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChatSpaceAvatar } from "@/components/chat/chat-space-avatar";

interface ChatSpaceCardProps {
  id: string;
  name: string;
  description: string;
  kind: "community" | "group";
  visibility: "public" | "private";
  memberCount?: number;
}

export async function ChatSpaceCard({
  id,
  name,
  description,
  kind,
  visibility,
  memberCount,
}: ChatSpaceCardProps) {
  const t = await getTranslations("Chat");
  const borderColor =
    id === "beekeepers" ? "border-s-comb-400" :
    id === "general-farmers" ? "border-s-forest-500" :
    "border-s-line";

  return (
    <Link
      href={`/chats/${id}`}
      className={`flex items-center gap-3 rounded-lg border border-line border-s-4 bg-raised p-4 shadow-card transition-colors hover:bg-sunken ${borderColor}`}
    >
      <ChatSpaceAvatar id={id} kind={kind} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="break-words font-semibold">{name}</h3>
          {visibility === "private" && (
            <Lock className="shrink-0 text-subtle" size={16} aria-hidden="true" />
          )}
        </div>
        {description && <p className="text-sm text-subtle">{description}</p>}
        {memberCount !== undefined && (
          <p className="mt-1 text-sm text-muted">{t("memberCount", { count: memberCount })}</p>
        )}
      </div>
      <CaretRight size={16} className="shrink-0 text-muted" aria-hidden="true" />
    </Link>
  );
}
