import { Hexagon } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";

type FeatureKey = "adminBody" | "adminTitle" | "chatsBody" | "chatsTitle" | "meBody" | "meTitle" | "recordsBody" | "recordsTitle";

export async function FeaturePlaceholder({ bodyKey, titleKey }: Readonly<{ bodyKey: FeatureKey; titleKey: FeatureKey }>) {
  const t = await getTranslations("Feature");
  return (
    <section className="grid min-h-[70dvh] place-items-center">
      <div className="max-w-xl rounded-lg bg-raised p-8 text-center shadow-card sm:p-12">
        <span className="mx-auto grid size-16 place-items-center rounded-md bg-honey-100 text-forest-900 dark:bg-forest-800 dark:text-mint">
          <Hexagon aria-hidden size={32} />
        </span>
        <h1 className="mt-6 font-display text-4xl">{t(titleKey)}</h1>
        <p className="mt-4 text-lg text-subtle">{t(bodyKey)}</p>
        <p className="mt-8 text-sm font-medium text-muted">{t("emptyLabel")}</p>
      </div>
    </section>
  );
}
