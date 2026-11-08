import Image from "next/image";
import { useTranslations } from "next-intl";

import { BrandMark } from "@/components/ui/brand-mark";

export const welcomePanels = ["scan", "records", "community"] as const;
type Panel = typeof welcomePanels[number];
const photos = { scan: "hive", records: "field", community: "apiary" };
const details: Record<Panel, Panel> = { scan: "records", records: "community", community: "scan" };

export function WelcomeArt({ panel }: Readonly<{ panel: Panel }>) {
  const t = useTranslations("Welcome");
  const detail = details[panel];
  return <div className="welcome-art" data-panel={panel}>
    <svg className="welcome-flight" viewBox="0 0 560 540" fill="none" aria-hidden="true">
      <path d="M22 340C-20 170 213 69 347 98c128 27 97 135 27 139-67 3-85-72-12-96 99-33 211 52 170 183-31 98-113 171-258 170" />
    </svg>
    <figure className="welcome-photo welcome-photo-main">
      <Image key={panel} alt={t(`${panel}.alt`)} src={`/onboarding/${photos[panel]}.webp`} fill sizes="(min-width: 1024px) 360px, (min-width: 600px) 300px, 55vw" className="object-cover" priority={panel === "scan"} />
    </figure>
    <div className="welcome-bee"><BrandMark kind="short" width={180} /></div>
    <figure className="welcome-photo welcome-photo-detail">
      <Image key={detail} alt={t(`${detail}.alt`)} src={`/onboarding/${photos[detail]}.webp`} fill sizes="(min-width: 1024px) 230px, (min-width: 600px) 200px, 34vw" className="object-cover" />
    </figure>
  </div>;
}
