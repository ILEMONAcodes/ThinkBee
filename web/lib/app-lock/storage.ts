import { z } from "zod";

import { appLockStorageKey } from "@/lib/app-lock/config";
import { LockError } from "@/lib/app-lock/errors";

const encoded = z.string().regex(/^[A-Za-z0-9_-]+$/);
const pinSchema = z.object({
  salt: encoded.length(43), hash: encoded.length(43),
  iterations: z.number().int().min(600_000).max(2_000_000),
}).strict();
const deviceSchema = z.object({
  id: encoded.min(1).max(2048), publicKey: encoded.min(32).max(2048), userHandle: encoded.length(43),
}).strict();
const recordSchema = z.object({
  format: z.literal(1), id: z.uuid(), ownerId: z.uuid(), pin: pinSchema,
  device: deviceSchema.optional(), failures: z.number().int().min(0).max(100),
  retryAt: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
}).strict();

export type PinVerifier = z.infer<typeof pinSchema>;
export type DeviceCredential = z.infer<typeof deviceSchema>;
export type LockRecord = z.infer<typeof recordSchema>;

export function readLock(): LockRecord | null {
  try {
    const raw = localStorage.getItem(appLockStorageKey);
    return raw === null ? null : recordSchema.parse(JSON.parse(raw));
  } catch { throw new LockError("storage"); }
}

export function writeLock(record: LockRecord): void {
  try {
    const serialized = JSON.stringify(recordSchema.parse(record));
    localStorage.setItem(appLockStorageKey, serialized);
    if (localStorage.getItem(appLockStorageKey) !== serialized) throw new Error();
  } catch { throw new LockError("storage"); }
}

export function removeLock(): void {
  try {
    localStorage.removeItem(appLockStorageKey);
    if (localStorage.getItem(appLockStorageKey) !== null) throw new Error();
  } catch { throw new LockError("storage"); }
}

export function supportsAppLock(): boolean {
  return window.isSecureContext && !!globalThis.crypto?.subtle && !!navigator.locks;
}

// Serializes attempts and settings changes across tabs; no lost failure counts.
export async function withLockStorage<T>(operation: () => Promise<T>): Promise<T> {
  if (!supportsAppLock()) throw new LockError("unsupported");
  return navigator.locks.request(appLockStorageKey, operation);
}
