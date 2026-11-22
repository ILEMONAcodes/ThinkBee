import { Hexagon } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";

type FeatureKey = "adminBody" | "adminTitle" | "chatsBody" | "chatsTitle" | "meBody" | "meTitle" | "recordsBody" | "recordsTitle";

export async function FeaturePlaceholder({ bodyKey, titleKey }: Readonly<{ bodyKey: FeatureKey; titleKey: FeatureKey }>) {
  const t = await getTranslations("Feature");
  return (
    <section className="grid min-h-[70dvh] place-items-center">
      <div className="max-w-xl rounded-lg bg-bark-700 p-8 text-center text-on-brand shadow-card dark:bg-bark-900 sm:p-12">
        <span className="comb-cell mx-auto grid size-16 place-items-center bg-accent text-on-accent">
          <Hexagon aria-hidden size={32} />
        </span>
        <h1 className="mt-6 font-display text-4xl">{t(titleKey)}</h1>
        <p className="mt-4 text-lg">{t(bodyKey)}</p>
        <p className="mt-8 text-sm font-medium text-bark-100">{t("emptyLabel")}</p>
      </div>
    </section>
  );
}
