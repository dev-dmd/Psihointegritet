/**
 * Bidirectional `RichDoc` ↔ Tiptap JSON adapter (CG-C5, ADR-017 §10).
 *
 * The database stores `RichDoc`, never Tiptap's native document shape — the
 * format has to outlive the editor library, and the Python validator must
 * never need to understand ProseMirror's internal structure. This file is
 * the only place that translation happens.
 *
 * Two structural mismatches this adapter resolves:
 * - `RichDoc.QuoteBlock`/`ListItem` hold `spans` directly; ProseMirror's
 *   `blockquote`/`listItem` nodes require block content, so they wrap a
 *   single `paragraph` on the way out and get unwrapped on the way back.
 *   `rich-text-editor.tsx` restricts both nodes' content model to exactly
 *   one paragraph, so this mapping is always 1:1 — never ambiguous.
 * - Stable block ids (ADR-017 §2) live as a Tiptap node attribute (`id`),
 *   assigned by `@tiptap/extension-unique-id` — preserved across ordinary
 *   edits, regenerated only when a node is actually split/duplicated. This
 *   adapter just reads/writes that attribute; it never invents ids itself
 *   except as a defensive fallback for a node that somehow has none.
 */

import type { JSONContent } from "@tiptap/core";

import {
  createBlockId,
  type HeadingBlock,
  type ListBlock,
  type Mark,
  type ParagraphBlock,
  type QuoteBlock,
  type RichBlock,
  type RichDoc,
  type Span,
} from "./rich-doc";

export function richDocToTiptapDoc(doc: RichDoc): JSONContent {
  return { type: "doc", content: doc.blocks.map(blockToTiptap) };
}

function blockToTiptap(block: RichBlock): JSONContent {
  switch (block.type) {
    case "heading":
      return {
        type: "heading",
        attrs: { id: block.id, level: block.level },
        content: spansToTiptap(block.spans),
      };
    case "paragraph":
      return {
        type: "paragraph",
        attrs: { id: block.id },
        content: spansToTiptap(block.spans),
      };
    case "quote":
      return {
        type: "blockquote",
        attrs: { id: block.id },
        content: [{ type: "paragraph", content: spansToTiptap(block.spans) }],
      };
    case "list":
      return {
        type: block.ordered ? "orderedList" : "bulletList",
        attrs: { id: block.id },
        content: block.items.map((item) => ({
          type: "listItem",
          attrs: { id: item.id },
          content: [{ type: "paragraph", content: spansToTiptap(item.spans) }],
        })),
      };
  }
}

function spansToTiptap(spans: readonly Span[]): JSONContent[] {
  return spans
    .filter((span) => span.text.length > 0)
    .map((span) => ({
      type: "text",
      text: span.text,
      ...(span.marks && span.marks.length > 0
        ? { marks: span.marks.map(markToTiptap) }
        : {}),
    }));
}

function markToTiptap(mark: Mark): {
  type: string;
  attrs?: Record<string, unknown>;
} {
  if (typeof mark === "object") {
    return { type: "link", attrs: { href: mark.href } };
  }
  return { type: mark };
}

export function tiptapDocToRichDoc(doc: JSONContent): RichDoc {
  const blocks = (doc.content ?? [])
    .map(tiptapNodeToBlock)
    .filter((block): block is RichBlock => block !== null);
  return { schemaVersion: 1, blocks };
}

function tiptapNodeToBlock(node: JSONContent): RichBlock | null {
  const id =
    typeof node.attrs?.id === "string" ? node.attrs.id : createBlockId();

  if (node.type === "heading") {
    const level = node.attrs?.level;
    const headingBlock: HeadingBlock = {
      id,
      type: "heading",
      level: level === 3 || level === 4 ? level : 2,
      spans: tiptapContentToSpans(node.content),
    };
    return headingBlock;
  }

  if (node.type === "paragraph") {
    const paragraphBlock: ParagraphBlock = {
      id,
      type: "paragraph",
      spans: tiptapContentToSpans(node.content),
    };
    return paragraphBlock;
  }

  if (node.type === "blockquote") {
    // Content model is restricted to exactly one paragraph
    // (`rich-text-editor.tsx`); flatten defensively in case of drift.
    const quoteBlock: QuoteBlock = {
      id,
      type: "quote",
      spans: (node.content ?? []).flatMap((inner) =>
        tiptapContentToSpans(inner.content),
      ),
    };
    return quoteBlock;
  }

  if (node.type === "bulletList" || node.type === "orderedList") {
    const listBlock: ListBlock = {
      id,
      type: "list",
      ordered: node.type === "orderedList",
      items: (node.content ?? []).map((item) => ({
        id:
          typeof item.attrs?.id === "string" ? item.attrs.id : createBlockId(),
        spans: (item.content ?? []).flatMap((inner) =>
          tiptapContentToSpans(inner.content),
        ),
      })),
    };
    return listBlock;
  }

  // Forward-compatible with unknown node types, same policy as the renderer
  // and the backend normalizer (ADR-017 §5) — skip, never throw.
  return null;
}

function tiptapContentToSpans(content: JSONContent[] | undefined): Span[] {
  return (content ?? [])
    .filter((node) => node.type === "text" && node.text)
    .map((node) => ({
      text: node.text ?? "",
      ...(node.marks && node.marks.length > 0
        ? { marks: node.marks.map(tiptapMarkToRichMark) }
        : {}),
    }));
}

function tiptapMarkToRichMark(mark: {
  type: string;
  attrs?: Record<string, unknown>;
}): Mark {
  if (mark.type === "link") {
    const href = mark.attrs?.href;
    return { type: "link", href: typeof href === "string" ? href : "" };
  }
  return mark.type as Mark;
}
