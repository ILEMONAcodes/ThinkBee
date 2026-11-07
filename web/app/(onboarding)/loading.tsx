import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("Setup");
  return <main className="setup-page grid place-items-center"><p role="status">{t("loading")}</p></main>;
}
