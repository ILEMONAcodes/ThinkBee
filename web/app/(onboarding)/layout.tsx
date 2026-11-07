import type { ReactNode } from "react";

import { AccountProvider } from "@/components/auth/account-provider";

import "@/styles/onboarding.css";

export default function OnboardingLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <AccountProvider>{children}</AccountProvider>;
}
