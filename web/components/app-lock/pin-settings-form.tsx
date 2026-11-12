"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { PinField } from "@/components/app-lock/pin-field";
import { changeAppLock, enableAppLock, enableDeviceUnlock } from "@/lib/app-lock/actions";
import { appLockConfig } from "@/lib/app-lock/policy";
import { pinInputSchema } from "@/lib/app-lock/pin";
import { useLockFeedback } from "@/lib/hooks/use-lock-feedback";

export type LockFormMode = "setup" | "change" | "disable" | "device" | "removeDevice";

export function PinSettingsForm({ mode, owner, onCancel }: Readonly<{ mode: LockFormMode; owner: string; onCancel: () => void }>) {
  const t = useTranslations("AppLock");
  const creating = mode === "setup" || mode === "change";
  const schema = z.object({
    currentPin: mode === "setup" ? z.string() : pinInputSchema,
    pin: creating ? pinInputSchema : z.string(), confirmation: creating ? pinInputSchema : z.string(),
  }).refine((values) => !creating || values.pin === values.confirmation, { path: ["confirmation"] });
  const [error, setError] = useState<unknown>();
  const controller = useRef<AbortController | null>(null);
  const { seconds, message } = useLockFeedback(error);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { pin: "", confirmation: "", currentPin: "" } });
  useEffect(() => () => controller.current?.abort(), []);
  const submit = async ({ pin, currentPin }: z.infer<typeof schema>) => {
    setError(undefined);
    try {
      if (mode === "setup") await enableAppLock(owner, pin);
      else if (mode === "device") {
        controller.current = new AbortController();
        await enableDeviceUnlock(owner, currentPin, controller.current.signal, t("credentialName"));
      } else await changeAppLock(owner, currentPin, mode, pin);
      onCancel();
    } catch (failure) { setError(failure); }
    finally { reset(); }
  };
  return <form className="lock-form" noValidate onSubmit={(event) => void handleSubmit(submit)(event)} aria-busy={isSubmitting}>
    <h3 className="font-display text-2xl">{t(`formTitles.${mode}`)}</h3>
    <p className="text-subtle">{t(mode === "setup" ? "choosePin" : "confirmCurrent", { digits: appLockConfig.pinDigits })}</p>
    {mode !== "setup" ? <PinField field={register("currentPin")} label={t("currentPin")} autoFocus error={errors.currentPin ? t("pinInvalid", { digits: appLockConfig.pinDigits }) : undefined} /> : null}
    {creating ? <>
      <PinField field={register("pin")} label={t("newPin")} autoFocus={mode === "setup"} error={errors.pin ? t("pinInvalid", { digits: appLockConfig.pinDigits }) : undefined} />
      <PinField field={register("confirmation")} label={t("confirmPin")} error={errors.confirmation ? t("pinMismatch") : undefined} />
    </> : null}
    {message ? <p className="lock-error" role="alert">{message}</p> : null}
    {seconds > 0 ? <p className="lock-notice" aria-live="off">{t("retryIn", { seconds })}</p> : null}
    <div className="lock-actions">
      <button className="lock-secondary" type="button" disabled={isSubmitting} onClick={onCancel}>{t("cancel")}</button>
      <button className={mode === "disable" ? "lock-danger" : "lock-primary"} type="submit" disabled={isSubmitting || seconds > 0}>{t(isSubmitting ? "saving" : `formActions.${mode}`)}</button>
    </div>
  </form>;
}
