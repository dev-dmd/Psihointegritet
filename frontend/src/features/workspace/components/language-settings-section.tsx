"use client";

import { useState } from "react";

import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  LOCALE_ENDONYMS,
  SUPPORTED_UI_LOCALES,
  type UiLocale,
} from "@/i18n/locales";

import {
  useOrganizationLocalesMutation,
  useOrganizationSettingsQuery,
} from "../hooks/use-organization-settings";

/**
 * Language and regional settings (D-077 §20).
 *
 * Two fields, not one, because they answer different questions: `ui_locale` is
 * the language the team works in, `default_content_locale` the language the
 * public site speaks. An organization whose staff work in English while
 * publishing for Serbian clients needs them to differ — so the linked toggle is
 * a convenience, on by default, not the model.
 *
 * Language names are **endonyms** and never translated: a picker that says
 * „Serbian" in English to someone who only reads Serbian defeats its purpose.
 */
export function LanguageSettingsSection() {
  const t = useTranslations("workspace");
  // Loading and saving states are shared chrome, not settings copy.
  const tc = useTranslations("common");
  const { data, isPending, isError } = useOrganizationSettingsQuery();

  /**
   * Only the *edits* are state; the saved values stay where they are, in the
   * query cache. Copying server state into `useState` through an effect would
   * mean two sources of truth and a cascading render — and after a save the
   * form would show the pre-save values until the effect caught up.
   */
  const [draft, setDraft] = useState<{
    uiLocale: UiLocale;
    contentLocale: UiLocale;
    linked: boolean;
  } | null>(null);

  const save = useOrganizationLocalesMutation({
    onSaved: () => {
      setDraft(null);
      toast.success(t("settings.saved"));
    },
    onFailed: (error) =>
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : t("settings.loadFailed"),
      ),
  });

  if (isError) {
    return <p className="text-danger text-sm">{t("settings.loadFailed")}</p>;
  }
  if (isPending || !data) {
    return <p className="text-coffee/60 text-sm">{tc("state.loading")}</p>;
  }

  const uiLocale = draft?.uiLocale ?? data.uiLocale;
  const contentLocale = draft?.contentLocale ?? data.defaultContentLocale;
  const linked = draft?.linked ?? data.uiLocale === data.defaultContentLocale;
  const contentChanged = contentLocale !== data.defaultContentLocale;

  return (
    <section className="rounded-card border-line bg-surface border p-6">
      <h2 className="text-forest font-serif text-[22px]">
        {t("settings.title")}
      </h2>
      <p className="text-coffee/70 mt-2 text-[14.5px]">{t("settings.intro")}</p>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label className="text-coffee/75 text-[14px] font-medium">
          {t("settings.systemLanguage")}
          <select
            value={uiLocale}
            onChange={(event) => {
              const next = event.target.value as UiLocale;
              setDraft({
                uiLocale: next,
                contentLocale: linked ? next : contentLocale,
                linked,
              });
            }}
            className="border-coffee/20 mt-2 block w-full rounded-xl border px-3 py-2 text-[15px]"
          >
            {SUPPORTED_UI_LOCALES.map((locale) => (
              <option key={locale} value={locale}>
                {LOCALE_ENDONYMS[locale]}
              </option>
            ))}
          </select>
          <span className="text-coffee/55 mt-1.5 block text-[13px]">
            {t("settings.systemLanguageHelp")}
          </span>
        </label>

        <label className="text-coffee/75 text-[14px] font-medium">
          {t("settings.contentLanguage")}
          <select
            value={contentLocale}
            disabled={linked}
            onChange={(event) =>
              setDraft({
                uiLocale,
                contentLocale: event.target.value as UiLocale,
                linked,
              })
            }
            className="border-coffee/20 mt-2 block w-full rounded-xl border px-3 py-2 text-[15px] disabled:opacity-60"
          >
            {SUPPORTED_UI_LOCALES.map((locale) => (
              <option key={locale} value={locale}>
                {LOCALE_ENDONYMS[locale]}
              </option>
            ))}
          </select>
          <span className="text-coffee/55 mt-1.5 block text-[13px]">
            {t("settings.contentLanguageHelp")}
          </span>
        </label>
      </div>

      <label className="text-coffee/75 mt-4 flex items-center gap-2 text-[14px]">
        <input
          type="checkbox"
          checked={linked}
          onChange={(event) => {
            const next = event.target.checked;
            setDraft({
              uiLocale,
              contentLocale: next ? uiLocale : contentLocale,
              linked: next,
            });
          }}
        />
        {t("settings.useSystemLanguage")}
      </label>

      <p className="bg-meadow/18 text-coffee/80 mt-5 rounded-xl p-4 text-[13.5px]">
        {t("settings.notice")}
      </p>

      {contentChanged ? (
        <p className="bg-warm/16 text-coffee/80 mt-3 rounded-xl p-4 text-[13.5px]">
          {t("settings.contentWarning")}
        </p>
      ) : null}

      <button
        type="button"
        disabled={save.isPending}
        onClick={() =>
          save.mutate({ uiLocale, defaultContentLocale: contentLocale })
        }
        className="bg-forest text-canvas hover:bg-forest-hover mt-5 inline-flex min-h-11 items-center rounded-full px-6 text-[14px] font-semibold disabled:opacity-60"
      >
        {save.isPending ? tc("state.saving") : t("settings.save")}
      </button>
    </section>
  );
}
