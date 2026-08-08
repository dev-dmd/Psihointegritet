/** Shared date/time formatting for Serbian locale (sr-Latn-RS).

Kept here so the Booking Widget, intake panels and CMS screens all format
dates the same way. Never import Intl directly in a visual component —
import from here instead.
*/

/**
 * Format a date string (ISO YYYY-MM-DD or full datetime) as DD.MM.YYYY.
 *
 * @example formatDateSr("2026-08-15") // "15.08.2026"
 * @example formatDateSr("2026-08-15T14:00:00Z") // "15.08.2026"
 */
export function formatDateSr(dateStr: string): string {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

/**
 * Format a time string (HH:MM or ISO datetime) as HH:MM.
 *
 * @example formatTimeSr("09:00") // "09:00"
 * @example formatTimeSr("2026-08-15T14:30:00Z") // "14:30"
 */
export function formatTimeSr(timeStr: string): string {
    // If it has a T, extract the time portion
    if (timeStr.includes("T")) {
        const match = timeStr.match(/T(\d{2}:\d{2})/);
        if (match) return match[1]!;
    }
    // Already HH:MM or similar
    const parts = timeStr.split(":");
    if (parts.length >= 2) {
        return `${parts[0]!.padStart(2, "0")}:${parts[1]!.padStart(2, "0")}`;
    }
    return timeStr;
}

/**
 * Format a date and time range for the confirmation screen.
 *
 * @example formatSlotRangeSr("2026-08-15", "09:00", "10:00")
 *   // "15.08.2026 · 09:00 – 10:00"
 */
export function formatSlotRangeSr(
    dateStr: string,
    startTime: string,
    endTime: string,
): string {
    return `${formatDateSr(dateStr)} · ${formatTimeSr(startTime)} – ${formatTimeSr(endTime)}`;
}
