"use client";

import { Fingerprint } from "@phosphor-icons/react/dist/csr/Fingerprint";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { PinSettingsForm, type LockFormMode } from "@/components/app-lock/pin-settings-form";
import { supportsDeviceUnlock } from "@/lib/app-lock/device";
import { lockApp } from "@/lib/app-lock/state";
import type { LockRecord } from "@/lib/app-lock/storage";

export function LockSettingsContent({ owner, record }: Readonly<{ owner: string; record: LockRecord | null }>) {
  const t = useTranslations("AppLock");
  const [mode, setMode] = useState<LockFormMode | null>(null);
  const [deviceAvailable, setDeviceAvailable] = useState(false);
  useEffect(() => {
    let active = true;
    void supportsDeviceUnlock().then((supported) => { if (active) setDeviceAvailable(supported); });
    return () => { active = false; };
  }, []);
  if (mode) return <PinSettingsForm mode={mode} owner={owner} onCancel={() => setMode(null)} />;
  return <>
    <p className="lock-status" role="status">{t(record ? "enabled" : "disabled")}</p>
    {record ? <>
      <div className="lock-actions">
        <button id="app-lock-now" className="lock-primary" type="button" onClick={() => lockApp()}>{t("lockNow")}</button>
        <button className="lock-secondary" type="button" onClick={() => setMode("change")}>{t("changePin")}</button>
        <button className="lock-text" type="button" onClick={() => setMode("disable")}>{t("turnOff")}</button>
      </div>
      <div className="lock-device">
        <Fingerprint size={28} aria-hidden="true" />
        <div><h3 className="font-semibold">{t("deviceTitle")}</h3><p className="mt-2 text-subtle">{t(record.device ? "deviceEnabled" : deviceAvailable ? "deviceBody" : "deviceUnavailable")}</p></div>
        {record.device || deviceAvailable ? <button className="lock-secondary" type="button" onClick={() => setMode(record.device ? "removeDevice" : "device")}>{t(record.device ? "removeDevice" : "enableDevice")}</button> : null}
      </div>
    </> : <button className="lock-primary mt-4" type="button" onClick={() => setMode("setup")}>{t("setPin")}</button>}
  </>;
}
