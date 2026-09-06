"use client";

import { PLATFORM_DEFAULT_LOCALE, HTML_LANG_BY_LOCALE } from "@/i18n/locales";

/**
 * The last resort boundary — it replaces the root layout, so no provider,
 * no `getLocale()` and no organization context is available here.
 *
 * It therefore falls back to the platform default (`en`) and English copy
 * (D-077 §26). That is deliberate and is the one place a fallback is correct:
 * this component renders only when locale resolution may itself be what failed,
 * and an error page that throws while trying to translate itself leaves the
 * user with a blank document.
 *
 * A Serbian organization's users will see this in English. That is the accepted
 * trade for a page that cannot fail, and it is why nothing else in the app is
 * allowed to fall back this way.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang={HTML_LANG_BY_LOCALE[PLATFORM_DEFAULT_LOCALE]}>
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <h1>Something went wrong</h1>
        <p>Refresh the page, or try again later.</p>
        {error.digest ? <p>Support code: {error.digest}</p> : null}
        <button type="button" onClick={reset}>
          Try again
        </button>
      </body>
    </html>
  );
}
