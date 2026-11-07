import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import { ProfileForm } from "@/components/onboarding/profile-form";
import { SetupGate } from "@/components/onboarding/setup-gate";

export default function ProfilePage() { return <OnboardingFrame><SetupGate><ProfileForm /></SetupGate></OnboardingFrame>; }
