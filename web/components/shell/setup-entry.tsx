"use client";

import { useEffect } from "react";

export function SetupEntry() {
  useEffect(() => {
    let active = true;
    let stop = () => {};
    void import("@/lib/onboarding/entry").then(({ startSetupEntry }) => {
      if (active) stop = startSetupEntry();
    }).catch(() => undefined);
    return () => { active = false; stop(); };
  }, []);
  return null;
}
