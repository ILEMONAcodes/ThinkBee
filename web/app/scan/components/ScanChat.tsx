"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { PaperPlane, ArrowLeft, Image as ImageIcon, X } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { useIdentity } from "@/components/auth/account-provider";
import { apiRequest, type ApiSchema } from "@/lib/api/client";
import { uploadScanPhoto } from "@/lib/scans/upload";

import { BrandLoader } from "@/components/ui/brand-loader";
import { BrandMark } from "@/components/ui/brand-mark";

interface Message {
  id: string;
  role: "user" | "assistant";
  body: string;
  createdAt: string;
  imageKeys?: string[];
}

interface ScanChatProps {
  scanId: string;
}

export function ScanChat({ scanId }: ScanChatProps) {
  const t = useTranslations("Scan");
  const router = useRouter();
  const { owner } = useIdentity();
  const [sendError, setSendError] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [attachedImages, setAttachedImages] = useState<File[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
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
    if (!owner || (!newMessage.trim() && attachedImages.length === 0) || isSending) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      body: newMessage.trim(),
      createdAt: new Date().toISOString(),
      imageKeys: attachedImages.length ? attachedImages.map(() => "pending") : undefined,
    };
    setIsSending(true);
    setSendError(false);

    try {
      const imageKeys = await Promise.all(attachedImages.map((file) => uploadScanPhoto(file, owner)));
      const data = await apiRequest<ApiSchema["AnswerResult"]>(
        `/scans/${encodeURIComponent(scanId)}/chat`, owner, "POST",
        { text: userMessage.body, image_keys: imageKeys }, { timeoutMs: 60_000 },
      );
      if (data.status === "unavailable") throw new Error("Unavailable");
      setMessages((prev) => [...prev, userMessage, {
        id: crypto.randomUUID(),
        role: "assistant",
        body: [data.answer, ...data.next_steps, ...data.warnings].join("\n\n"),
        createdAt: new Date().toISOString(),
      }]);
      setNewMessage("");
      setAttachedImages([]);
    } catch {
      setSendError(true);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (files: FileList) => {
    const validFiles: File[] = [];
    for (const file of Array.from(files)) {
      if (file.type.startsWith("image/") && file.size <= 10 * 1024 * 1024) {
        validFiles.push(file);
      }
    }
    if (validFiles.length > 0) {
      setAttachedImages((prev) => [...prev, ...validFiles].slice(0, 3));
    }
    setShowAttachMenu(false);
  };

  return (
    <div className="flex min-h-96 flex-col h-[calc(100dvh-60px)]">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-line bg-raised/80 px-4 py-3 sticky top-0 z-10 backdrop-blur-sm">
        <button
          onClick={() => router.push(`/scan?scanId=${encodeURIComponent(scanId)}`)}
          className="flex size-12 shrink-0 items-center justify-center rounded-full border border-line text-subtle transition-colors hover:bg-sunken hover:text-app-text"
          aria-label={t("backToResult")}
        >
          <ArrowLeft size={24} />
        </button>
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-forest-700"><BrandMark kind="short" surface="dark" width={30} /></span>
        <div className="min-w-0 flex-1">
          <h1 className="font-semibold">{t("assistantName")}</h1>
          <p className="text-sm text-subtle">{t("assistantSubtitle")}</p>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        role="log"
        aria-live="polite"
        aria-label={t("messages")}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent/10 text-accent">
              <ImageIcon size={32} aria-hidden="true" />
            </div>
            <h2 className="mt-4 font-display text-xl">{t("chatWelcomeTitle")}</h2>
            <p className="mt-2 max-w-xs text-subtle">{t("chatWelcomeBody")}</p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {[
                t("chatSuggestion1"),
                t("chatSuggestion2"),
                t("chatSuggestion3"),
              ].map((suggestion, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setNewMessage(suggestion); }}
                  className="rounded-xl border border-line bg-raised px-4 py-2 text-sm text-text hover:bg-sunken hover:border-link transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
              >
                {message.role !== "user" && (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-bark-100 text-bark-900 dark:bg-bark-900 dark:text-bark-100">
                    <BrandMark kind="short" width={22} />
                  </div>
                )}
                <div
                  className={`max-w-[85%] min-w-0 break-words rounded-2xl border border-line px-4 py-3 ${
                    message.role === "user"
                      ? "bg-accent text-on-accent rounded-br-sm"
                      : "bg-raised text-text rounded-bl-sm"
                  }`}
                >
                  {message.imageKeys && message.imageKeys.length > 0 && (
                    <div className="flex gap-1 mb-2">
                      {message.imageKeys.slice(0, 3).map((_, idx) => (
                        <div key={idx} className="size-12 rounded-lg bg-sunken" aria-hidden="true" />
                      ))}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{message.body}</p>
                  <time className={`mt-1 block text-xs ${message.role === "user" ? "text-on-accent/70" : "text-muted"}`}>
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </time>
                </div>
                {message.role === "user" && (
                  <div className="shrink-0 size-8 rounded-full bg-accent flex items-center justify-center text-on-accent">
                    <span className="text-sm font-medium">You</span>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}

        {isSending && (
          <div className="flex items-center justify-center">
            <BrandLoader size={32} label={t("aiThinking")} />
          </div>
        )}
      </div>

      {/* Message Input */}
      {sendError ? <p role="alert" className="px-4 text-sm text-subtle">{t("chatError")}</p> : null}
      <form onSubmit={handleSend} className="border-t border-line bg-raised/80 p-4 backdrop-blur-sm">
        {/* Attached Images Preview */}
        {attachedImages.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
            {attachedImages.map((file, idx) => (
              <div key={idx} className="relative flex-shrink-0 size-16 rounded-lg overflow-hidden border border-line">
                <img src={URL.createObjectURL(file)} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => setAttachedImages((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute top-1 right-1 size-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                  aria-label={t("remove")}
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="shrink-0 size-12 rounded-full border border-line bg-raised flex items-center justify-center text-subtle hover:bg-sunken hover:text-text transition-colors"
            aria-label={t("attachImage")}
            aria-expanded={showAttachMenu}
          >
            <ImageIcon size={22} aria-hidden="true" />
          </button>
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
            disabled={(!newMessage.trim() && attachedImages.length === 0) || isSending}
            className="shrink-0 size-12 rounded-full bg-accent flex items-center justify-center text-on-accent hover:bg-accent-press disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t("send")}
          >
            <PaperPlane size={20} weight="fill" />
          </button>
        </div>

        {/* Attach Menu */}
        {showAttachMenu && (
          <div className="mt-3 flex gap-2">
            <label className="inline-flex min-h-10 items-center gap-2 rounded-pill border border-line bg-raised px-3 py-1 text-sm text-text hover:bg-sunken cursor-pointer">
              <BrandMark kind="short" width={22} />
              {t("attachPhoto")}
              <input
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                className="sr-only"
              />
            </label>
            <button
              type="button"
              onClick={() => setShowAttachMenu(false)}
              className="inline-flex min-h-10 items-center gap-2 rounded-pill border border-line bg-raised px-3 py-1 text-sm text-text hover:bg-sunken"
            >
              {t("cancel")}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}