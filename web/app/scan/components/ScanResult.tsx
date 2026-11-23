"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useIdentity } from "@/components/auth/account-provider";
import { apiRequest, type ApiSchema } from "@/lib/api/client";
import { CaretDown, WarningCircle, CheckCircle, Warning, Shield, Users, BookOpen, ArrowSquareOut, WarningOctagon } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { BrandLoader } from "@/components/ui/brand-loader";

interface ScanResultProps {
  scanId: string;
}

const CONFIDENCE_COLORS = {
  high: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700",
  medium: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700",
  low: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700",
};

const CONFIDENCE_ICONS = {
  high: CheckCircle,
  medium: Warning,
  low: WarningCircle,
};

export function ScanResult({ scanId }: ScanResultProps) {
  const t = useTranslations("Scan");
  const router = useRouter();
  const { owner } = useIdentity();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const query = useQuery({
    queryKey: ["scan", owner, scanId],
    enabled: !!owner,
    queryFn: () => apiRequest<ApiSchema["ScanDetail"]>(`/scans/${encodeURIComponent(scanId)}`, owner!),
    refetchInterval: ({ state: { data } }) =>
      data?.status === "analysing" || data?.status === "queued" ? 2000 : false,
  });
  const { data: scan } = query;

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (query.isPending) {
    return <BrandLoader size={48} className="min-h-96" label={t("loading")} />;
  }

  if (query.isError || scan?.status === "failed" || scan?.result?.status === "unavailable") {
    return (
      <div className="text-center space-y-4 p-6 rounded-2xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30">
        <WarningCircle size={48} className="mx-auto text-red-500" aria-hidden="true" />
        <h3 className="font-display text-xl text-red-700 dark:text-red-300">{t("loadError")}</h3>
        <p className="text-sm text-red-600 dark:text-red-400">{t("analysisFailed")}</p>
        <button
          onClick={() => router.push("/scan")}
          className="inline-flex min-h-12 items-center gap-2 rounded-pill bg-red-600 text-white px-5 font-semibold hover:bg-red-700"
        >
          {t("backToScan")}
        </button>
      </div>
    );
  }

  if (!scan) {
    return null;
  }

  const result = scan.result;

  if (!result) {
    return <BrandLoader size={48} className="min-h-96" label={t(scan.status === "analysing" ? "analyzing" : "preparing")} />;
  }

  if (result.status === "refused") {
    return (
      <div className="text-center space-y-4 p-6 rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
        <WarningOctagon size={48} className="mx-auto text-amber-500" aria-hidden="true" />
        <h3 className="font-display text-xl text-amber-700 dark:text-amber-300">{t("scanRefused")}</h3>
        <p className="text-sm text-amber-600 dark:text-amber-400">{result.refusal?.detail || result.refusal?.reason || t("unknownRefusal")}</p>
        <button
          onClick={() => router.push("/scan")}
          className="inline-flex min-h-12 items-center gap-2 rounded-pill bg-amber-600 text-white px-5 font-semibold hover:bg-amber-700"
        >
          {t("tryAnotherScan")}
        </button>
      </div>
    );
  }

  if (result.status === "needs_clarification") {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-5">
          <div className="flex gap-3">
            <WarningOctagon size={28} className="text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h3 className="font-display text-lg text-amber-700 dark:text-amber-300">{t("needsClarificationTitle")}</h3>
              <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">{t("needsClarificationBody")}</p>
            </div>
          </div>
          {result.follow_up_questions.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">{t("questionsForYou")}</p>
              {result.follow_up_questions.map((q, i) => (
                <p key={i} className="text-sm text-amber-600 dark:text-amber-400">• {q}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Completed result
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-line bg-raised p-5">
        <div className="flex items-start gap-4">
          <div className={`flex size-14 shrink-0 items-center justify-center rounded-xl ${
            scan.subject === "hive"
              ? "bg-comb-100 dark:bg-comb-900 text-comb-700 dark:text-comb-300"
              : "bg-forest-100 dark:bg-forest-900 text-forest-700 dark:text-forest-300"
          }`}>
            {scan.subject === "hive" ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-2xl leading-tight">
              {scan.subject_type ? t(scan.subject_type) : t(scan.subject)}
            </h2>
            <p className="mt-1 text-sm text-subtle">
              {t("completedAt", { date: new Date(scan.created_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) })}
            </p>
          </div>
          <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border ${CONFIDENCE_COLORS[result.overall_confidence]}`}>
            {t(`confidence.${result.overall_confidence}`)}
          </span>
        </div>
      </div>

      {/* Likely Causes */}
      {result.likely_causes.length > 0 && (
        <section className="space-y-3" aria-labelledby="causes-heading">
          <h3 id="causes-heading" className="font-display text-xl">{t("likelyCauses")}</h3>
          {result.likely_causes.map((cause, index) => {
            const Icon = CONFIDENCE_ICONS[cause.confidence];
            return (
              <details
                key={index}
                className={`group rounded-xl border p-4 transition-colors ${
                  expandedSections[`cause-${index}`]
                    ? "bg-accent/10 border-accent"
                    : "bg-raised border-line hover:border-link"
                }`}
                open={expandedSections[`cause-${index}`]}
                onToggle={() => toggleSection(`cause-${index}`)}
              >
                <summary className="flex items-start gap-3 cursor-pointer list-none">
                  <Icon size={20} className={`shrink-0 mt-0.5 ${CONFIDENCE_COLORS[cause.confidence].split(" ")[0].replace("bg", "text").replace("dark:", "")}`} aria-hidden="true" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{cause.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CONFIDENCE_COLORS[cause.confidence]}`}>
                        {t(`confidence.${cause.confidence}`)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-subtle line-clamp-2">{cause.reasoning}</p>
                  </div>
                  <span className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-180">
                    <CaretDown size={18} aria-hidden="true" />
                  </span>
                </summary>
              </details>
            );
          })}
        </section>
      )}

      {/* Observations */}
      {result.observations.length > 0 && (
        <section className="space-y-2" aria-labelledby="observations-heading">
          <h3 id="observations-heading" className="font-display text-xl">{t("observations")}</h3>
          <div className="rounded-xl border border-line bg-raised p-4">
            <ul className="space-y-2" role="list">
              {result.observations.map((obs, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="shrink-0 mt-1.5 size-2 rounded-full bg-accent" aria-hidden="true" />
                  <span>{obs}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Weather Relevance */}
      {result.weather_relevance && (
        <section className="space-y-2" aria-labelledby="weather-heading">
          <h3 id="weather-heading" className="font-display text-xl">{t("weatherRelevance")}</h3>
          <div className="rounded-xl border border-line bg-raised p-4">
            <p className="text-sm text-text">{result.weather_relevance}</p>
          </div>
        </section>
      )}

      {/* Next Steps */}
      {result.next_steps.length > 0 && (
        <section className="space-y-2" aria-labelledby="steps-heading">
          <h3 id="steps-heading" className="font-display text-xl">{t("nextSteps")}</h3>
          <div className="space-y-3">
            {result.next_steps.map((step, i) => (
              <div key={i} className="flex gap-3 rounded-xl border border-line bg-raised p-4">
                <span className="shrink-0 flex size-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <CheckCircle size={18} aria-hidden="true" />
                </span>
                <p className="text-sm text-text pt-0.5">{step}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Warnings */}
      {(result.protective_gear_warning || result.pollinator_warning) && (
        <section className="space-y-3" aria-labelledby="warnings-heading">
          <h3 id="warnings-heading" className="font-display text-xl">{t("warnings")}</h3>
          {result.protective_gear_warning && (
            <div className="flex gap-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4">
              <Shield size={22} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <p className="text-sm text-amber-700 dark:text-amber-300">{result.protective_gear_warning}</p>
            </div>
          )}
          {result.pollinator_warning && (
            <div className="flex gap-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4">
              <Users size={22} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <p className="text-sm text-amber-700 dark:text-amber-300">{result.pollinator_warning}</p>
            </div>
          )}
        </section>
      )}

      {/* Follow-up Questions */}
      {result.follow_up_questions.length > 0 && (
        <section className="space-y-2" aria-labelledby="followup-heading">
          <h3 id="followup-heading" className="font-display text-xl">{t("followUpQuestions")}</h3>
          <div className="space-y-2">
            {result.follow_up_questions.map((q, i) => (
              <button
                key={i}
                type="button"
                className="w-full text-left rounded-xl border border-line bg-raised p-4 hover:border-link hover:bg-sunken transition-colors"
              >
                <p className="text-sm text-text flex items-center gap-2">
                  <CaretDown size={16} className="text-subtle" aria-hidden="true" />
                  {q}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Expert Referral */}
      {result.expert_referral && (
        <section className="space-y-2" aria-labelledby="expert-heading">
          <h3 id="expert-heading" className="font-display text-xl">{t("expertReferral")}</h3>
          <div className="flex gap-3 rounded-xl border border-line bg-raised p-4">
            <BookOpen size={22} className="shrink-0 mt-0.5 text-link" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm text-text">{result.expert_referral}</p>
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-1 text-sm text-link hover:underline"
              >
                {t("findExpert")}
                <ArrowSquareOut size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Label Notice */}
      <div className="rounded-xl border border-line bg-raised p-4">
        <p className="text-sm text-subtle flex items-start gap-2">
          <WarningCircle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
          <span>{result.label_notice}</span>
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          onClick={() => router.push(`/scan?scanId=${encodeURIComponent(scanId)}&chat=true`)}
          className="flex-1 min-h-12 rounded-xl bg-accent text-on-accent font-semibold hover:bg-accent-press"
        >
          {t("chatAboutThis")}
        </button>
        <button
          onClick={() => router.push("/scan")}
          className="flex-1 min-h-12 rounded-xl border border-line bg-raised font-semibold text-text hover:bg-sunken"
        >
          {t("newScan")}
        </button>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-muted text-center">
        {t("disclaimerFull")}
      </p>
    </div>
  );
}