"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { LockError } from "@/lib/app-lock/errors";
import { useAppLock } from "@/lib/app-lock/state";

export function useLockFeedback(error: unknown) {
  const t = useTranslations("AppLock");
  const retryAt = useAppLock((state) => state.record?.retryAt ?? 0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.ceil((retryAt - now) / 1000));
  const message = error ? t(`errors.${error instanceof LockError ? error.code : "device"}`) : undefined;
  return { seconds, message };
}
