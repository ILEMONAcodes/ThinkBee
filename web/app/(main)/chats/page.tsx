import { getTranslations } from "next-intl/server";
import { ChatsList } from "@/components/chat/chats-list";
import { pilotCommunities } from "@/lib/chat/communities";

export default async function ChatsPage() {
  const t = await getTranslations("Chat");

  const spaces = pilotCommunities.map(({ copy, ...community }) => ({
    ...community,
    name: t(`communities.${copy}.name`),
    description: t(`communities.${copy}.description`),
  }));

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-5 sm:mb-7">
        <h1 className="font-display text-4xl sm:text-5xl">{t("title")}</h1>
      </header>
      <ChatsList spaces={spaces} mySpaceIds={[]} />
    </div>
  );
}
