/**
 * `/znanje` slugs an article may not take (ADR-019 §3).
 *
 * The sibling paths a future knowledge surface would claim — a listing, a
 * search page, a per-category or per-author index. An article holding one of
 * them would win the route and hide that page the day it ships, which is the
 * kind of collision nobody traces back to a slug typed months earlier.
 *
 * Mirrors `contracts/fixtures/reserved-article-slugs.v1.json` and the backend
 * `RESERVED_ARTICLE_SLUGS`; the editor rejects these before the request leaves
 * the panel, and the server rejects them again.
 */
export const RESERVED_ARTICLE_SLUGS = [
  "arhiva",
  "autori",
  "index",
  "kategorije",
  "pretraga",
] as const;

export const reservedArticleSlugs = new Set<string>(RESERVED_ARTICLE_SLUGS);
