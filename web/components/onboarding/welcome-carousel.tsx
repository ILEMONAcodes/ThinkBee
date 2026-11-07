"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { CombField } from "@/components/ui/comb-field";

const panels = ["scan", "records", "community"] as const;
const photos = ["hive", "field", "apiary"];
function rememberWelcome() { try { localStorage.setItem("thinkbee-welcome-seen", "1"); } catch { /* Optional preference. */ } }

export function WelcomeCarousel() {
  const t = useTranslations("Welcome");
  const [index, setIndex] = useState(0);
  const [splash, setSplash] = useState(true);
  const start = useRef<number | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setSplash(false), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 640);
    return () => window.clearTimeout(timer);
  }, []);
  const panel = panels[index];
  return <main className="welcome-page">
    {splash ? <div className="welcome-splash" aria-hidden><CombField className="absolute opacity-20" /><Image alt="" src="/brand/macaney-logo.png" width={180} height={127} className="relative rounded-lg bg-paper p-6" priority /></div> : null}
    <header className="welcome-header"><Link className="inline-flex min-h-12 items-center gap-3" href="/" onClick={rememberWelcome}><Image alt="" src="/brand/macaney-logo.png" width={56} height={40} className="rounded-sm bg-paper p-1" /><span className="font-display text-2xl">{t("brand")}</span></Link><Link className="welcome-skip" href="/" onClick={rememberWelcome}>{t("skip")}</Link></header>
    <section className="welcome-panel" aria-roledescription="carousel" aria-label={t("intro")} tabIndex={0}
      onTouchStart={(event) => { start.current = event.touches[0].clientX; }}
      onTouchEnd={(event) => { if (start.current !== null) { const distance = start.current - event.changedTouches[0].clientX; if (Math.abs(distance) > 50) setIndex((value) => Math.max(0, Math.min(2, value + (distance > 0 ? 1 : -1)))); } start.current = null; }}
      onKeyDown={(event) => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); setIndex((value) => Math.max(0, Math.min(2, value + (event.key === "ArrowRight" ? 1 : -1)))); } }}>
      <div className="welcome-copy" key={panel} aria-live="polite">
        <p className="setup-kicker text-mint">{t(`${panel}.kicker`)}</p><h1 className="welcome-title">{t(`${panel}.title`)}</h1><p className="welcome-body">{t(`${panel}.body`)}</p>
        <div className="welcome-actions"><Link className="setup-primary" href="/sign-in" onClick={rememberWelcome}>{t("start")}</Link>{index < 2 ? <button className="welcome-next" type="button" onClick={() => setIndex(index + 1)}>{t("next")}</button> : null}</div>
      </div>
      <div className="welcome-photo"><Image key={panel} alt={t(`${panel}.alt`)} src={`/onboarding/${photos[index]}.webp`} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" priority={index === 0} /><div className="welcome-photo-caption">{t(`${panel}.caption`)}</div></div>
    </section>
    <nav className="welcome-pagination" aria-label={t("panels")}>{panels.map((name, position) => <button type="button" key={name} aria-label={t("panel", { number: position + 1 })} aria-current={position === index ? "step" : undefined} onClick={() => setIndex(position)}><span /></button>)}</nav>
  </main>;
}
