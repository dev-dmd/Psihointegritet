import { getLocale } from "next-intl/server";

import { type UiLocale, isUiLocale } from "@/i18n/locales";

/**
 * The one place next-intl's untyped `Locale` is narrowed to `UiLocale`.
 *
 * `getLocale()` is typed `Promise<string>` in 4.13.2 because the `Locale` half
 * of our `AppConfig` augmentation cannot merge (see `next-intl.d.ts`). Rather
 * than scatter casts, every caller comes through here.
 *
 * Why go through `getLocale()` at all, when `resolvePublicLocale()` already
 * returns a `UiLocale` directly: this asks next-intl what it *actually used* to
 * render, so `<html lang>` cannot drift from the language of the messages on
 * the page. Reading the source separately would make them equal by convention
 * instead of by construction, and that is exactly the kind of agreement that
 * silently stops holding.
 *
 * Throws rather than defaulting, for the same reason `resolveDeploymentOrganization`
 * does: the fallback would be `en`, and the only organization that exists today
 * is Serbian.
 */
export async function getUiLocale(): Promise<UiLocale> {
  const locale = await getLocale();
  if (!isUiLocale(locale)) {
    throw new Error(
      `next-intl resolved an unsupported locale "${locale}". ` +
        `Supported locales are declared in src/i18n/locales.ts.`,
    );
  }
  return locale;
}
