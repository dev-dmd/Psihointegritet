/**
 * Strings shared by more than one surface. English is canonical (D-077).
 *
 * Keys are **semantic**, never the English sentence — `common.actions.save`,
 * not `common.Save`. A sentence-shaped key rots the moment the copy changes and
 * makes every locale file a search-and-replace hazard.
 *
 * What belongs here: system chrome that appears in several places. What does
 * not: anything a tenant authors (organization name, service names, biographies,
 * articles, legal text, client messages), which is content and is never
 * translated by the platform.
 */
export const common = {
  actions: {
    save: "Save",
    cancel: "Cancel",
    back: "Back",
    retry: "Try again",
    close: "Close",
    edit: "Edit",
    delete: "Delete",
    confirm: "Confirm",
  },
  /** Chrome shared by all three panels and the public header. */
  shell: {
    backToSite: "Main site",
    signOut: "Sign out",
    soon: "Soon",
  },
  state: {
    loading: "Loading…",
    empty: "Nothing here yet",
    saving: "Saving…",
    saved: "Saved",
  },
  language: {
    // The section heading in organization settings, not a language name —
    // language names are endonyms and live in `i18n/locales.ts`, untranslated.
    settingsTitle: "Language and regional settings",
    systemLanguage: "System language",
    contentLanguage: "Default language for new content",
    useSystemLanguageForContent: "Use the system language for new content",
    changeNotice:
      "This changes platform navigation, system messages and future system emails. It does not translate or modify existing content.",
  },
} as const;

export type EnCommon = typeof common;
