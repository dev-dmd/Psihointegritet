/**
 * Brand theming for Clerk's hosted UI (the sign-in / sign-up modal). Passed
 * once to `<ClerkProvider>`; Clerk's `variables` API takes concrete values (it
 * is not Tailwind), so the brand primary is set literally to `--color-forest`
 * while the font reuses the app's Instrument Sans CSS variable.
 *
 * Kept untyped on purpose: `@clerk/types` is not a direct dependency, so the
 * shape is validated where it is consumed — against `<ClerkProvider>`'s
 * `appearance` prop.
 */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#2e3b2e",
    borderRadius: "18px",
    fontFamily: "var(--font-instrument-sans), system-ui, sans-serif",
  },
  elements: {
    // Clerk's backdrop uses `align-items: flex-start`, which parks the modal at
    // header height. Center it vertically on every viewport; `safe center` keeps
    // the top reachable (falls back to flex-start) if the card ever exceeds the
    // viewport height. Inline styles from `elements` outrank Clerk's own classes.
    modalBackdrop: {
      alignItems: "safe center",
    },
    // Clerk rounds all four corners of the white card, leaving a stepped gap
    // above the "Secured by Clerk" footer. Square the bottom corners so the form
    // area meets the footer flush.
    card: {
      borderBottomLeftRadius: "0px",
      borderBottomRightRadius: "0px",
    },
  },
};
