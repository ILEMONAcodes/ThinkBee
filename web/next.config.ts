import withSerwistInit from "@serwist/next";
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const pwaRevision = process.env.PWA_REVISION ?? Date.now().toString();

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  webpack(config, { dev }) {
    if (!dev && process.env.NEXT_DISABLE_WEBPACK_CACHE === "1") config.cache = false;
    return config;
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  register: false,
  // Reconnect must preserve the current route and unsynced input. Feature
  // listeners already resume sync; only an accepted worker update reloads.
  reloadOnOnline: false,
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [
    { url: "/", revision: pwaRevision },
    { url: "/offline", revision: pwaRevision },
    { url: "/manifest.webmanifest", revision: pwaRevision },
    { url: "/brand/thinkbee-short.svg", revision: pwaRevision },
    { url: "/brand/thinkbee-short-dark.svg", revision: pwaRevision },
    { url: "/brand/thinkbee-wordmark.svg", revision: pwaRevision },
    { url: "/brand/thinkbee-wordmark-dark.svg", revision: pwaRevision },
    { url: "/icons/apple-touch-icon-180.png", revision: pwaRevision },
    { url: "/icons/badge-monochrome-96.png", revision: pwaRevision },
    { url: "/icons/favicon.svg", revision: pwaRevision },
    { url: "/icons/icon-192.png", revision: pwaRevision },
    { url: "/icons/icon-512.png", revision: pwaRevision },
    { url: "/icons/maskable-192.png", revision: pwaRevision },
    { url: "/icons/maskable-512.png", revision: pwaRevision },
  ],
});

export default withSerwist(withNextIntl(nextConfig));
