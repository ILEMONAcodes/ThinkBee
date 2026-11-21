"use client";

import { ArrowRight } from "@phosphor-icons/react/dist/csr/ArrowRight";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { WelcomeArt, welcomePanels } from "@/components/onboarding/welcome-art";
import { BrandMark } from "@/components/ui/brand-mark";

function rememberWelcome() { try { localStorage.setItem("thinkbee-welcome-seen", "1"); } catch { /* Optional preference. */ } }

export function WelcomeCarousel({ connectionStatus }: Readonly<{ connectionStatus: ReactNode }>) {
  const t = useTranslations("Welcome");
  const [index, setIndex] = useState(0);
  const [splash, setSplash] = useState(true);
  const finalAction = useRef<HTMLAnchorElement>(null);
  const focusFinalAction = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setSplash(false), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 900);
    return () => window.clearTimeout(timer);
  }, []);
  const move = (step: number) => setIndex((value) => Math.max(0, Math.min(welcomePanels.length - 1, value + step)));
  const panel = welcomePanels[index];
  const isLastPanel = index === welcomePanels.length - 1;
  useEffect(() => {
    if (isLastPanel && focusFinalAction.current) {
      finalAction.current?.focus();
      focusFinalAction.current = false;
    }
  }, [isLastPanel]);

  const arrow = <span className="welcome-cta-arrow"><ArrowRight size={24} aria-hidden="true" /></span>;
  return <div className="welcome-page">
    {splash ? <div className="welcome-splash" aria-hidden="true"><BrandMark width={280} priority /><span>{t.rich("byMacaney", { macaney: (chunks) => chunks })}</span></div> : null}
    {connectionStatus}
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
        <header className="welcome-header">
          <Link aria-label={t("brand")} className="welcome-brand" href="/sign-in" onClick={rememberWelcome}>
            <BrandMark surface="dark" priority />
          </Link>
          <Link className="welcome-skip" href="/sign-in" onClick={rememberWelcome}>{t("skip")}</Link>
        </header>
        <div className="welcome-content">
          <nav className="welcome-pagination" aria-label={t("panels")}>
            {welcomePanels.map((name, position) => (
              <button type="button" key={name} aria-label={t("panel", { number: position + 1 })}
                aria-current={position === index ? "step" : undefined} onClick={() => setIndex(position)}>
                <span />
              </button>
            ))}
          </nav>
          <div className="welcome-copy" aria-live="polite" aria-atomic="true">
            <div key={panel} className="welcome-slide-text">
              <h1 className="welcome-title">{t(`${panel}.title`)}</h1>
              <p className="welcome-body">{t(`${panel}.body`)}</p>
            </div>
          </div>
          {isLastPanel ? (
            <Link ref={finalAction} className="welcome-cta" href="/register" onClick={rememberWelcome}>
              {arrow}<span>{t("start")}</span>
            </Link>
          ) : (
            <button className="welcome-cta" type="button" onClick={(event) => {
              focusFinalAction.current = index === welcomePanels.length - 2 && document.activeElement === event.currentTarget;
              move(1);
            }}>
              {arrow}<span>{t("next")}</span>
            </button>
          )}
          <p className="welcome-sign-in">{t("hasAccount")} <Link href="/sign-in" onClick={rememberWelcome}>{t("signIn")}</Link></p>
        </div>
      </section>
    </main>
    <footer className="welcome-footer"><span>{t.rich("byMacaney", { macaney: (chunks) => <a className="brand-credit" href="https://www.macaney.com/">{chunks}</a> })}</span></footer>
  </div>;
}
