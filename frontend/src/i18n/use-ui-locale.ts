"use client";

import { useLocale } from "next-intl";

import {
  PLATFORM_DEFAULT_LOCALE,
  type UiLocale,
  isUiLocale,
} from "@/i18n/locales";

/**
 * The organization's UI locale, narrowed, for Client Components.
 *
 * `useLocale()` is typed `string` in next-intl 4.13.2 because the `Locale` half
 * of our `AppConfig` augmentation cannot merge (see `i18n/next-intl.d.ts`), so
 * every consumer would otherwise repeat the same three lines of narrowing. This
 * is the client-side twin of `i18n/locale-boundary.ts`, which does the same job
 * on the server.
 *
 * Unlike the server boundary this one **falls back rather than throwing**. A
 * Client Component that renders during an error boundary or a test without a
 * provider should degrade to a link in the platform default language, not take
 * the tree down — the server has already thrown loudly if the locale is
 * genuinely unresolvable, so by the time this runs the value is either correct
 * or the page is already failing for a better-reported reason.
 */
export function useUiLocale(): UiLocale {
  const locale = useLocale();
  return isUiLocale(locale) ? locale : PLATFORM_DEFAULT_LOCALE;
}
