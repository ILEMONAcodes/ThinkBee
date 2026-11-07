import { describe, expect, it } from "vitest";

import { cropNames, emptyFarm, farmSchema, maxSetupUnits, profileSchema, signInSchema } from "@/lib/onboarding/forms";

describe("onboarding validation", () => {
  it("requires a valid email and deliberate age confirmation", () => {
    expect(signInSchema.safeParse({ email: "farmer@example.test", adult: false }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "not an email", adult: true }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "farmer@example.test", adult: true }).success).toBe(true);
  });
  it("trims profiles and rejects blank names", () => {
    expect(profileSchema.safeParse({ display_name: "   ", bio: "" }).success).toBe(false);
    expect(profileSchema.parse({ display_name: " Ada ", bio: " Farmer " })).toEqual({ display_name: "Ada", bio: "Farmer" });
    expect(profileSchema.safeParse({ display_name: "Ada", bio: "x".repeat(281) }).success).toBe(false);
  });
  it("requires a state for LGA and whole, bounded hive counts", () => {
    expect(farmSchema.safeParse({ ...emptyFarm, name: "Farm", lga: "North" }).success).toBe(false);
    expect(farmSchema.safeParse({ ...emptyFarm, name: "Farm", hiveCount: 1.2 }).success).toBe(false);
    expect(farmSchema.safeParse({ ...emptyFarm, name: "Farm", hiveCount: maxSetupUnits, crops: "Maize" }).success).toBe(false);
    expect(farmSchema.safeParse({ ...emptyFarm, name: "Farm", state: "Oyo", lga: "Ibadan North", hiveCount: 2 }).success).toBe(true);
  });
  it("deduplicates crop entries and bounds each crop name", () => {
    expect(cropNames("Cassava, Maize, Cassava, ")).toEqual(["Cassava", "Maize"]);
    expect(farmSchema.safeParse({ ...emptyFarm, name: "Farm", crops: "x".repeat(81) }).success).toBe(false);
  });
});
