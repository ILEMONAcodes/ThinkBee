"use client";

import { ArrowLeft, Image as ImageIcon, Lightbulb, Question } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { ChatSpaceAvatar } from "@/components/chat/chat-space-avatar";
import { PhotoBackdrop } from "@/components/ui/photo-backdrop";

interface CommunityData {
  id: string;
  copy: string;
  kind: "community" | "group";
  visibility: "public" | "private";
  cover: string;
}

const benefits = [
  { key: "questions", Icon: Question },
  { key: "photos", Icon: ImageIcon },
  { key: "learning", Icon: Lightbulb },
] as const;

export function CommunityBackLink() {
  const t = useTranslations("Chat");
  return (
    <Link href="/chats" aria-label={t("back")} className="grid size-12 shrink-0 place-items-center rounded-full border border-white/30 bg-forest-950/55 text-white hover:bg-forest-950/80">
      <ArrowLeft size={22} aria-hidden="true" />
    </Link>
  );
}

export function CommunityPreview({ community, onJoin, updating, error }: Readonly<{
  community: CommunityData;
  onJoin: () => void;
  updating: boolean;
  error?: string;
}>) {
  const t = useTranslations("Chat");
  // Map community name to translation namespace
  const copyNamespace = community.copy === "beekeepers" ? "beekeepers" : community.copy === "general-farmers" ? "farmers" : "beekeepers";
  const copy = useTranslations(`Chat.communities.${copyNamespace}`);
  const isHive = copyNamespace === "beekeepers";
  const benefitColor = isHive ? "bg-comb-400/15 text-comb-400" : "bg-forest-300/15 text-forest-300";

  return (
    <article className="community-screen min-h-dvh bg-forest-900 text-forest-50">
      <header className="relative isolate mx-auto flex min-h-100 max-w-6xl flex-col justify-between gap-28 px-6 pt-[max(24px,env(safe-area-inset-top))] pb-5 sm:min-h-110 sm:gap-36 sm:px-10">
        <PhotoBackdrop src={community.cover} sizes="(min-width: 1152px) 1152px, 100vw" fadeTo="forest" />
        <div className="flex items-center justify-between gap-4">
          <CommunityBackLink />
          <button type="button" onClick={onJoin} disabled={updating} className="min-h-12 rounded-pill bg-accent px-6 font-semibold text-on-accent hover:bg-accent-press">
            {t("join")}
          </button>
        </div>
        <div className="min-w-0">
          <ChatSpaceAvatar id={community.id} kind={community.kind} prominent />
          <h1 className="mt-4 font-display text-4xl leading-tight sm:text-6xl">{copy("name")}</h1>
          <p className="mt-1 text-lg text-forest-100">{copy("description")}</p>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 pt-3 pb-[max(24px,env(safe-area-inset-bottom))] sm:px-10">
        <div className="max-w-2xl">
          <p className="text-base leading-relaxed text-forest-50 sm:text-lg">{copy("intro")}</p>
          <ul className="mt-4 divide-y divide-white/10 border-y border-white/10">
            {benefits.map(({ key, Icon }) => (
              <li key={key} className="flex items-center gap-4 py-3.5">
                <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${benefitColor}`}>
                  <Icon size={21} aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold">{copy(`benefits.${key}.title`)}</p>
                  <p className="text-sm leading-relaxed text-forest-100">{copy(`benefits.${key}.body`)}</p>
                </div>
              </li>
            ))}
          </ul>
          <button type="button" onClick={onJoin} disabled={updating} className="mt-6 min-h-14 w-full rounded-pill bg-accent px-6 font-semibold text-on-accent shadow-float hover:bg-accent-press">
            {t("joinSpace")}
          </button>
          {error ? <p role="alert" className="mt-3">{error}</p> : null}
          <p className="mt-2 text-center text-sm text-forest-200">{t("communityGuideline")}</p>
        </div>
      </div>
    </article>
  );
}
