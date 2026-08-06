import { reservedArticleSlugs } from "./reserved-article-slugs";

/**
 * The address an article will live at, formed from its title.
 *
 * D-062: the author names the article; the platform forms the slug. The server
 * validates the same three things again (`require_content_identity`), so this
 * file exists to say *why* a title will not do before the request is sent —
 * `TAX-…`-style codes and a raw 422 are not an answer an author can act on.
 *
 * Mirrors `CONTENT_SLUG_PATTERN` in `modules/content/identity.py`.
 */

const CONTENT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Backend column limit for `content_entries.slug`. */
const SLUG_MAX_LENGTH = 160;

export function suggestArticleSlug(title: string): string {
  return title
    .trim()
    .toLocaleLowerCase("sr-Latn")
    .replaceAll("đ", "dj")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");
}

/**
 * Why this title cannot become an article address, in the author's words.
 * `null` means it can.
 */
export function articleSlugIssue(title: string): string | null {
  const trimmed = title.trim();
  if (trimmed.length === 0) return "Unesite naslov članka.";

  const slug = suggestArticleSlug(title);
  if (slug.length === 0) {
    // Cyrillic, punctuation only, emoji — nothing survives the transformation.
    return "Iz ovog naslova ne može da se napravi adresa. Dodajte bar jednu reč latinicom ili broj.";
  }
  if (!CONTENT_SLUG_PATTERN.test(slug)) {
    return "Iz ovog naslova ne može da se napravi ispravna adresa. Pokušajte jednostavniji naslov.";
  }
  if (reservedArticleSlugs.has(slug)) {
    return `Adresa „${slug}” je rezervisana za buduću stranicu rubrike Znanje. Izaberite drugačiji naslov.`;
  }
  return null;
}

/** Whether a slug is already taken inside this tenant, before the server says so. */
export function articleSlugTaken(
  slug: string,
  existing: readonly { contentType: string; slug: string }[],
): boolean {
  return existing.some(
    (entry) => entry.contentType === "article" && entry.slug === slug,
  );
}
