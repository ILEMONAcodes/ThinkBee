"use client";

import { useEffect } from "react";

import { LockScreen } from "@/components/app-lock/lock-screen";
import { startLockLifecycle } from "@/lib/app-lock/lifecycle";
import { useAppLock } from "@/lib/app-lock/state";

export function LockRuntime() {
  const { status, epoch, record } = useAppLock();
  useEffect(startLockLifecycle, []);
  return status === "locked" || status === "unavailable"
    ? <LockScreen key={epoch} record={record} unavailable={status === "unavailable"} /> : null;
}
