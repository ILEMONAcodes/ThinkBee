import { CaretRight, Lock } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChatSpaceAvatar } from "@/components/chat/chat-space-avatar";
import { PhotoBackdrop } from "@/components/ui/photo-backdrop";

interface ChatSpaceCardProps {
  id: string;
  name: string;
  description: string;
  kind: "community" | "group";
  visibility: "public" | "private";
  memberCount?: number;
  cover?: string;
}

export async function ChatSpaceCard({
  id,
  name,
  description,
  kind,
  visibility,
  memberCount,
  cover,
}: ChatSpaceCardProps) {
  const t = await getTranslations("Chat");
  const borderColor =
    id === "beekeepers" ? "border-s-comb-400" :
    id === "general-farmers" ? "border-s-forest-500" :
    "border-s-line";

  return (
    <Link
      href={`/chats/${id}`}
      className={`relative isolate flex gap-3 overflow-hidden rounded-xl border border-line border-s-4 p-4 shadow-card transition-colors sm:p-5 ${borderColor} ${cover
        ? "min-h-52 items-end bg-brand text-on-brand hover:bg-brand-2 sm:min-h-64"
        : "items-center bg-raised hover:bg-sunken"}`}
    >
      {cover ? <PhotoBackdrop src={cover} sizes="(min-width: 1280px) 510px, (min-width: 640px) 47vw, calc(100vw - 40px)" /> : null}
      <ChatSpaceAvatar id={id} kind={kind} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className={`wrap-break-word ${cover ? "font-display text-2xl leading-tight sm:text-3xl" : "font-semibold"}`}>{name}</h3>
          {visibility === "private" && (
            <Lock className="shrink-0" size={16} aria-hidden="true" />
          )}
        </div>
        {description && <p className={`text-sm ${cover ? "text-on-brand/90 sm:text-base" : "text-subtle"}`}>{description}</p>}
        {memberCount !== undefined && (
          <p className={`mt-1 text-sm ${cover ? "text-on-brand/85" : "text-muted"}`}>{t("memberCount", { count: memberCount })}</p>
        )}
      </div>
      <span aria-hidden="true" className={`grid shrink-0 place-items-center ${cover ? "size-10 rounded-full border border-white/20 bg-white/15 sm:size-11" : "text-muted"}`}>
        <CaretRight size={17} weight="bold" />
      </span>
    </Link>
  );
}
