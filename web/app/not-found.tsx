import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("Feature");
  return (
    <main className="grid min-h-dvh place-items-center bg-app px-5 text-app">
      <div className="max-w-md text-center">
        <p className="font-display text-6xl text-accent">404</p>
        <h1 className="mt-4 font-display text-3xl">This page is not here</h1>
        <Link className="mt-8 inline-flex min-h-12 items-center rounded-pill bg-accent px-6 font-semibold text-on-accent" href="/">
          {t("backHome")}
        </Link>
      </div>
    </main>
  );
}
