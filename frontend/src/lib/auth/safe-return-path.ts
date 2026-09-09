/**
 * Where sign-in may send somebody afterwards.
 *
 * `redirect_url` arrives in the query string, so it is attacker-controlled: a
 * link to `/prijava?redirect_url=https://evil.example` would otherwise turn our
 * own sign-in page into a credible-looking way to hand someone off to a
 * phishing site, complete with a real sign-in first.
 *
 * Only a same-site absolute path survives. The checks are stated separately
 * rather than crammed into one regular expression, because each one closes a
 * different trick and a reader has to be able to see all of them:
 *
 * - it must start with `/` — no absolute URL, no scheme;
 * - not `//host`, a protocol-relative URL that browsers treat as absolute,
 *   which is the classic way past a naive "starts with /" check;
 * - no backslashes at all, which some parsers fold into `/`;
 * - no control characters, so a newline cannot smuggle a header.
 *
 * Anything else falls back to the caller's default rather than raising: a
 * malformed return path is not worth failing a sign-in over.
 */
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

export function safeReturnPath(
  candidate: string | string[] | undefined,
  fallback: string,
): string {
  if (typeof candidate !== "string" || candidate.length === 0) return fallback;
  if (!candidate.startsWith("/")) return fallback;
  if (candidate.startsWith("//")) return fallback;
  if (candidate.includes("\\")) return fallback;
  if (CONTROL_CHARACTERS.test(candidate)) return fallback;
  return candidate;
}
