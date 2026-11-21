import { getTranslations } from "next-intl/server";
import { ChatsList } from "@/components/chat/chats-list";

export default async function ChatsPage() {
  const t = await getTranslations("Chat");

  // Mock data for now - will be replaced with actual API calls
  const spaces = [
    {
      id: "beekeepers",
      name: "Beekeepers",
      description: "A community for beekeepers to share knowledge, ask questions, and connect.",
      kind: "community" as const,
      visibility: "public" as const,
      memberCount: 12543,
      isSystem: true,
    },
    {
      id: "general-farmers",
      name: "General Farmers",
      description: "A community for crop farmers to share knowledge, ask questions, and connect.",
      kind: "community" as const,
      visibility: "public" as const,
      memberCount: 28912,
      isSystem: true,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-link">{t("eyebrow")}</p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">{t("title")}</h1>
        <p className="mt-3 max-w-xl text-subtle">{t("description")}</p>
      </header>
      <ChatsList spaces={spaces} mySpaceIds={[]} />
    </div>
  );
}