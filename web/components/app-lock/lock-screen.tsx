"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Fingerprint } from "@phosphor-icons/react/dist/csr/Fingerprint";
import { LockKey } from "@phosphor-icons/react/dist/csr/LockKey";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { LockRecovery } from "@/components/app-lock/lock-recovery";
import { PinField } from "@/components/app-lock/pin-field";
import { BrandMark } from "@/components/ui/brand-mark";
import { unlockWithDevice, unlockWithPin } from "@/lib/app-lock/actions";
import { appLockConfig } from "@/lib/app-lock/policy";
import { pinInputSchema } from "@/lib/app-lock/pin";
import { reloadLock, restoreAppFocus } from "@/lib/app-lock/state";
import type { LockRecord } from "@/lib/app-lock/storage";
import { useLockFeedback } from "@/lib/hooks/use-lock-feedback";
import { useOnline } from "@/lib/hooks/use-online";

const schema = z.object({ pin: pinInputSchema });

function containFocus(event: KeyboardEvent<HTMLDialogElement>): void {
  if (event.key !== "Tab") return;
  const controls = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), a[href], [tabindex='0']")]
    .filter((element) => element.getClientRects().length > 0);
  const first = controls[0];
  const last = controls.at(-1);
  if (!first || !last) { event.preventDefault(); return; }
  if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement as HTMLElement))) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault(); first.focus();
  }
}

export function LockScreen({ record, unavailable }: Readonly<{ record: LockRecord | null; unavailable: boolean }>) {
  const t = useTranslations("AppLock");
  const online = useOnline();
  const dialog = useRef<HTMLDialogElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [recovery, setRecovery] = useState(false);
  const [deviceBusy, setDeviceBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const { seconds, message } = useLockFeedback(error);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { pin: "" } });
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => { controller.current?.abort(); element?.close(); restoreAppFocus(); };
  }, []);
  const submit = async ({ pin }: z.infer<typeof schema>) => {
    setError(undefined);
    try { await unlockWithPin(pin); }
    catch (failure) { setError(failure); }
    finally { reset(); }
  };
  const deviceUnlock = async () => {
    setDeviceBusy(true); setError(undefined);
    controller.current = new AbortController();
    try { await unlockWithDevice(controller.current.signal); }
    catch (failure) { setError(failure); }
    finally { setDeviceBusy(false); }
  };
  const busy = deviceBusy || isSubmitting;
  return <dialog ref={dialog} className="app-lock-dialog" aria-labelledby="app-lock-title" onCancel={(event) => event.preventDefault()} onKeyDown={containFocus}>
    <div className="lock-dialog-content">
      <BrandMark width={152} />
      <div className="lock-dialog-card">
        <LockKey size={32} aria-hidden="true" className="text-link" />
        <h1 className="lock-title" id="app-lock-title">{t("lockedTitle")}</h1>
        {recovery ? <LockRecovery onCancel={() => setRecovery(false)} /> : <>
          <p className="mt-4 text-subtle">{t(unavailable ? "storageBody" : "lockedBody")}</p>
          {unavailable ? <button className="lock-primary mt-6" type="button" onClick={reloadLock}>{t("retry")}</button> : record ? <>
            <form className="lock-form" noValidate onSubmit={handleSubmit(submit)} aria-busy={busy}>
              <PinField field={register("pin")} label={t("pin")} autoFocus error={errors.pin ? t("pinInvalid", { digits: appLockConfig.pinDigits }) : undefined} />
              {message ? <p className="lock-error" role="alert">{message}</p> : null}
              {seconds > 0 ? <p className="lock-notice" aria-live="off">{t("retryIn", { seconds })}</p> : null}
              <button className="lock-primary" type="submit" disabled={busy || seconds > 0}>{t(isSubmitting ? "checking" : "unlock")}</button>
            </form>
            {record.device ? <button className="lock-secondary mt-3 w-full" type="button" disabled={busy} onClick={() => void deviceUnlock()}><Fingerprint size={22} aria-hidden="true" />{t(deviceBusy ? "checking" : "useDevice")}</button> : null}
            {!online ? <p className="lock-notice" role="status">{t("offline")}</p> : null}
          </> : <p className="lock-notice" role="status">{t("loading")}</p>}
          <button className="lock-text mt-5" type="button" disabled={busy} onClick={() => { reset(); setRecovery(true); }}>{t("forgotPin")}</button>
        </>}
      </div>
    </div>
  </dialog>;
}
