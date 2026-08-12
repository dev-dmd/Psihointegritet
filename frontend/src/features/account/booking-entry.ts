import type { Route } from "next";

/**
 * Where „Zakaži termin" sends a signed-in client.
 *
 * The panel has no booking flow of its own — the design's bottom sheet („KP
 * SHEET: Zakazivanje") would need service and therapist lists the client API
 * does not expose yet — so every booking action leaves for the public request
 * form, which is the one flow that really submits to the Booking Engine.
 *
 * Public marketing paths are not in the platform route registry: they are
 * recorded in `PUBLIC_ROUTES` as inventory for the SEO slice and are the same
 * in every locale until that slice activates them. Naming the path once here
 * keeps the panel from repeating it in four components and gives that slice a
 * single line to change.
 */
export const BOOKING_PATH = "/zakazi" as Route;
