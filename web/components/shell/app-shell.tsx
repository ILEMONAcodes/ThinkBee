import type { ReactNode } from "react";

import { AppNavigation } from "@/components/shell/navigation";

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-dvh bg-app text-app">
      <AppNavigation />
      <main className="min-h-dvh pb-28 lg:ml-[88px] lg:pb-0">
        <div className="mx-auto max-w-[1280px] px-5 pb-10 pt-[max(24px,env(safe-area-inset-top))] sm:px-8 lg:px-10 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
