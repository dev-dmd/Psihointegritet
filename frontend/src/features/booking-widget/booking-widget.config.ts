import type {
  BookingFormat,
  BookingSlot,
  BookingWidgetCopy,
  BookingWidgetSearchContext,
} from "./booking-widget.types";

export const defaultBookingWidgetCopy: BookingWidgetCopy = {
  title: "Zakažite termin",
  requestNotice: "Izbor termina je zahtev; terapeut ga potvrđuje.",
  nextAvailableLabel: "Sledeći dostupni termini",
  cancelLabel: "Otkaži",
  notifyLabel: "Obavesti me",
  bookLabel: "Zakaži",
  onlineLabel: "Online",
  inPersonLabel: "Uživo",
};

export const bookingWeekdayLabels = [
  "Pon",
  "Uto",
  "Sre",
  "Čet",
  "Pet",
  "Sub",
  "Ned",
] as const;

export const bookingMonthLabels = [
  "Januar",
  "Februar",
  "Mart",
  "April",
  "Maj",
  "Jun",
  "Jul",
  "Avgust",
  "Septembar",
  "Oktobar",
  "Novembar",
  "Decembar",
] as const;

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

export function formatBookingPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("sr-Latn-RS", {
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
