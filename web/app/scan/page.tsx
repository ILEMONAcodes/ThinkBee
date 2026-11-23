"use client";

import { Suspense } from "react";
import { ArrowLeft, Hexagon, Leaf } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { RequireAccount } from "@/components/auth/require-account";
import { PhotoBackdrop } from "@/components/ui/photo-backdrop";
import { BrandLoader } from "@/components/ui/brand-loader";
import { getPlaceholder } from "@/lib/images/placeholders";
import { ScanUploader } from "./components/ScanUploader";
import { ScanResult } from "./components/ScanResult";
import { ScanChat } from "./components/ScanChat";
import "./scan-upload.css";

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

function ScanPageContent() {
  const t = useTranslations("Scan");
  const router = useRouter();
  const searchParams = useSearchParams();
  const scanId = searchParams.get("scanId");
  const selectedTopic = topics.find(({ key }) => key === searchParams.get("subject"));
  const view = scanId ? (searchParams.get("chat") === "true" ? "chat" : "result") : selectedTopic ? "upload" : "topics";

  const handleScanComplete = (newScanId: string) => {
    router.push(`/scan?scanId=${encodeURIComponent(newScanId)}`);
  };

  const handleBackToTopics = () => router.push("/scan");

  // Topics view
  if (view === "topics") {
    const q = searchParams.get("q")?.trim().slice(0, 80) || "";
    const matches = topics.filter(({ terms }) => terms.test(q));
    const visibleTopics = q
      ? matches.length === 0 && generalTopics.test(q) ? topics : matches
      : topics;

    return (
      <RequireAccount>
        <main className="min-h-dvh bg-app px-5 pb-10 pt-[max(20px,env(safe-area-inset-top))] text-app-text md:px-10">
          <div className="mx-auto max-w-5xl">
            <Link className="inline-flex min-h-12 items-center gap-2 rounded-pill pr-4 font-semibold text-link hover:underline" href="/">
              <ArrowLeft aria-hidden size={20} />
              {t("back")}
            </Link>
            <header className="mt-4 max-w-2xl">
              <h1 className="font-display text-4xl leading-tight text-balance md:text-5xl">{t(q ? "searchTitle" : "title")}</h1>
              <p className="mt-3 text-base text-subtle sm:text-lg">
                {q ? t(visibleTopics.length ? "searchMatches" : "searchEmpty", { query: q }) : t("body")}
              </p>
            </header>
            <div id="photo-check-topics" className={`mt-6 grid gap-4 sm:gap-5 ${visibleTopics.length === 1 ? "max-w-xl" : "md:grid-cols-2"}`}>
              {visibleTopics.map(({ key, Icon, hint, photo, badge }) => (
                <Link
                  key={key}
                  href={`/scan?subject=${key}`}
                  className="relative isolate flex min-h-56 flex-col items-start justify-end gap-2 overflow-hidden rounded-xl bg-brand p-5 text-on-brand shadow-card sm:min-h-72 sm:p-6 no-underline"
                >
                  <PhotoBackdrop src={photo} sizes="(min-width: 1100px) 520px, (min-width: 768px) 48vw, calc(100vw - 40px)" />
                  <span className={`mb-1 grid size-11 place-items-center rounded-md ${badge}`}><Icon aria-hidden size={25} /></span>
                  <h2 className="font-display text-3xl leading-tight">{t(key)}</h2>
                  <p className="max-w-md text-sm text-on-brand/90 sm:text-base">{t(hint)}</p>
                </Link>
              ))}
            </div>
            {q ? (
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
        </main>
      </RequireAccount>
    );
  }

  if (view === "upload" && selectedTopic) {
    const { Icon, key: subject, hint, photo } = selectedTopic;
    const cover = subject === "hive" ? "/photos/brood-comb.webp" : photo;
    return (
      <RequireAccount>
        <main className="min-h-dvh bg-app pb-10 text-app-text">
          <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)] lg:items-start lg:gap-10 lg:px-10 lg:pt-[max(32px,env(safe-area-inset-top))]">
            <header className="scan-upload-hero text-forest-50" data-subject={subject}>
              <div className="scan-upload-art" aria-hidden="true">
                <Image
                  src={cover}
                  alt=""
                  fill
                  preload
                  sizes="(min-width: 1152px) 500px, (min-width: 1024px) 45vw, 100vw"
                  placeholder="blur"
                  blurDataURL={getPlaceholder(cover)}
                />
              </div>
              <button type="button" onClick={handleBackToTopics} aria-label={t("back")} className="grid size-12 place-items-center rounded-full border border-white/30 bg-forest-950/55 hover:bg-forest-950/80">
                <ArrowLeft aria-hidden size={22} />
              </button>
              <div className="max-w-md">
                <span className={`comb-cell grid size-12 place-items-center text-forest-950 ${subject === "hive" ? "bg-comb-400" : "bg-forest-300"}`}>
                  <Icon aria-hidden size={24} />
                </span>
                <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">{t(subject)}</h1>
                <p className="mt-2 text-base leading-relaxed text-forest-100 sm:text-lg">{t(hint)}</p>
              </div>
            </header>
            <div className="mx-auto w-full max-w-3xl px-6 pt-4 sm:px-10 lg:px-0 lg:pt-0">
              <ul className="mb-5 flex flex-wrap gap-2">
                {(["first", "second", "third"] as const).map((tip) => (
                  <li key={tip} className="rounded-pill border border-line bg-raised px-3 py-2 text-sm text-subtle">{t(`photoTips.${subject}.${tip}`)}</li>
                ))}
              </ul>
              <ScanUploader key={subject} subject={subject} onScanComplete={handleScanComplete} />
            </div>
          </div>
        </main>
      </RequireAccount>
    );
  }

  // Result view
  if (view === "result" && scanId) {
    return (
      <RequireAccount>
        <main className="min-h-dvh bg-app px-5 pb-10 pt-[max(20px,env(safe-area-inset-top))] text-app-text md:px-10">
          <div className="mx-auto max-w-3xl">
            <button
              onClick={handleBackToTopics}
              className="inline-flex min-h-12 items-center gap-2 rounded-pill pr-4 font-semibold text-link hover:underline"
            >
              <ArrowLeft aria-hidden size={20} />
              {t("back")}
            </button>
            <ScanResult scanId={scanId} />
          </div>
        </main>
      </RequireAccount>
    );
  }

  // Chat view
  if (view === "chat" && scanId) {
    return (
      <RequireAccount>
        <main className="min-h-dvh bg-app px-5 pb-10 pt-[max(20px,env(safe-area-inset-top))] text-app-text md:px-10">
          <div className="mx-auto max-w-3xl">
            <ScanChat scanId={scanId} />
          </div>
        </main>
      </RequireAccount>
    );
  }

  // Fallback
  return (
    <RequireAccount>
      <main className="min-h-dvh bg-app px-5 pb-10 pt-[max(20px,env(safe-area-inset-top))] text-app-text md:px-10">
        <div className="mx-auto max-w-5xl text-center py-20">
          <BrandLoader size={48} label={t("loading")} />
        </div>
      </main>
    </RequireAccount>
  );
}

export default function ScanPage() {
  const t = useTranslations("Scan");
  return (
    <Suspense fallback={
      <RequireAccount>
        <main className="min-h-dvh bg-app px-5 pb-10 pt-[max(20px,env(safe-area-inset-top))] text-app-text md:px-10">
          <div className="mx-auto max-w-5xl text-center py-20">
            <BrandLoader size={48} label={t("loading")} />
          </div>
        </main>
      </RequireAccount>
    }>
      <ScanPageContent />
    </Suspense>
  );
}