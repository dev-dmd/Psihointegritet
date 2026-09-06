/**
 * The platform's locale vocabulary (D-077).
 *
 * Deliberately dependency-free and without `server-only`: the proxy (edge
 * runtime), Server Components, Client Components and the route registry all
 * import from here, so anything heavier would either break the edge bundle or
 * force a client/server split of the vocabulary itself.
 *
 * A locale is a **platform UI locale** — the language of navigation, system
 * messages, validations, statuses and system emails. It is NOT:
 * - the language a tenant writes its content in (that is
 *   `organization.ui_locale`, resolved through the SSG/ISR-safe public seam);
 * - a timezone, a currency or a business location — those travel on their own
 *   fields precisely so `en` cannot silently imply "USD" or "America/Chicago";
 * - an orthographic variant. Ekavica and ijekavica are both content inside
 *   `sr-Latn`, exactly as the author writes them. There is no automatic
 *   `e → je/ije` conversion and there never will be (T9, D-017).
 *
 * Adding a locale is a deliberate act: this array, a full message catalogue,
 * a route-registry path per entry, and a backend CHECK-constraint migration.
 * The type system enforces the first three; the constraint enforces the last.
 */

/**
 * What a new organization gets when nothing else is specified.
 *
 * Changed from `sr-Latn` to `en` by D-077. The existing Psihointegritet
 * organization is backfilled to `sr-Latn` by migration and never reads this.
 */
export const PLATFORM_DEFAULT_LOCALE = "en";

/** Every locale the platform UI can render. Order is display order. */
export const SUPPORTED_UI_LOCALES = ["en", "sr-Latn"] as const;

export type UiLocale = (typeof SUPPORTED_UI_LOCALES)[number];

/**
 * BCP-47 value for `<html lang>`. Identity today, but a named seam: a future
 * `sr-Cyrl` would need `sr-Cyrl-RS` here while keeping the short internal key.
 */
export const HTML_LANG_BY_LOCALE: Record<UiLocale, string> = {
  en: "en",
  "sr-Latn": "sr-Latn",
};

/**
 * Endonyms — each language names itself. A locale picker that says „Serbian"
 * in English to someone who only reads Serbian defeats its own purpose, so
 * these are never translated and never go through the message catalogue.
 */
export const LOCALE_ENDONYMS: Record<UiLocale, string> = {
  en: "English",
  "sr-Latn": "Srpski — latinica",
};

/**
 * Narrows untrusted input (env var, API payload, URL segment) to a locale.
 *
 * Returns a boolean rather than throwing so callers choose their own failure
 * mode: the env loader fails the process, a request handler falls back.
 */
export function isUiLocale(value: unknown): value is UiLocale {
  return (
    typeof value === "string" &&
    (SUPPORTED_UI_LOCALES as readonly string[]).includes(value)
  );
}
