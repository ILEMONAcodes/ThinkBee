import type { ReactNode } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { ConnectionStatus } from "@/components/shell/connection-status";
import { BrandMark } from "@/components/ui/brand-mark";

export default function MainLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <AppShell railBrand={<BrandMark kind="short" className="rail-logo" width={48} />} connectionStatus={<ConnectionStatus />}>{children}</AppShell>;
}
