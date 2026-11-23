"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { redirect, useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { useIdentity } from "@/components/auth/account-provider";
import { ChatSpaceDetail } from "@/components/chat/chat-space-detail";
import { CommunityBackLink } from "@/components/chat/community-preview";
import { BrandLoader } from "@/components/ui/brand-loader";
import { apiRequest, type ApiSchema } from "@/lib/api/client";
import { markPwaMeaningfulUse } from "@/lib/pwa/meaningful-use";
import { setupDb } from "@/lib/db/onboarding";
import type { PilotCommunity } from "@/lib/chat/communities";

const { chatOutbox } = setupDb;

export default function ChatSpacePage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { owner } = useIdentity();
  if (!owner) return null;
  return <CommunityRoom key={`${owner}/${spaceId}`} spaceId={spaceId} owner={owner} />;
}

function CommunityRoom({ spaceId, owner }: { spaceId: string; owner: string }) {
  const t = useTranslations("Chat");
  const cache = useQueryClient();

  // Fetch all public communities from backend
  const spacesQuery = useQuery({
    queryKey: ["official-communities", owner],
    networkMode: "always",
    queryFn: () => apiRequest<ApiSchema["ChatSpaceListResponse"]>("/chat/spaces/public", owner),
  });

  // Find the space matching the spaceId (which is the backend UUID)
  const space = spacesQuery.data?.spaces.find((entry) => entry.id === spaceId);
  const path = `/chat/spaces/${space?.id}`;

  const membershipKey = ["community-membership", owner, space?.id];
  const messageKey = useMemo(() => ["community-messages", owner, space?.id], [owner, space?.id]);

  const membership = useQuery({
    queryKey: membershipKey,
    networkMode: "always",
    enabled: !!space,
    queryFn: () => apiRequest<ApiSchema["MyMembershipResponse"] | null>(`${path}/me`, owner),
  });

  const member = membership.data?.state === "active";

  const profile = useQuery({
    queryKey: ["community-user", owner],
    enabled: member,
    queryFn: () => apiRequest<ApiSchema["UserResponse"]>("/me", owner),
  });

  const history = useInfiniteQuery({
    queryKey: messageKey,
    enabled: member,
    initialPageParam: "",
    queryFn: ({ pageParam }) =>
      apiRequest<ApiSchema["ChatMessageListResponse"]>(
        `${path}/messages${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`,
        owner,
      ),
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    refetchInterval: 10_000,
  });

  const pending = useLiveQuery(
    () => chatOutbox.where({ owner, spaceId: space?.id ?? "" }).sortBy("createdAt"),
    [owner, space?.id],
  );

  const [syncFailed, setSyncFailed] = useState(false);
  const sending = useRef(false);

  useEffect(() => {
    if (!member || !pending?.length) return;
    async function sync() {
      if (sending.current || !navigator.onLine) return;
      sending.current = true;
      setSyncFailed(false);
      try {
        for (const message of pending ?? []) {
          const saved = await apiRequest<ApiSchema["ChatMessageResponse"]>(`${path}/messages`, owner, "POST", {
            client_id: message.id,
            body: message.body,
          });
          cache.setQueryData<InfiniteData<ApiSchema["ChatMessageListResponse"], string>>(messageKey, (data) => {
            if (!data) return data;
            const [first, ...older] = data.pages;
            if (data.pages.some((page) => page.messages.some(({ id }) => id === saved.id))) return data;
            return { ...data, pages: [{ ...first, messages: [saved, ...first.messages] }, ...older] };
          });
          await chatOutbox.delete(message.id);
          markPwaMeaningfulUse("sent_message");
        }
        await cache.invalidateQueries({ queryKey: messageKey });
      } catch {
        setSyncFailed(true);
      } finally {
        sending.current = false;
      }
    }
    void sync();
    window.addEventListener("online", sync);
    const timer = window.setInterval(sync, 10_000);
    return () => {
      window.removeEventListener("online", sync);
      window.clearInterval(timer);
    };
  }, [cache, member, messageKey, owner, path, pending]);

  const update = useMutation({
    networkMode: "always",
    mutationFn: (join: boolean) =>
      apiRequest<ApiSchema["ChatSpaceMemberResponse"] | undefined>(`${path}/${join ? "join" : "leave"}`, owner, "POST"),
    onSuccess: (data) => cache.setQueryData(membershipKey, data ? { ...data, joined_at: data.created_at } : null),
  });

  const messages = useMemo(() => {
    const saved = history.data?.pages.flatMap((page) => page.messages) ?? [];
    const unique = new Map(saved.map((message) => [message.id, message]));
    return [
      ...[...unique.values()].map((message) => ({
        id: message.id,
        body: message.body,
        createdAt: message.created_at,
        isCurrentUser: message.user_id === profile.data?.id,
        userName: message.user_id === profile.data?.id ? t("you") : t("communityMember"),
      })),
      ...(pending ?? []).filter(({ id }) => !unique.has(id)).map((message) => ({
        ...message,
        userName: t("you"),
        isCurrentUser: true,
        pending: true,
      })),
    ].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  }, [history.data, pending, profile.data?.id, t]);

  // Build community object for ChatSpaceDetail from backend space data
  const community = useMemo(() => {
    if (!space) return null;
    return {
      id: space.id,
      copy: space.name.toLowerCase().replace(/\s+/g, "-"),
      kind: space.kind as "community" | "group",
      visibility: space.visibility as "public" | "private",
      cover: space.avatar_key ?? "",
    };
  }, [space]);

  const spaceDisplay = useMemo(() => {
    if (!space) return null;
    return {
      id: space.id,
      name: space.name,
      description: space.description ?? "",
      kind: space.kind as "community" | "group",
      memberCount: space.member_count,
      isMember: member,
      myRole: membership.data?.role,
    };
  }, [space, member, membership.data?.role]);

  if (spacesQuery.isPending || (space && membership.isPending)) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <BrandLoader size={48} label={t("loadingMessages")} />
      </div>
    );
  }
  if (!space || membership.isError || !community || !spaceDisplay) {
    return (
      <div className="community-screen mx-auto max-w-3xl space-y-4 p-6">
        <CommunityBackLink />
        <p role="alert">{t(!space || !community ? "communityNotFound" : "communityLoadError")}</p>
        <button
          type="button"
          className="min-h-12 text-link"
          onClick={() => void (space ? membership.refetch() : spacesQuery.refetch())}
        >
          {t("retry")}
        </button>
      </div>
    );
  }
  return (
    <ChatSpaceDetail
      community={community}
      space={spaceDisplay}
      messages={messages}
      isLoading={member && (history.isPending || profile.isPending)}
      historyError={history.isError ? t("communityLoadError") : undefined}
      loadMore={history.hasNextPage && !history.isFetchingNextPage ? () => void history.fetchNextPage() : undefined}
      actionError={update.isError ? t("communityActionError") : syncFailed ? t("messageSyncError") : undefined}
      updating={update.isPending}
      onSendMessage={async (body) => {
        await chatOutbox.add({ id: crypto.randomUUID(), owner, spaceId: space.id, body, createdAt: new Date().toISOString() });
      }}
      onJoin={() => update.mutate(true)}
      onLeave={() => update.mutate(false)}
    />
  );
}
