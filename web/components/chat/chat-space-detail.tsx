"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatCircle, PaperPlane } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";
import { CommunityBackLink, CommunityPreview } from "@/components/chat/community-preview";
import { ChatSpaceAvatar } from "@/components/chat/chat-space-avatar";
import { PhotoBackdrop } from "@/components/ui/photo-backdrop";
import { BrandLoader } from "@/components/ui/brand-loader";

const starters = ["hello", "tip", "question", "update"] as const;

export interface Message {
  id: string;
  userName: string;
  body: string;
  createdAt: string;
  isCurrentUser: boolean;
  pending?: boolean;
}

interface CommunityData {
  id: string;
  copy: string;
  kind: "community" | "group";
  visibility: "public" | "private";
  cover: string;
}

interface SpaceData {
  id: string;
  name: string;
  description: string;
  kind: "community" | "group";
  memberCount?: number;
  isMember: boolean;
  myRole?: "owner" | "admin" | "moderator" | "member";
}

interface ChatSpaceDetailProps {
  community: CommunityData;
  space: SpaceData;
  messages: Message[];
  onSendMessage: (body: string) => Promise<void>;
  onJoin: () => void;
  onLeave: () => void;
  updating?: boolean;
  historyError?: string;
  actionError?: string;
  loadMore?: () => void;
  isLoading?: boolean;
}

export function ChatSpaceDetail({
  community,
  space,
  messages,
  onSendMessage,
  onJoin,
  onLeave,
  isLoading = false,
  updating = false,
  historyError,
  actionError,
  loadMore,
}: ChatSpaceDetailProps) {
  const t = useTranslations("Chat");
  // Use the community copy for translation namespace, fallback to generic
  const copyNamespace = community.copy === "beekeepers" ? "beekeepers" : community.copy === "general-farmers" ? "farmers" : "beekeepers";
  const copy = useTranslations(`Chat.communities.${copyNamespace}`);
  const [newMessage, setNewMessage] = useState("");
  const [sendError, setSendError] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, []);

  const latestMessageId = messages.at(-1)?.id;
  useEffect(() => {
    scrollToBottom();
  }, [latestMessageId, scrollToBottom]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;
    setIsSending(true);
    setSendError(false);
    try {
      await onSendMessage(newMessage.trim());
      setNewMessage("");
    } catch {
      setSendError(true);
    } finally {
      setIsSending(false);
    }
  };

  const handleLeave = async () => {
    if (confirm(t("confirmLeave"))) {
      onLeave();
    }
  };

  if (!space.isMember) return <CommunityPreview community={community} onJoin={onJoin} updating={updating} error={actionError} />;

  return (
    <div className="community-screen bg-app">
      <div className="mx-auto flex h-dvh min-h-96 max-w-6xl flex-col">
        <header className="relative isolate flex shrink-0 flex-wrap items-center gap-3 bg-forest-900 px-4 pt-[max(20px,env(safe-area-inset-top))] pb-8 text-forest-50 sm:px-8">
          <PhotoBackdrop src={community.cover} sizes="(min-width: 1152px) 1152px, 100vw" fadeTo="forest" />
          <CommunityBackLink />
          <ChatSpaceAvatar id={space.id} kind={space.kind} prominent />
          <div className="min-w-0 flex-1">
            <h1 className="break-words font-semibold sm:text-xl">{space.name}</h1>
            <p className="text-sm text-forest-100">{space.description}</p>
            {space.memberCount !== undefined ? <p className="text-xs text-forest-100">{t("memberCount", { count: space.memberCount })}</p> : null}
          </div>
          {space.myRole !== "owner" ? (
            <button type="button" onClick={handleLeave} disabled={updating} className="min-h-12 shrink-0 rounded-pill border border-white/30 bg-forest-950/55 px-4 text-sm font-semibold hover:bg-forest-950/80">
              {t("leave")}
            </button>
          ) : null}
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-8" role="log" aria-live="polite" aria-label={t("messages")}>
          {historyError ? <p role="alert">{historyError}</p> : null}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <BrandLoader size={40} label={t("loadingMessages")} />
            </div>
          ) : messages.length === 0 && !historyError ? (
            <div className="flex min-h-full flex-col items-center justify-center py-6 text-center">
              <div className="grid size-20 place-items-center rounded-full border-8 border-forest-900/20 bg-accent text-on-accent">
                <ChatCircle size={29} aria-hidden="true" />
              </div>
              <h2 className="mt-4 font-display text-3xl">{t("noMessagesTitle")}</h2>
              <p className="mt-2 text-subtle">{t("noMessagesBody")}</p>
              <div className="mt-5 flex max-w-sm flex-wrap justify-center gap-2">
                {starters.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setNewMessage(copy(`starters.${key}`));
                      composer.current?.focus();
                    }}
                    className="min-h-12 rounded-pill border border-line bg-raised px-4 text-sm font-medium hover:bg-sunken"
                  >
                    {t(`starters.${key === "tip" ? copyNamespace === "beekeepers" ? "hiveTip" : "growingTip" : key}`)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {loadMore ? <button type="button" className="min-h-12 text-link" onClick={loadMore}>{t("olderMessages")}</button> : null}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.isCurrentUser ? "flex-row-reverse" : ""}`}
                >
                  {!message.isCurrentUser && (
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-bark-100 text-bark-900 dark:bg-bark-900 dark:text-bark-100">
                      <span className="text-sm font-medium">{message.userName.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div
                    className={`max-w-[78%] min-w-0 break-words rounded-2xl px-4 py-2 ${
                      message.isCurrentUser
                        ? "bg-accent text-on-accent rounded-tr-sm"
                        : "bg-raised text-text rounded-tl-sm"
                    }`}
                  >
                    {!message.isCurrentUser && (
                      <p className="text-xs font-medium text-subtle mb-1">{message.userName}</p>
                    )}
                    <p className="whitespace-pre-wrap">{message.body}</p>
                    <time className={`mt-1 block text-xs ${message.isCurrentUser ? "text-on-accent/70" : "text-muted"}`}>
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                    {message.pending ? <p className="text-xs">{t("messageQueued")}</p> : null}
                  </div>
                  {message.isCurrentUser && (
                    <div className="shrink-0 size-8 rounded-full bg-accent flex items-center justify-center text-on-accent">
                      <span className="text-sm font-medium">
                        {message.userName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
        <form onSubmit={handleSend} className="shrink-0 border-t border-line bg-raised px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-8">
          {actionError || sendError ? <p role="alert" className="mb-2 text-sm">{sendError ? t("messageQueueError") : actionError}</p> : null}
          <div className="flex gap-2">
            <input
              ref={composer}
              type="text"
              aria-label={t("messagePlaceholder")}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={t("messagePlaceholder")}
              className="min-w-0 flex-1 min-h-12 rounded-pill border border-line bg-sunken px-4 py-2 text-text placeholder:text-muted focus:border-link focus:outline-none"
              disabled={isSending}
              autoComplete="off"
              maxLength={4000}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || isSending}
              className="shrink-0 size-12 rounded-full bg-accent flex items-center justify-center text-on-accent hover:bg-accent-press disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={t("send")}
            >
              <PaperPlane size={20} weight="fill" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
