"use client";

import {
  Camera,
  ChatCircleDots,
  House,
  Notebook,
  UserCircle,
  type IconProps,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

import { ThemeToggle } from "@/components/shell/theme-toggle";
import { isNavigationItemActive, navigationItems, type NavigationKey } from "@/lib/navigation";

const icons: Record<NavigationKey, ComponentType<IconProps>> = {
  home: House,
  chats: ChatCircleDots,
  scan: Camera,
  records: Notebook,
  me: UserCircle,
};

function NavigationLinks({ variant }: Readonly<{ variant: "mobile" | "desktop" }>) {
  const pathname = usePathname();
  const t = useTranslations("Navigation");
  const reduceMotion = useReducedMotion();

  return navigationItems.map((item) => {
    const active = isNavigationItemActive(pathname, item.href);
    const Icon = icons[item.key];
    const isScan = item.key === "scan";
    return (
      <Link
        aria-current={active ? "page" : undefined}
        className={
          variant === "mobile"
            ? `relative flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-pill text-[11px] font-medium ${isScan ? "-translate-y-3" : ""}`
            : "relative flex min-h-12 items-center gap-4 overflow-hidden rounded-pill px-4 text-sm font-semibold"
        }
        href={item.href}
        key={item.key}
      >
        {active && !isScan ? (
          <motion.span
            className="absolute inset-0 bg-nav-active"
            layoutId={`${variant}-nav-indicator`}
            transition={reduceMotion ? { duration: 0.01 } : { type: "spring", stiffness: 420, damping: 34 }}
          />
        ) : null}
        <span
          className={`relative z-10 grid shrink-0 place-items-center ${
            isScan
              ? "size-14 rounded-full bg-accent text-on-accent shadow-float"
              : active
                ? "text-app"
                : "text-muted"
          }`}
        >
          <Icon aria-hidden size={isScan ? 27 : 24} weight={active ? "fill" : "regular"} />
        </span>
        <span
          className={
            variant === "desktop"
              ? "relative z-10 whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100"
              : `relative z-10 ${isScan ? "mt-1 text-app" : active ? "text-app" : "text-muted"}`
          }
        >
          {t(item.key)}
        </span>
      </Link>
    );
  });
}

export function AppNavigation() {
  return (
    <>
      <aside className="group fixed inset-y-0 left-0 z-40 hidden w-[88px] flex-col overflow-hidden border-r border-line bg-raised px-3 py-6 shadow-card transition-[width] duration-base hover:w-[264px] lg:flex">
        <Link className="flex min-h-16 items-center gap-3 overflow-hidden px-2" href="/">
          <Image alt="Macaney" className="h-auto w-12 shrink-0 object-contain object-left" height={352} priority src="/brand/macaney-logo.png" width={498} />
          <span className="whitespace-nowrap font-display text-2xl opacity-0 transition-opacity group-hover:opacity-100">Think Bee</span>
        </Link>
        <nav aria-label="Primary" className="mt-8 flex flex-1 flex-col gap-2">
          <NavigationLinks variant="desktop" />
        </nav>
        <ThemeToggle compact />
      </aside>

      <nav
        aria-label="Primary"
        className="fixed inset-x-4 bottom-[max(16px,env(safe-area-inset-bottom))] z-40 flex h-16 items-center rounded-pill border border-line bg-nav px-2 shadow-float backdrop-blur-xl lg:hidden"
      >
        <NavigationLinks variant="mobile" />
      </nav>
    </>
  );
}
