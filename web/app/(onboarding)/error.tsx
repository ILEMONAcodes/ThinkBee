"use client";

import ErrorPage from "@/app/(main)/error";

export default function OnboardingError(props: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return <main className="setup-page px-5 py-12"><ErrorPage {...props} /></main>;
}
