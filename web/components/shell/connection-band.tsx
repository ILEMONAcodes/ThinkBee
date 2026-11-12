"use client";

import type { ReactNode } from "react";

import { useOnline } from "@/lib/hooks/use-online";

export function ConnectionBand({ children }: Readonly<{ children: ReactNode }>) {
  const online = useOnline();
  return <div role="status" aria-live="polite" aria-atomic="true">
    {!online ? <div className="connection-band">{children}</div> : null}
  </div>;
}
