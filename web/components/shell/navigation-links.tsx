"use client";

import { Camera } from "@phosphor-icons/react/dist/csr/Camera";
import { ChatCircleDots } from "@phosphor-icons/react/dist/csr/ChatCircleDots";
import { House } from "@phosphor-icons/react/dist/csr/House";
import { Notebook } from "@phosphor-icons/react/dist/csr/Notebook";
import { UserCircle } from "@phosphor-icons/react/dist/csr/UserCircle";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { isNavigationItemActive, navigationItems } from "@/lib/navigation";

const icons = { home: House, chats: ChatCircleDots, scan: Camera, records: Notebook, me: UserCircle };

export function NavigationLinks({ variant }: Readonly<{ variant: "mobile" | "desktop" }>) {
  const pathname = usePathname();
  const t = useTranslations("Navigation");
  const activeIndex = navigationItems.findIndex((item) => isNavigationItemActive(pathname, item.href));
  const offset = variant === "mobile"
    ? `translateX(${activeIndex * 100}%)`
    : `translateY(${activeIndex * 64}px)`;
  return (
    <>
      <span
        aria-hidden
        className={`navigation-indicator ${variant}-indicator`}
        style={{ transform: offset, opacity: activeIndex < 0 ? 0 : 1 }}
      />
      {navigationItems.map((item) => {
        const active = isNavigationItemActive(pathname, item.href);
        const Icon = icons[item.key];
        const scan = item.key === "scan";
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`navigation-link ${variant === "desktop" ? "rail-link" : "mobile-link"} ${scan ? "scan-link" : ""}`}
            href={item.href}
            key={item.key}
            title={t(item.key)}
          >
            <span className={scan ? "navigation-icon scan-icon" : "navigation-icon"}>
              <Icon aria-hidden size={24} weight={active ? "fill" : "regular"} />
            </span>
            <span className={variant === "desktop" ? "rail-label" : "navigation-label"}>
              {t(item.key)}
            </span>
          </Link>
        );
      })}
    </>
  );
}
