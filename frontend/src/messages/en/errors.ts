/**
 * User-facing copy for backend error codes (D-077, TODO §5G rule 1: the backend
 * returns a code, the frontend picks the words).
 *
 * Shape lifted from `features/workspace/components/taxonomy-term-form/
 * taxonomy-error-copy.ts`, which the project already endorses (D-062): say what
 * is not finished, why it matters, and what to do next — with the technical
 * code available but tucked under "support detail". This is a promotion of a
 * working pattern into the catalogue, not a new invention.
 *
 * Keys are backend `ApiProblem.code` values. ICU arguments come from
 * `ApiProblem.params`; never put clinical, private or tenant data in them.
 */
export const errors = {
  generic: {
    message: "The request did not go through.",
    nextAction: "Check your connection and try again.",
  },
  network: {
    message: "Your change was not saved. Your text is still on screen.",
    nextAction: "Check your connection and try again.",
  },
  notFound: {
    message: "This item no longer exists.",
    nextAction: "Return to the list and refresh.",
  },
  forbidden: {
    message: "You do not have permission for this action.",
    nextAction: "Contact your organization administrator.",
  },
  // `unknownCode` is deliberately not a technical string: an unrecognised code
  // shows controlled copy in the organization's language while the original is
  // recorded for diagnostics. A user must never read a raw error code.
  unknownCode: {
    message: "Something went wrong on our side.",
    nextAction: "Try again, and tell us the support code if it repeats.",
  },
} as const;

export type EnErrors = typeof errors;
