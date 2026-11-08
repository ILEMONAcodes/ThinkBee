import { expect, it } from "vitest";

import { registerSchema, resetPasswordSchema, signInSchema } from "@/lib/auth/forms";

const registration = { name: " Ada ", email: " farmer@example.test ", password: "a long password", confirmPassword: "a long password", adult: true };

it("requires name, valid email, confirmed age and matching strong-enough passwords", () => {
  expect(registerSchema.parse(registration)).toMatchObject({ name: "Ada", email: "farmer@example.test" });
  for (const change of [{ name: " " }, { email: "invalid" }, { adult: false }, { password: "short" }, { confirmPassword: "different" }]) {
    expect(registerSchema.safeParse({ ...registration, ...change }).success).toBe(false);
  }
});

it("does not trim passwords or prevent existing users signing in with older short passwords", () => {
  expect(signInSchema.parse({ email: "a@example.test", password: " 12345 " }).password).toBe(" 12345 ");
  expect(signInSchema.safeParse({ email: "a@example.test", password: "" }).success).toBe(false);
});

it("validates both fields during password recovery", () => {
  expect(resetPasswordSchema.safeParse({ password: "short", confirmPassword: "short" }).success).toBe(false);
  expect(resetPasswordSchema.safeParse({ password: "new password", confirmPassword: "different password" }).success).toBe(false);
  expect(resetPasswordSchema.safeParse({ password: "new password", confirmPassword: "new password" }).success).toBe(true);
});
