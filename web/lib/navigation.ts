export type NavigationKey = "chats" | "home" | "me" | "records" | "scan";

export type NavigationItem = {
  href: string;
  key: NavigationKey;
};

export const navigationItems: NavigationItem[] = [
  { href: "/", key: "home" },
  { href: "/chats", key: "chats" },
  { href: "/scan", key: "scan" },
  { href: "/records", key: "records" },
  { href: "/me", key: "me" },
];

export function isNavigationItemActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
