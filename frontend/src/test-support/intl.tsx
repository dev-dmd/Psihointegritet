import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";

import { PLATFORM_DEFAULT_LOCALE, type UiLocale } from "@/i18n/locales";
import { getPlatformMessages } from "@/messages";

/**
 * Wraps a subtree in the intl context that the root layout provides in the app.
 *
 * `useLocale()` throws without a provider — correctly, since a component that
 * cannot know its organization's language must not guess one. That is the right
 * behaviour in production and a wall in unit tests, which render components in
 * isolation. This is the seam that keeps the hook strict while letting tests
 * render.
 *
 * Defaults to `sr-Latn`, not to the platform default: the existing suite
 * asserts Serbian on-screen text, and those assertions are the oracle proving
 * the i18n work changed no rendered output.
 */
export function withIntl(
  node: ReactNode,
  locale: UiLocale = "sr-Latn",
): ReactNode {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={getPlatformMessages(locale)}
      timeZone="Europe/Belgrade"
    >
      {node}
    </NextIntlClientProvider>
  );
}

export { PLATFORM_DEFAULT_LOCALE };
