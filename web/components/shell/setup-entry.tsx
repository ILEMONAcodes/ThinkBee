"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function SetupEntry() {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    let active = true;
    let stop = () => {};
    void import("@/lib/onboarding/entry").then(({ startSetupEntry }) => {
      if (active) stop = startSetupEntry(pathname, router.replace);
    }).catch(() => undefined);
    return () => { active = false; stop(); };
  }, [pathname, router]);
  return null;
}
