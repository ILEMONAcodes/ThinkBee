"use client";

import { useTranslations } from "next-intl";
import type { FieldErrors, UseFormRegister } from "react-hook-form";

import { maxSetupUnits, type FarmFormValues } from "@/lib/onboarding/forms";

export function FarmFields({ register, errors, kind }: Readonly<{ register: UseFormRegister<FarmFormValues>; errors: FieldErrors<FarmFormValues>; kind: FarmFormValues["kind"] }>) {
  const t = useTranslations("Setup");
  return <>
    <fieldset><legend className="setup-label">{t("farmKind")}</legend><div className="flex flex-wrap gap-3">{(["crops", "bees", "both"] as const).map((value) => <label className="theme-option" key={value}><input {...register("kind")} type="radio" value={value} /><span>{t(value)}</span></label>)}</div></fieldset>
    <div><label className="setup-label" htmlFor="farmName">{t("farmName")}</label><input {...register("name")} className="setup-input" id="farmName" maxLength={120} aria-invalid={!!errors.name} aria-describedby={errors.name ? "farm-name-error" : undefined} />{errors.name ? <p className="setup-field-error" id="farm-name-error">{t("farmNameInvalid")}</p> : null}</div>
    <div className="grid gap-5 sm:grid-cols-2">
      <div><label className="setup-label" htmlFor="state">{t("state")}</label><input {...register("state")} className="setup-input" id="state" maxLength={80} autoComplete="address-level1" aria-invalid={!!errors.state} aria-describedby={errors.state ? "state-error" : undefined} />{errors.state ? <p className="setup-field-error" id="state-error">{t("stateRequired")}</p> : null}</div>
      <div><label className="setup-label" htmlFor="lga">{t("lga")}</label><input {...register("lga")} className="setup-input" id="lga" maxLength={100} autoComplete="address-level2" /></div>
    </div>
    {kind !== "crops" ? <div className="grid gap-5 sm:grid-cols-2">
      <div><label className="setup-label" htmlFor="hiveCount">{t("hiveCount")}</label><input {...register("hiveCount", { valueAsNumber: true })} className="setup-input" id="hiveCount" type="number" min={0} max={maxSetupUnits} inputMode="numeric" aria-invalid={!!errors.hiveCount} aria-describedby={errors.hiveCount ? "hive-error" : undefined} />{errors.hiveCount ? <p className="setup-field-error" id="hive-error">{t("hiveCountInvalid", { max: maxSetupUnits })}</p> : null}</div>
      <div><label className="setup-label" htmlFor="hiveType">{t("hiveType")}</label><input {...register("hiveType")} className="setup-input" id="hiveType" maxLength={80} /></div>
    </div> : null}
    {kind !== "bees" ? <div><label className="setup-label" htmlFor="crops">{t("cropNames")}</label><input {...register("crops")} className="setup-input" id="crops" maxLength={2000} aria-invalid={!!errors.crops} aria-describedby="crop-hint" /><p className="mt-2 text-sm text-subtle" id="crop-hint">{t("cropHint")}</p>{errors.crops ? <p className="setup-field-error">{t("unitLimit", { max: maxSetupUnits })}</p> : null}</div> : null}
  </>;
}
