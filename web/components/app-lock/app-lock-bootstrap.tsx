"use client";

import { useEffect, useState, type ComponentType } from "react";

import { appLockReadyEvent, appLockStorageKey } from "@/lib/app-lock/config";

export function AppLockBootstrap() {
  const [Runtime, setRuntime] = useState<ComponentType | null>(null);
  useEffect(() => {
    let active = true;
    let loading = false;
    const load = () => {
      if (loading) return;
      loading = true;
      void import("@/components/app-lock/lock-runtime").then((module) => {
        if (active) setRuntime(() => module.LockRuntime);
      }).catch(() => { loading = false; }); // The pre-rendered cover keeps the app closed.
    };
    const storage = (event: StorageEvent) => {
      if (event.key === appLockStorageKey && event.newValue !== null) {
        document.documentElement.setAttribute("data-app-lock", "");
        load();
      }
    };
    // Another tab may have enabled the lock between the head script and hydration.
    try {
      if (localStorage.getItem(appLockStorageKey) !== null) document.documentElement.setAttribute("data-app-lock", "");
    } catch { document.documentElement.setAttribute("data-app-lock", ""); }
    if (document.documentElement.hasAttribute("data-app-lock")) load();
    addEventListener(appLockReadyEvent, load);
    addEventListener("storage", storage);
    return () => { active = false; removeEventListener(appLockReadyEvent, load); removeEventListener("storage", storage); };
  }, []);
  return Runtime ? <Runtime /> : null;
}
