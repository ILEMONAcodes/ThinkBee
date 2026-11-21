"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const AccountGate = dynamic(() => import("./account-gate").then((module) => module.AccountGate), {
  ssr: false,
});

export function RequireAccount({ children }: Readonly<{ children: ReactNode }>) {
  return <AccountGate>{children}</AccountGate>;
}
