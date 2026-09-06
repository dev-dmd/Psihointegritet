import type { UiLocale } from "@/i18n/locales";
import { localizedPublicPath } from "@/lib/routes/public-path";

/**
 * Where „Zakaži termin" sends a signed-in client.
 *
 * The panel has no booking flow of its own — the design's bottom sheet („KP
 * SHEET: Zakazivanje") would need service and therapist lists the client API
 * does not expose yet — so every booking action leaves for the public request
 * form, which is the one flow that really submits to the Booking Engine.
 *
 * The public booking route is localized, while its service/source query codes
 * remain stable. Keeping the route id here prevents account screens from
 * falling back to a Serbian literal when the organization UI is English.
 */
export function accountBookingPath(locale: UiLocale) {
  return localizedPublicPath("public.book", { locale });
}
