"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { PaperPlane, ArrowLeft, Users, Hash, Lock, DotsThreeVertical } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";

interface Message {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  body: string;
  createdAt: string;
  isCurrentUser: boolean;
}

interface ChatSpaceDetailProps {
  space: {
    id: string;
    name: string;
    description: string;
    kind: "community" | "group";
    visibility: "public" | "private";
    memberCount: number;
    isSystem: boolean;
    isMember: boolean;
    myRole?: "owner" | "admin" | "moderator" | "member";
  };
  messages: Message[];
  currentUserId: string;
  onSendMessage: (body: string) => Promise<void>;
  onJoin: () => Promise<void>;
  onLeave: () => Promise<void>;
  isLoading?: boolean;
}

export function ChatSpaceDetail({
  space,
  messages,
  currentUserId,
  onSendMessage,
  onJoin,
  onLeave,
  isLoading = false,
}: ChatSpaceDetailProps) {
  const t = useTranslations("Chat");
  const router = useRouter();
  const pathname = usePathname();
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;
    setIsSending(true);
    try {
      await onSendMessage(newMessage.trim());
      setNewMessage("");
    } finally {
      setIsSending(false);
    }
  };

  const handleJoin = async () => {
    await onJoin();
    router.refresh();
  };

  const handleLeave = async () => {
    if (confirm(t("confirmLeave"))) {
      await onLeave();
      router.push("/chats");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-120px)] min-h-[500px]">
      {/* Space Header */}
      <header className="flex items-center gap-4 border-b border-line bg-raised/80 px-4 py-3 sticky top-0 z-10 backdrop-blur-sm">
        <Link
          href="/chats"
          className="p-2 rounded-lg text-subtle hover:text-text hover:bg-sunken transition-colors md:hidden"
          aria-label={t("back")}
        >
          <ArrowLeft size={24} />
        </Link>
        <div className="flex shrink-0 items-center justify-center size-12 rounded-xl bg-honey-100 text-forest-900 dark:bg-forest-800 dark:text-mint">
          {space.kind === "community" ? <Users size={24} weight="fill" /> : <Hash size={24} weight="fill" />}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-semibold truncate">{space.name}</h1>
          <p className="text-xs text-muted truncate">
            {space.memberCount.toLocaleString()} {t("members")} · {space.kind} · {space.visibility}
          </p>
        </div>
        {!space.isMember && space.visibility === "public" && (
          <button
            onClick={handleJoin}
            className="shrink-0 rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:bg-accent-press"
          >
            {t("join")}
          </button>
        )}
        {space.isMember && space.myRole !== "owner" && (
          <button
            onClick={handleLeave}
            className="shrink-0 rounded-pill border border-line px-4 py-2 text-sm font-medium text-text hover:bg-sunken"
          >
            {t("leave")}
          </button>
        )}
      </header>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        role="log"
        aria-live="polite"
        aria-label={t("messages")}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="mx-auto size-8 rounded-full border-3 border-accent border-t-transparent animate-spin" />
              <p className="mt-4 text-subtle">{t("loadingMessages")}</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mx-auto size-16 rounded-full bg-honey-100 flex items-center justify-center text-forest-900 dark:bg-forest-800 dark:text-mint">
              <Hash size={32} />
            </div>
            <h2 className="mt-4 font-display text-xl">{t("noMessagesTitle")}</h2>
            <p className="mt-2 max-w-xs text-subtle">{t("noMessagesBody")}</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.isCurrentUser ? "flex-row-reverse" : ""}`}
              >
                {!message.isCurrentUser && (
                  <div className="shrink-0 size-8 rounded-full bg-honey-100 flex items-center justify-center text-forest-900 dark:bg-forest-800 dark:text-mint">
                    {message.userAvatar ? (
                      <img src={message.userAvatar} alt="" className="size-full rounded-full" />
                    ) : (
                      <span className="text-sm font-medium">
                        {message.userName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                )}
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 ${
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

      {/* Message Input */}
      {space.isMember && (
        <form onSubmit={handleSend} className="border-t border-line bg-raised/80 p-4 backdrop-blur-sm">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={t("messagePlaceholder")}
              className="flex-1 min-h-12 rounded-pill border border-line bg-sunken px-4 py-2 text-text placeholder:text-muted focus:border-link focus:outline-none"
              disabled={isSending}
              autoComplete="off"
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
      )}
    </div>
  );
}