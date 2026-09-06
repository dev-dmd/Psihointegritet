/** Controlled user-facing error presentation. Backend prose and identifiers
 * are deliberately absent; stable codes select entries in this catalogue. */
export const errors = {
  surfaces: {
    generic: {
      request: "The request was not completed.",
    },
    content: {
      load: "Content could not be loaded.",
      change: "The content change was not completed.",
      import: "The document was not imported into the content editor.",
      publish: "The content was not published.",
    },
    legal: {
      load: "Documents could not be loaded.",
      change: "The document change was not completed.",
      import: "The Word document was not imported.",
      publish: "The document was not published.",
    },
    taxonomy: {
      load: "The Compass registry could not be loaded.",
      change: "The Compass registry change was not completed.",
      publish: "The registry item was not published.",
    },
    research: {
      load: "Research results could not be loaded.",
    },
    compass: {
      load: "Compass could not be loaded.",
      change: "The Compass change was not completed.",
      publish: "The Compass flow was not published.",
    },
    diagnostics: {
      load: "Diagnostics could not be loaded.",
      run: "The diagnostic check was not completed.",
    },
    organization: {
      load: "Organization settings could not be loaded.",
      change: "The language settings were not saved.",
    },
    booking: {
      submit: "The appointment request was not sent.",
    },
  },
  actions: {
    network: "Check your connection and try again.",
    unauthorized: "Refresh the page, sign in again, and retry.",
    forbidden: "Ask your organization administrator for access.",
    notFound: "Return to the list and refresh it.",
    conflict: "Refresh the item, review the latest changes, and retry.",
    validation: "Check the marked fields and correct the information.",
    tooLarge: "Choose a smaller file and try again.",
    rateLimited: "Wait a moment and try again.",
    unavailable: "Wait a few minutes and try again.",
    server: "Try again in a few minutes.",
    generic: "Try again.",
  },
  fieldErrors: {
    missing: "This field is required.",
    intParsing: "Enter a whole number.",
    floatParsing: "Enter a number.",
    boolParsing: "Choose yes or no.",
    uuidParsing: "Choose an existing item from the list.",
    stringTooShort: "Enter a longer value.",
    stringTooLong: "Shorten this value.",
    valueError: "Check this value.",
    fallback: "Check this field.",
  },
  codeOverrides: {
    fileTypeInvalid: {
      message: "The selected file is not a Word .docx document.",
      nextAction: "Save it as .docx and try again.",
    },
    taxonomyStableIdConflict: {
      message:
        "An item with this name or identifier already exists in the registry.",
      nextAction: "Open the existing item or choose a distinct name.",
    },
    taxonomyInvalidId: {
      message: "This registry identifier cannot be used.",
      nextAction: "Use lowercase letters, numbers, and hyphens.",
    },
    taxonomySystemLocked: {
      message: "This system value cannot be changed.",
      nextAction: "Create a separate tenant item instead.",
    },
    taxonomyOptimisticLock: {
      message: "Someone else changed this registry item.",
      nextAction: "Refresh the item, review the latest version, and retry.",
    },
    compassOptimisticLock: {
      message: "Someone else changed this Compass flow.",
      nextAction: "Refresh the flow, review the latest version, and retry.",
    },
    organizationOperatorReasonRequired: {
      message: "The language settings were not saved.",
      nextAction: "Add a reason for the operator change and try again.",
    },
    bookingConflict: {
      message: "The appointment request conflicts with a newer change.",
      nextAction: "Refresh the available options and choose again.",
    },
    bookingSlotConflict: {
      message: "That appointment time is no longer available.",
      nextAction: "Choose another available time.",
    },
    diagnosticNotFound: {
      message: "This diagnostic check is no longer available.",
      nextAction: "Return to the diagnostics list and refresh it.",
    },
  },
} as const;

export type EnErrors = typeof errors;
