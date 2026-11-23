"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import { BrandLoader } from "@/components/ui/brand-loader";

const AccountGate = dynamic(() => import("./account-gate").then((module) => module.AccountGate), {
  ssr: false,
  loading: () => <BrandLoader className="min-h-dvh" />,
});

export function RequireAccount({ children }: Readonly<{ children: ReactNode }>) {
  return <AccountGate>{children}</AccountGate>;
}
