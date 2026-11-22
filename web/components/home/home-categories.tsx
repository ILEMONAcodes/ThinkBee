import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

const categories = [
  { subject: "hive", photo: "/photos/brood-comb.webp", label: "beehives" },
  { subject: "crop", photo: "/photos/leaf-veins.webp", label: "crops" },
] as const;

export async function HomeCategories() {
  const t = await getTranslations("Home");

  return (
    <section aria-labelledby="home-categories-title" className="min-w-0">
      <div className="mb-2 flex min-h-12 items-center justify-between gap-3">
        <h2 id="home-categories-title" className="font-display text-2xl sm:text-3xl">{t("categories")}</h2>
        <Link href="/scan#photo-check-topics" aria-label={t("seeAllCategories")} className="inline-flex min-h-12 shrink-0 items-center px-1 text-sm font-semibold text-link hover:underline">
          {t("seeAll")}
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-4">
        {categories.map(({ subject, photo, label }) => (
          <Link
            key={subject}
            href={`/scan?subject=${subject}`}
            className="relative isolate flex aspect-[1.3] min-h-28 items-end overflow-hidden rounded-lg bg-brand p-3 font-semibold text-on-brand shadow-card sm:p-4 sm:text-lg lg:aspect-auto lg:min-h-46"
          >
            <Image
              src={photo}
              alt=""
              fill
              sizes="(min-width: 1280px) 425px, (min-width: 1024px) 33vw, calc((100vw - 52px) / 2)"
              className="-z-10 object-cover"
            />
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-t from-forest-950 via-forest-950/5 to-transparent" />
            <span className="wrap-break-word">{t(label)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
