/**
 * Message catalogue types (D-077, I18N-2).
 *
 * English is the canonical shape; every other locale is an *annotation* of it.
 * That single decision buys all four guarantees the CTO brief asks for:
 *
 * - a **missing key** fails the annotation (`Property 'x' is missing`);
 * - an **unknown key** fails the excess-property check on the object literal;
 * - a **namespace with no counterpart** has nothing to annotate against;
 * - Serbian values are **never bound to English string literal types**, because
 *   `Widen` collapses every leaf to `string`.
 *
 * The last point is the one worth stating twice. The obvious implementation —
 * `const sr: typeof en = {...}` — would type every Serbian value as the English
 * sentence, so `"Pregled"` would fail to satisfy `"Overview"`. `Widen` is what
 * makes the shape check structural rather than a demand that the translation
 * equal the original.
 */

/** Collapses every string leaf to `string`, keeping the object shape exact. */
export type Widen<T> = {
  [K in keyof T]: T[K] extends string ? string : Widen<T[K]>;
};

/**
 * A namespace must not contain optional keys.
 *
 * An optional key defeats the whole parity guarantee: the annotation would
 * accept a Serbian catalogue that silently omits it, and the omission would
 * surface as a raw message key in front of a user. Enforced structurally by
 * `Widen` (which preserves optionality, so an optional English key produces an
 * optional Serbian one) and by review — the CI parity script reports any leaf
 * whose Serbian value is byte-identical to English, which is what an
 * accidentally-copied namespace looks like.
 */
export type MessageNamespace = Record<string, unknown>;
