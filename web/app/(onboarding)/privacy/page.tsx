import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";

export default async function PrivacyPage() {
  const t = await getTranslations("Privacy");
  return <OnboardingFrame><article className="setup-narrow"><h1 className="setup-title">{t("title")}</h1>{(["account", "profile", "farms", "device", "chat", "control"] as const).map((item) => <section className="mt-8" key={item}><h2 className="font-display text-2xl">{t(`${item}.title`)}</h2><p className="mt-3 text-subtle">{t(`${item}.body`)}</p></section>)}<Link className="setup-secondary mt-8" href="/sign-in">{t("back")}</Link></article></OnboardingFrame>;
}
