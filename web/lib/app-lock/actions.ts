import { createDeviceCredential, verifyDeviceCredential } from "@/lib/app-lock/device";
import { getSupabase } from "@/lib/auth/client";
import { LockError } from "@/lib/app-lock/errors";
import { createPinVerifier, failedAttempt, matchesPin } from "@/lib/app-lock/pin";
import { activateAppLock, setLockState, useAppLock } from "@/lib/app-lock/state";
import { readLock, removeLock, withLockStorage, writeLock, type LockRecord } from "@/lib/app-lock/storage";

async function transaction<T>(operation: () => Promise<T>): Promise<T> {
  try { return await withLockStorage(operation); }
  catch (error) {
    if (error instanceof LockError && error.code === "storage") setLockState("unavailable", useAppLock.getState().record, true);
    throw error;
  }
}

function currentRecord(owner?: string): LockRecord {
  const record = readLock();
  if (!record || (owner && record.ownerId !== owner)) throw new LockError("changed");
  return record;
}

function checkAttempt(epoch: number): void {
  if (useAppLock.getState().epoch !== epoch || document.visibilityState === "hidden") throw new LockError("changed");
}

async function checkOwner(owner: string): Promise<void> {
  const { data, error } = await getSupabase().auth.getSession();
  if (error || data.session?.user.id !== owner) throw new LockError("session");
}

async function authorizePin(pin: string, owner?: string): Promise<LockRecord> {
  const record = currentRecord(owner);
  if (record.retryAt > Date.now()) throw new LockError("cooldown");
  // Reserve the attempt before hashing so reloads cannot abandon a failed try.
  const attempted = failedAttempt(record, Date.now());
  writeLock(attempted);
  useAppLock.setState({ record: attempted });
  if (!await matchesPin(pin, record.pin)) throw new LockError(attempted.retryAt ? "cooldown" : "incorrect");
  const verified = { ...record, failures: 0, retryAt: 0 };
  writeLock(verified);
  useAppLock.setState({ record: verified });
  return verified;
}

export async function enableAppLock(ownerId: string, pin: string): Promise<void> {
  const epoch = useAppLock.getState().epoch;
  await transaction(async () => {
    checkAttempt(epoch);
    if (readLock()) throw new LockError("changed");
    const verifier = await createPinVerifier(pin);
    await checkOwner(ownerId);
    checkAttempt(epoch);
    const record: LockRecord = { format: 1, id: crypto.randomUUID(), ownerId, pin: verifier, failures: 0, retryAt: 0 };
    writeLock(record);
    setLockState("unlocked", record, true);
    activateAppLock();
  });
}

export async function unlockWithPin(pin: string): Promise<void> {
  const epoch = useAppLock.getState().epoch;
  await transaction(async () => {
    checkAttempt(epoch);
    const record = await authorizePin(pin);
    checkAttempt(epoch);
    setLockState("unlocked", record);
  });
}

export type PinChange = "change" | "disable" | "removeDevice";
export async function changeAppLock(owner: string, currentPin: string, change: PinChange, pin?: string): Promise<void> {
  const epoch = useAppLock.getState().epoch;
  await transaction(async () => {
    checkAttempt(epoch);
    const record = await authorizePin(currentPin, owner);
    const verifier = change === "change" ? await createPinVerifier(pin ?? "") : record.pin;
    await checkOwner(owner);
    checkAttempt(epoch);
    if (change === "disable") {
      removeLock();
      setLockState("disabled", null, true);
      return;
    }
    const updated = { ...record, id: crypto.randomUUID(), pin: verifier, device: change === "removeDevice" ? undefined : record.device };
    writeLock(updated);
    setLockState("unlocked", updated, true);
  });
}

export async function enableDeviceUnlock(owner: string, pin: string, signal: AbortSignal, label: string): Promise<void> {
  const epoch = useAppLock.getState().epoch;
  const record = await transaction(async () => {
    checkAttempt(epoch);
    if (signal.aborted) throw new LockError("cancelled");
    return authorizePin(pin, owner);
  });
  checkAttempt(epoch);
  const device = await createDeviceCredential(signal, label);
  await transaction(async () => {
    await checkOwner(owner);
    checkAttempt(epoch);
    const current = currentRecord(owner);
    if (signal.aborted || current.id !== record.id) throw new LockError("changed");
    const updated = { ...current, id: crypto.randomUUID(), device };
    writeLock(updated);
    setLockState("unlocked", updated, true);
  });
}

export async function unlockWithDevice(signal: AbortSignal): Promise<void> {
  const epoch = useAppLock.getState().epoch;
  const record = currentRecord();
  if (!record.device) throw new LockError("device");
  await verifyDeviceCredential(record.device, signal);
  await transaction(async () => {
    checkAttempt(epoch);
    const current = currentRecord();
    if (signal.aborted || current.id !== record.id) throw new LockError("changed");
    const updated = { ...current, failures: 0, retryAt: 0 };
    writeLock(updated);
    setLockState("unlocked", updated);
  });
}
