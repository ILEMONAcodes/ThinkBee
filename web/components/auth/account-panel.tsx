"use client";

import { AccountProvider } from "@/components/auth/account-provider";
import { AccountDetails } from "@/components/auth/account-details";

export function AccountPanel() { return <AccountProvider><section className="mb-6 rounded-lg border border-line bg-raised p-6 sm:p-8"><AccountDetails /></section></AccountProvider>; }
