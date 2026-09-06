import type {
  BookingFormat,
  BookingSlot,
  BookingWidgetSearchContext,
} from "./booking-widget.types";
import type { UiLocale } from "@/i18n/locales";

/** Fills a single `{name}` placeholder without touching the rest of the copy. */
export function formatBookingCopy(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? (values[key] ?? match) : match,
  );
}

export function parseBookingWidgetSearchParams(
  searchParams: Pick<URLSearchParams, "get">,
): BookingWidgetSearchContext {
  const format = searchParams.get("format");

  return {
    serviceSlug: searchParams.get("service") || null,
    therapistSlug: searchParams.get("therapist") || null,
    format: isBookingFormat(format) ? format : null,
    source: searchParams.get("source") || null,
  };
}

export function isBookingFormat(value: string | null): value is BookingFormat {
  return value === "online" || value === "uzivo";
}

export function formatBookingPrice(
  price: number,
  currency: string,
  locale: UiLocale = "sr-Latn",
): string {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "sr-Latn-RS", {
    maximumFractionDigits: 0,
  })
    .format(price)
    .concat(` ${currency}`);
}

export function toLocalDate(date: string): Date {
  return new Date(`${date}T12:00:00`);
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isPastDate(date: string, today = new Date()): boolean {
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return toLocalDate(date) < startOfToday;
}

export function availableDateKeys(slots: BookingSlot[]): Set<string> {
  return new Set(
    slots
      .filter((slot) => slot.available && !isPastDate(slot.date))
      .map((slot) => slot.date),
  );
}

export function firstAvailableDate(slots: BookingSlot[]): string | null {
  return [...availableDateKeys(slots)].sort()[0] ?? null;
}

export function monthGrid(month: Date): Array<Date | null> {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const startsOnMonday = (firstDay.getDay() + 6) % 7;
  const days: Array<Date | null> = Array.from(
    { length: startsOnMonday },
    () => null,
  );

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push(new Date(month.getFullYear(), month.getMonth(), day));
  }

  while (days.length % 7 !== 0) days.push(null);
  return days;
}

/** Honours the OS "reduce motion" setting; safe in SSR and in jsdom. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
