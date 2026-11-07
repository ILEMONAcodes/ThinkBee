import { z } from "zod";

const configuredUnits = Number(process.env.NEXT_PUBLIC_ONBOARDING_MAX_UNITS ?? 200);
export const maxSetupUnits = Number.isInteger(configuredUnits) && configuredUnits > 0 ? configuredUnits : 200;
export const signInSchema = z.object({ email: z.email().max(254), adult: z.boolean().refine(Boolean) });
export const profileSchema = z.object({ display_name: z.string().trim().min(1).max(80), bio: z.string().trim().max(280) });
export const farmSchema = z.object({
  name: z.string().trim().min(1).max(120), kind: z.enum(["crops", "bees", "both"]),
  state: z.string().trim().max(80), lga: z.string().trim().max(100),
  hiveCount: z.number().int().min(0).max(maxSetupUnits), hiveType: z.string().trim().max(80),
  crops: z.string().max(2000),
}).superRefine((data, context) => {
  if (data.lga && !data.state) context.addIssue({ code: "custom", path: ["state"], message: "state_required" });
  const crops = cropNames(data.crops);
  if (crops.some((crop) => crop.length > 80) || crops.length + (data.kind === "crops" ? 0 : data.hiveCount) > maxSetupUnits) {
    context.addIssue({ code: "custom", path: ["crops"], message: "unit_limit" });
  }
});
export function cropNames(value: string): string[] { return [...new Set(value.split(",").map((crop) => crop.trim()).filter(Boolean))]; }
export type ProfileFormValues = z.infer<typeof profileSchema>;
export type FarmFormValues = z.infer<typeof farmSchema>;
export const emptyFarm: FarmFormValues = { name: "", kind: "both", state: "", lga: "", hiveCount: 0, hiveType: "", crops: "" };
