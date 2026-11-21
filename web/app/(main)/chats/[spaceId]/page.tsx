"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ChatSpaceDetail } from "@/components/chat/chat-space-detail";

interface Space {
  id: string;
  name: string;
  description: string;
  kind: "community" | "group";
  visibility: "public" | "private";
  memberCount: number;
  isSystem: boolean;
  isMember: boolean;
  myRole?: "owner" | "admin" | "moderator" | "member";
}

interface Message {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  body: string;
  createdAt: string;
  isCurrentUser: boolean;
}

export default function ChatSpacePage() {
  const params = useParams();
  const router = useRouter();
  const spaceId = params.spaceId as string;
  const [space, setSpace] = useState<Space | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("current-user-id"); // Would come from auth

  // Mock data for now
  const mockSpaces: Record<string, Space> = {
    beekeepers: {
      id: "beekeepers",
      name: "Beekeepers",
      description: "A community for beekeepers to share knowledge, ask questions, and connect.",
      kind: "community",
      visibility: "public",
      memberCount: 12543,
      isSystem: true,
      isMember: false,
    },
    "general-farmers": {
      id: "general-farmers",
      name: "General Farmers",
      description: "A community for crop farmers to share knowledge, ask questions, and connect.",
      kind: "community",
      visibility: "public",
      memberCount: 28912,
      isSystem: true,
      isMember: false,
    },
  };

  useEffect(() => {
    const foundSpace = mockSpaces[spaceId];
    if (!foundSpace) {
      router.push("/chats");
      return;
    }
    setSpace(foundSpace);
    setIsLoading(false);
  }, [spaceId, router]);

  const handleSendMessage = async (body: string) => {
    // Would call API
    const newMessage: Message = {
      id: crypto.randomUUID(),
      userId: currentUserId,
      userName: "You",
      body,
      createdAt: new Date().toISOString(),
      isCurrentUser: true,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleJoin = async () => {
    if (space) {
      setSpace({ ...space, isMember: true, myRole: "member" });
    }
  };

  const handleLeave = async () => {
    if (space) {
      setSpace({ ...space, isMember: false, myRole: undefined });
    }
  };

  if (!space) {
    return null;
  }

  return (
    <ChatSpaceDetail
      space={space}
      messages={messages}
      currentUserId={currentUserId}
      onSendMessage={handleSendMessage}
      onJoin={handleJoin}
      onLeave={handleLeave}
      isLoading={isLoading}
    />
  );
}