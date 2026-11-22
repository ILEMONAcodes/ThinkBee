import { getTranslations } from "next-intl/server";
import { BrandLoader } from "@/components/ui/brand-loader";

export default async function Loading() {
  const t = await getTranslations("Setup");
  return (
    <main className="setup-page grid place-items-center min-h-[50vh]">
      <div className="text-center space-y-4" role="status" aria-label={t("loading")}>
        <BrandLoader size={56} />
      </div>
    </main>
  );
}
