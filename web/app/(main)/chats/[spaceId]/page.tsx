"use client";

import { useState } from "react";
import { redirect, useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { ChatSpaceDetail, type Message } from "@/components/chat/chat-space-detail";
import { pilotCommunities } from "@/lib/chat/communities";

export default function ChatSpacePage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const community = pilotCommunities.find(({ id }) => id === spaceId);

  if (!community) redirect("/chats");

  return <PilotCommunityRoom key={community.id} community={community} />;
}

function PilotCommunityRoom({ community }: { community: (typeof pilotCommunities)[number] }) {
  const t = useTranslations("Chat");
  const [isMember, setIsMember] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  async function handleSendMessage(body: string) {
    setMessages((previous) => [...previous, {
      id: crypto.randomUUID(),
      userName: t("you"),
      body,
      createdAt: new Date().toISOString(),
      isCurrentUser: true,
    }]);
  }

  return (
    <ChatSpaceDetail
      space={{
        ...community,
        name: t(`communities.${community.copy}.name`),
        description: t(`communities.${community.copy}.description`),
        isMember,
      }}
      messages={messages}
      onSendMessage={handleSendMessage}
      onJoin={async () => setIsMember(true)}
      onLeave={async () => setIsMember(false)}
    />
  );
}
