import { z } from "zod";

export const emailSchema = z.string().trim().pipe(z.email().max(254));
export const newPasswordSchema = z.string().min(8).max(128);
export const signInSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) });
export const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: emailSchema,
  password: newPasswordSchema,
  confirmPassword: z.string(),
  adult: z.boolean().refine(Boolean),
}).refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"] });
export const resetPasswordSchema = z.object({ password: newPasswordSchema, confirmPassword: z.string() })
  .refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"] });
