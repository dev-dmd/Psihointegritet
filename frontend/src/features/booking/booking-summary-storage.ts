import type { BookingSummary } from "@/features/booking/booking-types";

const STORAGE_KEY = "psihointegritet:booking-summary";

/**
 * A matching result may cross one same-tab route transition, but it is never
 * encoded in the URL or persisted beyond this browser session.
 */
export function storeBookingSummary(summary: BookingSummary): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(summary));
}

export function consumeBookingSummary(): BookingSummary | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  window.sessionStorage.removeItem(STORAGE_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as BookingSummary;
  } catch {
    return undefined;
  }
}
