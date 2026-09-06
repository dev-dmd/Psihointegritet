import type { UiLocale } from "@/i18n/locales";
import type { EnMessages, PlatformMessages } from "@/messages/en";
import { enMessages } from "@/messages/en";
import { srLatnMessages } from "@/messages/sr-Latn";

/**
 * The single message loader (D-067, D-077).
 *
 * A **static switch**, deliberately not `await import(\`./\${locale}\`)`. A
 * dynamic import by variable is opaque to the bundler, which then either ships
 * every locale to every client or fails to ship any; it also erases the exact
 * return type, which is the thing the whole catalogue design exists to keep.
 * With two locales the switch costs nothing and stays statically analysable.
 *
 * Returning every namespace here is safe: server messages are never serialised
 * to the browser. Only what a `NextIntlClientProvider` is handed crosses the
 * boundary, so a client subtree receives the namespaces it needs and no more.
 */
export function getPlatformMessages(locale: UiLocale): EnMessages {
  switch (locale) {
    case "en":
      return enMessages;
    case "sr-Latn":
      // The second and last deliberate cast in the codebase (the other is the
      // single `as Route` in `lib/routes/localized-path.ts`).
      //
      // `AppConfig["Messages"]` must be the *literal* English type, because
      // next-intl reads ICU argument types out of the message values — widen it
      // and every `t(key, values)` call silently stops being checked. But a
      // translated catalogue is `Widen<EnMessages>` by design, so its `string`
      // leaves are not assignable to `"Save"`.
      //
      // The two types describe different things: the literal one is a
      // compile-time device for key and argument checking, the widened one is
      // the runtime shape. They agree on every key, which is what
      // `messages.test.ts` asserts and what makes this cast safe rather than
      // convenient. It lives here, once, instead of at every call site.
      return srLatnMessages as EnMessages;
  }
}

export type { PlatformMessages };
