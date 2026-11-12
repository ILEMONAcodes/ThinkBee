const idleMinutes = Number(process.env.NEXT_PUBLIC_APP_LOCK_IDLE_MINUTES ?? 5);
export const appLockConfig = {
  pinDigits: 6,
  pinIterations: 600_000,
  attemptsBeforeDelay: 5,
  retryBaseMs: 30_000,
  retryMaximumMs: 15 * 60_000,
  idleMs: (Number.isFinite(idleMinutes) && idleMinutes >= 1 && idleMinutes <= 60 ? idleMinutes : 5) * 60_000,
  credentialTimeoutMs: 60_000,
};
