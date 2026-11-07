import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("Shell");
  return (
    <section aria-busy="true" aria-label={t("loading")} className="space-y-6">
      <p role="status" className="text-subtle">{t("loading")}</p>
      <div aria-hidden className="shell-skeleton w-48" />
      <div aria-hidden className="shell-skeleton min-h-80" />
      <div aria-hidden className="grid gap-6 sm:grid-cols-2"><div className="shell-skeleton min-h-40" /><div className="shell-skeleton min-h-40" /></div>
    </section>
  );
}
