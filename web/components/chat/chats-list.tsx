"use client";

import { Users, PlusCircle } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChatSpaceCard } from "@/components/chat/chat-space-card";

interface ChatSpace {
  id: string;
  name: string;
  description: string;
  kind: "community" | "group";
  visibility: "public" | "private";
  memberCount?: number;
  cover?: string | null;
  is_system?: boolean;
  member_count?: number;
  avatar_key?: string | null;
}

interface ChatsListProps {
  spaces: ChatSpace[];
  mySpaceIds: string[];
  isLoading?: boolean;
}

export function ChatsList({ spaces, mySpaceIds, isLoading = false }: ChatsListProps) {
  const t = useTranslations("Chat");
  const mySpaces = spaces.filter((s) => mySpaceIds.includes(s.id));
  const otherSpaces = spaces.filter((s) => !mySpaceIds.includes(s.id));

  if (isLoading) {
    return (
      <section aria-busy="true" className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-link">{t("yourSpaces")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-lg bg-raised p-5 animate-pulse">
              <div className="h-14 w-14 rounded-xl bg-sunken" />
              <div className="mt-3 h-5 w-3/4 rounded bg-sunken" />
              <div className="mt-2 h-4 w-full rounded bg-sunken" />
              <div className="mt-2 h-4 w-2/3 rounded bg-sunken" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      {mySpaces.length > 0 && (
        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-link">{t("yourSpaces")}</p>
          </div>
          <div className="mt-4 grid max-w-5xl gap-4 sm:grid-cols-2">
            {mySpaces.map((space) => (
              <ChatSpaceCard key={space.id} {...space} memberCount={space.member_count ?? space.memberCount} cover={space.cover ?? space.avatar_key} />
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">{t("discoverSpaces")}</h2>
          <Link
            href="/chats/create"
            className="inline-flex min-h-12 items-center gap-2 rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:bg-accent-press"
          >
            <PlusCircle size={18} aria-hidden="true" />
            {t("createSpace")}
          </Link>
        </div>
        <div className="mt-4 grid max-w-5xl gap-4 sm:grid-cols-2 sm:gap-5">
          {otherSpaces.length > 0 ? (
            otherSpaces.map((space) => (
              <ChatSpaceCard
                key={space.id}
                {...space}
                memberCount={space.member_count ?? space.memberCount}
                cover={space.cover ?? space.avatar_key}
              />
            ))
          ) : (
            <div className="col-span-full rounded-lg bg-raised p-8 text-center shadow-card">
              <Users className="mx-auto size-16 text-muted" aria-hidden="true" />
              <h3 className="mt-4 font-display text-xl">{t("noSpacesTitle")}</h3>
              <p className="mt-2 text-subtle">{t("noSpacesBody")}</p>
              <Link
                href="/chats/create"
                className="mt-5 inline-flex items-center gap-2 rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-on-accent"
              >
                <PlusCircle size={18} aria-hidden="true" />
                {t("createFirstSpace")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
