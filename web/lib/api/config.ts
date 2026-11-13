const configured = Number(process.env.NEXT_PUBLIC_ACCOUNT_TIMEOUT_SECONDS ?? 90);

// Account startup can include waking an idle backend; ordinary writes stay short.
export const accountTimeoutMs = (Number.isFinite(configured) && configured >= 15 && configured <= 180 ? configured : 90) * 1000;
export const requestTimeoutMs = 15_000;
