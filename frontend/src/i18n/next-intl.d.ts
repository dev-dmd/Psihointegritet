import type { UiLocale } from "@/i18n/locales";
import type { EnMessages } from "@/messages/en";

/**
 * next-intl type augmentation (I18N-2).
 *
 * Written by hand rather than generated: `experimental.createMessagesDeclaration`
 * reads and parses message *files* and works with JSON, while D-067 mandates TS
 * dictionaries under `messages/<locale>/*.ts`.
 *
 * **`Messages` points at the LITERAL English type, not `PlatformMessages`.**
 * This is the one place the two shapes must deliberately differ, and it is
 * worth the paragraph:
 *
 * next-intl 4.x infers ICU argument types from the message *value* — it reads
 * `"{count, plural, ...}"` out of the literal type to know that `t("x")`
 * requires a `count`. Widened `string` leaves carry no such information, so
 * pointing this at `PlatformMessages` would silently downgrade every
 * `t(key, values)` call to unchecked `Record<string, unknown>`.
 *
 * So: `AppConfig["Messages"]` is literal English (full ICU checking at call
 * sites), while translated catalogues are annotated with `Widen<>` (free
 * values, fixed shape). Both are needed; neither replaces the other.
 */
declare module "next-intl" {
  interface AppConfig {
    Messages: EnMessages;
    Locale: UiLocale;
  }
}

/**
 * Verified against next-intl 4.13.2: the `Messages` half of this augmentation
 * takes effect — `useTranslations("common")` rejects an unknown key at compile
 * time. The `Locale` half does **not** reach `getLocale()`, whose return type
 * resolves through `use-intl`'s own `AppConfig`, an interface that is only
 * re-exported (`export type { default as AppConfig }`) and so cannot be merged
 * into from any public module specifier.
 *
 * `Locale` is therefore declared here for intent and for the day next-intl
 * exports the interface properly, while call sites narrow with `isUiLocale()`.
 * `i18n/locale-boundary.ts` owns that narrowing, and its test fails loudly if a
 * future version starts honouring this, so the workaround gets removed rather
 * than quietly outliving its reason.
 */
