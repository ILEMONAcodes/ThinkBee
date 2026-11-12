"use client";

import { AccountProvider } from "@/components/auth/account-provider";
import { AccountDetails } from "@/components/auth/account-details";
import { AppLockSettings } from "@/components/app-lock/app-lock-settings";

export function AccountPanel() {
  return <AccountProvider>
    <section className="mb-6 rounded-lg border border-line bg-raised p-6 sm:p-8"><AccountDetails /></section>
    <AppLockSettings />
  </AccountProvider>;
}
