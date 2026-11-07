import type { Metadata } from "next";

import { CallbackScreen } from "@/components/onboarding/callback-screen";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";

export const metadata: Metadata = { referrer: "no-referrer", robots: { index: false, follow: false } };
export default function CallbackPage() { return <OnboardingFrame><CallbackScreen /></OnboardingFrame>; }
