/** Shared TanStack Query key for the content entries list — one constant so
 * `screen-sadrzaj.tsx`, `content-entry-list.tsx` and
 * `content-revision-editor.tsx` never drift into mismatched cache keys. */
export const CONTENT_ENTRIES_QUERY_KEY = ["content-entries"] as const;
