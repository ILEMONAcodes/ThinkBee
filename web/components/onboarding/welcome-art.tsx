import Image from "next/image";
import { useTranslations } from "next-intl";
import { getPlaceholder } from "@/lib/images/placeholders";

export const welcomePanels = ["scan", "records", "community"] as const;
type Panel = typeof welcomePanels[number];

const photos: Record<Panel, string> = {
  scan: "/onboarding/welcome-beekeeper.webp",
  records: "/onboarding/welcome-leaf.webp",
  community: "/onboarding/welcome-apiary.webp",
};

export function WelcomeArt({ panel }: Readonly<{ panel: Panel }>) {
  const t = useTranslations("Welcome");
  const src = photos[panel];
  const placeholder = getPlaceholder(src);
  return (
    <div className="welcome-photo" data-panel={panel}>
      <Image
        key={panel}
        alt={t(`${panel}.alt`)}
        src={src}
        fill
        sizes="(min-width: 1200px) 650px, (min-width: 900px) 55vw, (min-width: 600px) 600px, 100vw"
        priority={panel === "scan"}
        placeholder="blur"
        blurDataURL={placeholder}
      />
    </div>
  );
}
