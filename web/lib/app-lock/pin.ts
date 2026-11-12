import { z } from "zod";

import { appLockConfig } from "@/lib/app-lock/policy";
import { decodeBytes, encodeBytes, equalBytes } from "@/lib/app-lock/encoding";
import { LockError } from "@/lib/app-lock/errors";
import type { LockRecord, PinVerifier } from "@/lib/app-lock/storage";

export const pinInputSchema = z.string().regex(new RegExp(`^[0-9]{${appLockConfig.pinDigits}}$`));
export const newPinSchema = z.object({ pin: pinInputSchema, confirmation: pinInputSchema })
  .refine((values) => values.pin === values.confirmation, { path: ["confirmation"] });

async function derive(pin: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256));
}

export async function createPinVerifier(pin: string): Promise<PinVerifier> {
  if (!pinInputSchema.safeParse(pin).success) throw new LockError("incorrect");
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const iterations = appLockConfig.pinIterations;
  return { salt: encodeBytes(salt), hash: encodeBytes(await derive(pin, salt, iterations)), iterations };
}

export async function matchesPin(pin: string, verifier: PinVerifier): Promise<boolean> {
  if (!pinInputSchema.safeParse(pin).success) return false;
  return equalBytes(await derive(pin, decodeBytes(verifier.salt), verifier.iterations), decodeBytes(verifier.hash));
}

export function failedAttempt(record: LockRecord, now: number): LockRecord {
  const failures = Math.min(100, record.failures + 1);
  const delay = failures < appLockConfig.attemptsBeforeDelay ? 0
    : Math.min(appLockConfig.retryMaximumMs, appLockConfig.retryBaseMs * 2 ** (failures - appLockConfig.attemptsBeforeDelay));
  return { ...record, failures, retryAt: delay ? now + delay : 0 };
}
