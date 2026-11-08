"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, type ReactNode } from "react";

import { ConnectionStatus } from "@/components/shell/connection-status";
import { AppNavigation } from "@/components/shell/navigation";
import { SetupEntry } from "@/components/shell/setup-entry";
import { screenSlide } from "@/lib/motion";
import { isImmersiveRoute } from "@/lib/navigation";
import { usePreferences } from "@/lib/state/preferences";

export function AppShell({ children, railBrand }: Readonly<{ children: ReactNode; railBrand: ReactNode }>) {
  const pathname = usePathname();
  const t = useTranslations("Shell");
  const pinned = usePreferences((state) => state.railPinned);
  const immersive = isImmersiveRoute(pathname);
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = content.current;
    if (!element?.animate) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animation = element.animate(
      reduced ? [{ opacity: 0 }, { opacity: 1 }] : [
        { opacity: 0, transform: `translateX(${screenSlide.initial.x}px)` },
        { opacity: 1, transform: "translateX(0)" },
      ],
      {
        duration: reduced ? 1 : screenSlide.animate.transition.duration * 1000,
        easing: `cubic-bezier(${screenSlide.animate.transition.ease.join(",")})`,
      },
    );
    return () => animation.cancel();
  }, [pathname]);
  return (
    <div className="app-shell" data-pinned={pinned} data-immersive={immersive}>
      <SetupEntry />
      <a className="skip-link" href="#main-content">{t("skip")}</a>
      {!immersive ? <AppNavigation railBrand={railBrand} /> : null}
      <main className="shell-main" id="main-content" tabIndex={-1}>
        <ConnectionStatus />
        <div className="shell-content" key={pathname} ref={content}>
          {children}
        </div>
      </main>
    </div>
  );
}
