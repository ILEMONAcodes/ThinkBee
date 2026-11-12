"use client";

import { ArrowRight } from "@phosphor-icons/react/dist/csr/ArrowRight";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { WelcomeArt, welcomePanels } from "@/components/onboarding/welcome-art";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { BrandMark } from "@/components/ui/brand-mark";

function rememberWelcome() { try { localStorage.setItem("thinkbee-welcome-seen", "1"); } catch { /* Optional preference. */ } }

export function WelcomeCarousel({ connectionStatus }: Readonly<{ connectionStatus: ReactNode }>) {
  const t = useTranslations("Welcome");
  const [index, setIndex] = useState(0);
  const [splash, setSplash] = useState(true);
  const start = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setSplash(false), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 900);
    return () => window.clearTimeout(timer);
  }, []);
  const move = (step: number) => setIndex((value) => Math.max(0, Math.min(welcomePanels.length - 1, value + step)));
  const panel = welcomePanels[index];
  return <div className="welcome-page">
    {splash ? <div className="welcome-splash" aria-hidden="true"><BrandMark width={280} priority /><span>{t.rich("byMacaney", { macaney: (chunks) => chunks })}</span></div> : null}
    {connectionStatus}
    <header className="welcome-header">
      <Link aria-label={t("brand")} className="welcome-brand" href="/" onClick={rememberWelcome}><BrandMark /></Link>
      <div className="welcome-header-actions"><Link className="welcome-skip" href="/" onClick={rememberWelcome}>{t("skip")}</Link><ThemeToggle /></div>
    </header>
    <main className="welcome-main">
      <section className="welcome-panel" aria-roledescription="carousel" aria-label={t("intro")} tabIndex={0}
        onTouchStart={(event) => { const touch = event.touches[0]; start.current = { x: touch.clientX, y: touch.clientY }; }}
        onTouchEnd={(event) => {
          if (start.current) {
            const touch = event.changedTouches[0];
            const distance = start.current.x - touch.clientX;
            if (Math.abs(distance) > 50 && Math.abs(distance) > Math.abs(start.current.y - touch.clientY)) move(distance > 0 ? 1 : -1);
          }
          start.current = null;
        }}
        onTouchCancel={() => { start.current = null; }}
        onKeyDown={(event) => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1); } }}>
        <WelcomeArt panel={panel} />
        <div className="welcome-content">
          <div className="welcome-panel-top">
            <p className="welcome-count"><span>0{index + 1}</span> / 0{welcomePanels.length}</p>
            <nav className="welcome-pagination" aria-label={t("panels")}>{welcomePanels.map((name, position) => <button type="button" key={name} aria-label={t("panel", { number: position + 1 })} aria-current={position === index ? "step" : undefined} onClick={() => setIndex(position)}><span /></button>)}</nav>
          </div>
          <div className="welcome-copy" key={panel} aria-live="polite" aria-atomic="true">
            <p className="setup-kicker">{t(`${panel}.kicker`)}</p>
            <h1 className="welcome-title">{t.rich(`${panel}.title`, { em: (chunks) => <em>{chunks}</em> })}</h1>
            <p className="welcome-body">{t(`${panel}.body`)}</p>
          </div>
          <div className="welcome-actions">
            <Link className="setup-primary welcome-start" href="/register" onClick={rememberWelcome}>{t("start")}<ArrowRight size={22} aria-hidden="true" /></Link>
            {index < welcomePanels.length - 1 ? <button className="welcome-next" type="button" onClick={() => move(1)}>{t("next")}<ArrowRight size={20} aria-hidden="true" /></button> : null}
          </div>
          <p className="welcome-sign-in">{t("hasAccount")} <Link href="/sign-in" onClick={rememberWelcome}>{t("signIn")}</Link></p>
        </div>
      </section>
    </main>
    <footer className="welcome-footer"><span>{t("footer")}</span><span>{t.rich("byMacaney", { macaney: (chunks) => <a className="brand-credit" href="https://www.macaney.com/">{chunks}</a> })}</span></footer>
  </div>;
}
