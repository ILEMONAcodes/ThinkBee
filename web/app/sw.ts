/// <reference lib="webworker" />

import {
  CacheFirst,
  ExpirationPlugin,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
  type PrecacheEntry,
  type RuntimeCaching,
} from "serwist";

import { isPrivateUrl, isPublicImage, purgePrivatePageCaches } from "@/lib/pwa/cache-policy";
import { PageNetworkFirst } from "@/lib/pwa/page-network-first";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[];
};

const staticAsset = /\.(?:css|js|woff2?|ttf|otf)$/i;

const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: ({ request }) => request.headers.has("authorization"),
    handler: new NetworkOnly({ networkTimeoutSeconds: 15 }),
  },
  {
    matcher: ({ url }) => isPrivateUrl(url),
    handler: new NetworkOnly({ networkTimeoutSeconds: 15 }),
  },
  {
    matcher: ({ request, sameOrigin, url }) =>
      sameOrigin &&
      request.method === "GET" &&
      isPublicImage(url),
    handler: new StaleWhileRevalidate({
      cacheName: "thinkbee-images",
      plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60, maxAgeFrom: "last-used" })],
    }),
  },
  {
    matcher: ({ request, sameOrigin, url }) => sameOrigin && request.method === "GET" && staticAsset.test(url.pathname),
    handler: new CacheFirst({
      cacheName: "thinkbee-static",
      plugins: [new ExpirationPlugin({ maxEntries: 96, maxAgeSeconds: 30 * 24 * 60 * 60, maxAgeFrom: "last-used" })],
    }),
  },
  {
    matcher: ({ request, sameOrigin, url }) =>
      sameOrigin && request.headers.get("RSC") === "1" && !isPrivateUrl(url),
    handler: new PageNetworkFirst({
      cacheName: "thinkbee-pages-rsc",
      networkTimeoutSeconds: 4,
      plugins: [new ExpirationPlugin({ maxEntries: 24, maxAgeSeconds: 24 * 60 * 60 })],
    }),
  },
  {
    matcher: ({ request, sameOrigin, url }) =>
      sameOrigin && request.mode === "navigate" && !isPrivateUrl(url),
    handler: new PageNetworkFirst({
      cacheName: "thinkbee-pages",
      networkTimeoutSeconds: 4,
      plugins: [new ExpirationPlugin({ maxEntries: 24, maxAgeSeconds: 24 * 60 * 60 })],
    }),
  },
];

const serwist = new Serwist({
  cacheId: "thinkbee",
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: { cleanupOutdatedCaches: true },
  clientsClaim: true,
  navigationPreload: true,
  skipWaiting: false,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.mode === "navigate",
      },
    ],
  },
});

self.addEventListener("activate", (event) => {
  event.waitUntil(purgePrivatePageCaches(self.caches));
});

type PushPayload = {
  title?: string;
  body?: string;
  url?: string;
  space_id?: string;
};

function readPushPayload(event: PushEvent): PushPayload {
  if (!event.data) return {};
  try {
    const value: unknown = event.data.json();
    return value && typeof value === "object" ? value as PushPayload : {};
  } catch {
    return { body: event.data.text() };
  }
}

function safeNotificationPath(payload: PushPayload): string {
  const candidate = payload.url ?? (payload.space_id ? `/chats/${encodeURIComponent(payload.space_id)}` : "/chats");
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return "/chats";
  return candidate;
}

self.addEventListener("push", (event) => {
  const payload = readPushPayload(event);
  const url = safeNotificationPath(payload);
  event.waitUntil(self.registration.showNotification(payload.title ?? "Think Bee", {
    body: payload.body ?? "You have a new update.",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-monochrome-96.png",
    data: { url },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const value: unknown = event.notification.data;
  const path = value && typeof value === "object" && "url" in value && typeof value.url === "string"
    ? safeNotificationPath({ url: value.url })
    : "/chats";
  const target = new URL(path, self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client): client is WindowClient => "focus" in client);
    if (existing) {
      await existing.navigate(target);
      await existing.focus();
      return;
    }
    await self.clients.openWindow(target);
  })());
});

serwist.addEventListeners();
