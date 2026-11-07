export const PWA_MEANINGFUL_USE_KEY = "thinkbee-pwa-meaningful-use";
export const PWA_MEANINGFUL_USE_EVENT = "thinkbee:pwa-meaningful-use";

export type MeaningfulUse = "saved_scan" | "sent_message";

export function markPwaMeaningfulUse(reason: MeaningfulUse): void {
  try {
    localStorage.setItem(PWA_MEANINGFUL_USE_KEY, reason);
  } catch {
    // Installation remains optional when browser storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent(PWA_MEANINGFUL_USE_EVENT, { detail: reason }));
}
