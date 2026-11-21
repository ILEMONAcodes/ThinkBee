"use client";

import { useState } from "react";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function CreateSpacePage() {
  const t = useTranslations("Chat");
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<"community" | "group">("community");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("nameRequired"));
      return;
    }
    setIsSubmitting(true);
    setError("");

    try {
      // Would call API
      const newSpaceId = crypto.randomUUID();
      router.push(`/chats/${newSpaceId}`);
    } catch {
      setError(t("createError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <header className="mb-8">
        <Link
          href="/chats"
          className="inline-flex items-center gap-2 text-subtle hover:text-text mb-6"
        >
          <ArrowLeft size={20} />
          {t("back")}
        </Link>
        <h1 className="font-display text-4xl">{t("createTitle")}</h1>
        <p className="mt-3 text-subtle">{t("createDescription")}</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 bg-raised rounded-lg p-6 shadow-card">
        {error && (
          <div className="rounded-lg bg-danger-bg p-4 text-danger text-sm" role="alert">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2">
            {t("nameLabel")}
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
            className="w-full min-h-12 rounded-pill border border-line bg-sunken px-4 py-2 text-text placeholder:text-muted focus:border-link focus:outline-none"
            maxLength={120}
            required
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-2">
            {t("descriptionLabel")}
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("descriptionPlaceholder")}
            className="w-full min-h-[100px] rounded-lg border border-line bg-sunken px-4 py-3 text-text placeholder:text-muted focus:border-link focus:outline-none resize-y"
            maxLength={500}
            rows={4}
          />
        </div>

        <fieldset>
          <legend className="block text-sm font-medium mb-3">{t("kindLabel")}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="relative cursor-pointer">
              <input
                type="radio"
                name="kind"
                value="community"
                checked={kind === "community"}
                onChange={() => setKind("community")}
                className="sr-only"
              />
              <div className={`rounded-lg border-2 p-4 transition-colors ${
                kind === "community"
                  ? "border-link bg-sunken"
                  : "border-line hover:border-muted"
              }`}>
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-honey-100 flex items-center justify-center text-forest-900 dark:bg-forest-800 dark:text-mint">
                    <svg className="size-5" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                  </div>
                  <div>
                    <p className="font-medium">{t("community")}</p>
                    <p className="text-sm text-subtle">{t("communityDesc")}</p>
                  </div>
                </div>
              </div>
            </label>
            <label className="relative cursor-pointer">
              <input
                type="radio"
                name="kind"
                value="group"
                checked={kind === "group"}
                onChange={() => setKind("group")}
                className="sr-only"
              />
              <div className={`rounded-lg border-2 p-4 transition-colors ${
                kind === "group"
                  ? "border-link bg-sunken"
                  : "border-line hover:border-muted"
              }`}>
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-honey-100 flex items-center justify-center text-forest-900 dark:bg-forest-800 dark:text-mint">
                    <svg className="size-5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9h4V5H3v4zm0 5h4v-4H3v4zm0 5h4v-4H3v4zm5 0h12v-4H8v4zm0-5h12v-4H8v4zm0-5h12V5H8v4z"/></svg>
                  </div>
                  <div>
                    <p className="font-medium">{t("group")}</p>
                    <p className="text-sm text-subtle">{t("groupDesc")}</p>
                  </div>
                </div>
              </div>
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="block text-sm font-medium mb-3">{t("visibilityLabel")}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="relative cursor-pointer">
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={visibility === "public"}
                onChange={() => setVisibility("public")}
                className="sr-only"
              />
              <div className={`rounded-lg border-2 p-4 transition-colors ${
                visibility === "public"
                  ? "border-link bg-sunken"
                  : "border-line hover:border-muted"
              }`}>
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-honey-100 flex items-center justify-center text-forest-900 dark:bg-forest-800 dark:text-mint">
                    <svg className="size-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zm0 1.5c2.3 0 4.45 1.17 5.73 3h-11.46C7.55 7.17 9.7 6 12 6zm0 12c-2.3 0-4.45-1.17-5.73-3h11.46c1.28 1.83 3.43 3 5.73 3z"/></svg>
                  </div>
                  <div>
                    <p className="font-medium">{t("public")}</p>
                    <p className="text-sm text-subtle">{t("publicDesc")}</p>
                  </div>
                </div>
              </div>
            </label>
            <label className="relative cursor-pointer">
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={visibility === "private"}
                onChange={() => setVisibility("private")}
                className="sr-only"
              />
              <div className={`rounded-lg border-2 p-4 transition-colors ${
                visibility === "private"
                  ? "border-link bg-sunken"
                  : "border-line hover:border-muted"
              }`}>
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-honey-100 flex items-center justify-center text-forest-900 dark:bg-forest-800 dark:text-mint">
                    <svg className="size-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V7c0-2.76-2.24-5-5-5S7 4.24 7 7v1H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V7c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v1z"/></svg>
                  </div>
                  <div>
                    <p className="font-medium">{t("private")}</p>
                    <p className="text-sm text-subtle">{t("privateDesc")}</p>
                  </div>
                </div>
              </div>
            </label>
          </div>
        </fieldset>

        <div className="flex gap-3 pt-4">
          <Link
            href="/chats"
            className="flex-1 rounded-pill border border-line py-3 text-center font-medium text-text hover:bg-sunken"
          >
            {t("cancel")}
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="flex-1 rounded-pill bg-accent py-3 font-semibold text-on-accent hover:bg-accent-press disabled:opacity-50"
          >
            {isSubmitting ? t("creating") : t("create")}
          </button>
        </div>
      </form>
    </div>
  );
}