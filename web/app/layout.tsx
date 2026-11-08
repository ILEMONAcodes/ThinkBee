import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/components/shell/theme-provider";
import { themeScript } from "@/lib/theme";

import "@/styles/globals.css";

const inter = Inter({
  display: "swap",
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
});

const fraunces = Fraunces({
  display: "swap",
  subsets: ["latin", "latin-ext"],
  variable: "--font-fraunces",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return {
    title: {
      default: t("title"),
      template: `%s · ${t("title")}`,
    },
    description: t("description"),
    referrer: "no-referrer",
    applicationName: t("title"),
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/icons/favicon.svg", type: "image/svg+xml" },
        { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      ],
      apple: [{ url: "/icons/apple-touch-icon-180.png", sizes: "180x180", type: "image/png" }],
    },
    appleWebApp: {
      capable: true,
      title: t("title"),
      statusBarStyle: "black-translucent",
    },
  };
}

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAFA" },
    { media: "(prefers-color-scheme: dark)", color: "#022C22" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const pwa = await getTranslations("Pwa");

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{
          __html: "addEventListener('beforeinstallprompt',e=>{e.preventDefault();window.__thinkBeeInstallPrompt=e})",
        }} />
      </head>
      <body className={`${inter.variable} ${fraunces.variable}`}>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>{children}</ThemeProvider>
          <aside className="pwa-update" hidden id="pwa-u" role="status">
            <p>{pwa("update")}</p>
            <button data-pwa-u type="button">{pwa("apply")}</button>
          </aside>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
