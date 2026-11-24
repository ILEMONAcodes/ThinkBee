"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useIdentity } from "@/components/auth/account-provider";
import { ChatsList } from "@/components/chat/chats-list";
import { apiRequest, type ApiSchema } from "@/lib/api/client";
import { BrandLoader } from "@/components/ui/brand-loader";

interface ChatSpace {
  id: string;
  name: string;
  description: string;
  kind: "community" | "group";
  visibility: "public" | "private";
  cover: string | null;
  is_system: boolean;
  member_count: number;
  avatar_key: string | null;
}

export default function ChatsPage() {
  const t = useTranslations("Chat");
  const { owner } = useIdentity();
  const [spaces, setSpaces] = useState<ChatSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!owner) return;
    async function load() {
      try {
        const data = await apiRequest<ApiSchema["ChatSpaceListResponse"]>("/chat/spaces/public", owner as string);
        setSpaces(data.spaces.map(s => ({
          ...s,
          cover: s.avatar_key ?? s.cover ?? "",
          avatar_key: s.avatar_key ?? s.cover ?? "",
        })));
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [owner]);

  if (loading && owner) {
    return (
      <div className="max-w-6xl mx-auto">
        <header className="mb-5 sm:mb-7">
          <h1 className="font-display text-4xl sm:text-5xl">{t("title")}</h1>
        </header>
        <div className="grid min-h-[400px] place-items-center">
          <BrandLoader size={48} label={t("loadingMessages")} />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <header className="mb-5 sm:mb-7">
          <h1 className="font-display text-4xl sm:text-5xl">{t("title")}</h1>
        </header>
        <div className="space-y-4 p-6">
          <p role="alert">{t("communityLoadError")}</p>
          <button type="button" className="min-h-12 text-link" onClick={() => window.location.reload()}>{t("retry")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-5 sm:mb-7">
        <h1 className="font-display text-4xl sm:text-5xl">{t("title")}</h1>
      </header>
      <ChatsList spaces={spaces} mySpaceIds={[]} />
    </div>
  );
}
