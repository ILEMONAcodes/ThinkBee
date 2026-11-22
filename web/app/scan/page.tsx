"use client";

import { Suspense, useState, useEffect } from "react";
import { ArrowLeft, Hexagon, Leaf } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { RequireAccount } from "@/components/auth/require-account";
import { PhotoBackdrop } from "@/components/ui/photo-backdrop";
import { BrandLoader } from "@/components/ui/brand-loader";
import { ScanUploader } from "./components/ScanUploader";
import { ScanResult } from "./components/ScanResult";
import { ScanChat } from "./components/ScanChat";

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
  const [view, setView] = useState<"topics" | "upload" | "result" | "chat">("topics");
  const [scanId, setScanId] = useState<string | null>(null);
  const [subject, setSubject] = useState<"hive" | "crop" | null>(null);
  const [subjectType, setSubjectType] = useState<string | null>(null);

  // Handle URL params on mount
  useEffect(() => {
    const subjectParam = searchParams.get("subject");
    const scanIdParam = searchParams.get("scanId");
    const chatParam = searchParams.get("chat");

    if (scanIdParam) {
      setScanId(scanIdParam);
      if (chatParam === "true") {
        setView("chat");
      } else {
        setView("result");
      }
    } else if (subjectParam && (subjectParam === "hive" || subjectParam === "crop")) {
      setSubject(subjectParam);
      setView("upload");
    }
  }, [searchParams]);

  const handleScanComplete = (newScanId: string) => {
    setScanId(newScanId);
    setView("result");
    router.push(`/scan?scanId=${newScanId}`);
  };

  const handleBackToTopics = () => {
    setView("topics");
    setScanId(null);
    setSubject(null);
    setSubjectType(null);
    router.push("/scan");
  };

  const handleNewScan = () => {
    setView("topics");
    setScanId(null);
    setSubject(null);
    setSubjectType(null);
    router.push("/scan");
  };

  const handleChat = (type: "hive" | "crop", typeValue: string | null) => {
    setSubject(type);
    setSubjectType(typeValue);
    setView("chat");
    if (scanId) {
      router.push(`/scan?scanId=${scanId}&chat=true`);
    }
  };

  // Topics view
  if (view === "topics") {
    const q = searchParams.get("q")?.trim().slice(0, 80) || "";
    const selected = topics.find(({ key }) => key === subject);
    const matches = topics.filter(({ terms }) => terms.test(q));
    const visibleTopics = q
      ? matches.length === 0 && generalTopics.test(q) ? topics : matches
      : selected ? [selected] : topics;

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
            {q || selected ? (
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

  // Upload view
  if (view === "upload") {
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
            <header className="mt-4 max-w-2xl">
              <h1 className="font-display text-4xl leading-tight text-balance md:text-5xl">
                {subject ? t(subject) : t("title")}
              </h1>
              <p className="mt-3 text-base text-subtle sm:text-lg">{subject ? t(`${subject}Hint`) : t("body")}</p>
            </header>
            <ScanUploader onScanComplete={handleScanComplete} />
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
  if (view === "chat" && scanId && subject) {
    return (
      <RequireAccount>
        <main className="min-h-dvh bg-app px-5 pb-10 pt-[max(20px,env(safe-area-inset-top))] text-app-text md:px-10">
          <div className="mx-auto max-w-3xl">
            <ScanChat scanId={scanId} subject={subject} subjectType={subjectType} />
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
          <BrandLoader size={48} />
          <p className="mt-4 text-subtle">{t("loading")}</p>
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
            <BrandLoader size={48} />
            <p className="mt-4 text-subtle">{t("loading")}</p>
          </div>
        </main>
      </RequireAccount>
    }>
      <ScanPageContent />
    </Suspense>
  );
}