import { ArrowLeft, Hexagon, Leaf } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { RequireAccount } from "@/components/auth/require-account";
import { PhotoBackdrop } from "@/components/ui/photo-backdrop";

const topics = [
  {
    key: "hive",
    Icon: Hexagon,
    hint: "hiveHint",
    photo: "/photos/hive-frame.webp",
    badge: "bg-white/20 text-on-brand",
    terms: /\b(?:bee(?:s|hives?)?|hives?|apiar(?:y|ies)|honeycomb|comb|brood|frames?|varroa|mites?|wax moths?)\b/iu,
  },
  {
    key: "crop",
    Icon: Leaf,
    hint: "cropHint",
    photo: "/photos/glossy-leaves.webp",
    badge: "bg-accent text-on-accent",
    terms: /\b(?:crops?|leaves|leaf|plants?|stems?|fruits?|fields?|cassava|maize|rice|cocoa|tomato(?:es)?|aphids?|armyworms?|nutrients?)\b/iu,
  },
] as const;

const generalTopics = /\b(?:pests?|damage|diseases?|stress|health)\b/iu;

export default async function ScanPage({ searchParams }: PageProps<"/scan">) {
  const t = await getTranslations("Scan");
  const { subject, q } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 80) : "";
  const selected = topics.find(({ key }) => key === subject);
  const matches = topics.filter(({ terms }) => terms.test(query));
  const visibleTopics = query
    ? matches.length === 0 && generalTopics.test(query) ? topics : matches
    : selected ? [selected] : topics;

  return (
    <RequireAccount><main className="min-h-dvh bg-app px-5 pb-10 pt-[max(20px,env(safe-area-inset-top))] text-app-text md:px-10">
      <div className="mx-auto max-w-5xl">
        <Link className="inline-flex min-h-12 items-center gap-2 rounded-pill pr-4 font-semibold text-link hover:underline" href="/">
          <ArrowLeft aria-hidden size={20} />
          {t("back")}
        </Link>
        <header className="mt-4 max-w-2xl">
          <h1 className="font-display text-4xl leading-tight text-balance md:text-5xl">{t(query ? "searchTitle" : "title")}</h1>
          <p className="mt-3 text-base text-subtle sm:text-lg">
            {query ? t(visibleTopics.length ? "searchMatches" : "searchEmpty", { query }) : t("body")}
          </p>
          <p className="mt-2 text-sm text-muted">{t("availableLater")}</p>
        </header>
        <div id="photo-check-topics" className={`mt-6 grid gap-4 sm:gap-5 ${visibleTopics.length === 1 ? "max-w-xl" : "md:grid-cols-2"}`}>
          {visibleTopics.map(({ key, Icon, hint, photo, badge }) => (
            <section key={key} className="relative isolate flex min-h-56 flex-col items-start justify-end gap-2 overflow-hidden rounded-xl bg-brand p-5 text-on-brand shadow-card sm:min-h-72 sm:p-6">
              <PhotoBackdrop src={photo} sizes="(min-width: 1100px) 520px, (min-width: 768px) 48vw, calc(100vw - 40px)" />
              <span className={`mb-1 grid size-11 place-items-center rounded-md ${badge}`}><Icon aria-hidden size={25} /></span>
              <h2 className="font-display text-3xl leading-tight">{t(key)}</h2>
              <p className="max-w-md text-sm text-on-brand/90 sm:text-base">{t(hint)}</p>
            </section>
          ))}
        </div>
        {query || selected ? (
          <div className="mt-4">
            <Link href="/scan" className="inline-flex min-h-12 items-center rounded-pill border border-line px-5 font-semibold text-link hover:bg-sunken">
              {t("showAll")}
            </Link>
          </div>
        ) : null}
        <p className="mt-5 max-w-2xl rounded-md border border-line bg-raised p-4 text-sm text-subtle">
          {t("notice")}
        </p>
      </div>
    </main></RequireAccount>
  );
}
