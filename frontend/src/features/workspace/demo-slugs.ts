/**
 * Therapist slugs the demo data points at.
 *
 * Their own module because both the Serbian and the English fallback need them
 * and neither may import `./data` — that is the file assembling them, so the
 * import would close a cycle. They are identity, not copy: the same three
 * strings appear in every locale, matching the central content registry.
 */
export const MARIA = "maria-bullock";
export const ELSA = "elsa-browers";
export const JOHN = "john-francis";
