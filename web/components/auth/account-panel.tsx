"use client";

import { AccountDetails } from "@/components/auth/account-details";
import { AppLockSettings } from "@/components/app-lock/app-lock-settings";

export function AccountPanel() {
  return <>
    <AccountDetails />
    <AppLockSettings />
  </>;
}
