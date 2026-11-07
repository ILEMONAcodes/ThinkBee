import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import { FarmForm } from "@/components/onboarding/farm-form";
import { SetupGate } from "@/components/onboarding/setup-gate";

export default function FarmPage() { return <OnboardingFrame><SetupGate><FarmForm /></SetupGate></OnboardingFrame>; }
