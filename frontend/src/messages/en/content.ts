/**
 * The Content workspace family (I18N-5).
 *
 * Screen chrome only — headings, tabs, states and the governance notes that
 * explain how the CMS overlay works. What an editor *writes* is content and is
 * never translated by the platform.
 */
export const content = {
  title: "Content",
  description:
    "System pages, services, therapists, programs, companies and packages. Choose an existing item and edit only the fields its structure defines.",
  loadFailed: "Content could not be loaded",
  loadFailedHelp:
    "The server cannot process the request right now. Try again. If it repeats, send support the error id: {id}.",
  requestFailed: "The request did not go through. Try again.",
  reloadHint: "Content cannot be loaded right now. Refresh the page.",
  systemNotice:
    "Protected system content. An item without a CMS revision uses the existing text from the code; editing starts from empty fields and saves only what you enter.",
  wrongTemplate: "Wrong template",
  counted: "{label} ({count})",
  fieldOverride: {
    statusLabel: "Content source for {field}",
    inherit: "Default content",
    custom: "Customized",
    hidden: "Hidden",
    inheritHelp: "The platform's default content is shown.",
    hiddenHelp: "This optional field is not shown publicly.",
  },
} as const;

export type EnContent = typeof content;
