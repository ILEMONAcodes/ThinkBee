import { getTranslations } from "next-intl/server";
import { BrandLoader } from "@/components/ui/brand-loader";

export default async function Loading() {
  const t = await getTranslations("Shell");
  return (
    <section aria-busy="true" aria-label={t("loading")} className="space-y-6">
      <div className="flex items-center gap-3">
        <BrandLoader size={36} />
        <div className="flex-1 h-4 rounded bg-sunken animate-pulse" />
      </div>
      <div aria-hidden className="shell-skeleton min-h-80" />
      <div aria-hidden className="grid gap-6 sm:grid-cols-2"><div className="shell-skeleton min-h-40" /><div className="shell-skeleton min-h-40" /></div>
    </section>
  );
}
