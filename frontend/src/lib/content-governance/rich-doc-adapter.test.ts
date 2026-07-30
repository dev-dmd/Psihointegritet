import { describe, expect, it } from "vitest";

import { richDocToTiptapDoc, tiptapDocToRichDoc } from "./rich-doc-adapter";
import type { RichDoc } from "./rich-doc";

describe("richDocToTiptapDoc → tiptapDocToRichDoc round-trip", () => {
  it("round-trips an empty document", () => {
    const doc: RichDoc = { schemaVersion: 1, blocks: [] };
    expect(tiptapDocToRichDoc(richDocToTiptapDoc(doc))).toEqual(doc);
  });

  it("round-trips a paragraph with every mark kind", () => {
    const doc: RichDoc = {
      schemaVersion: 1,
      blocks: [
        {
          id: "p1",
          type: "paragraph",
          spans: [
            { text: "Obično " },
            { text: "podebljano", marks: ["bold"] },
            { text: " i " },
            { text: "kurziv", marks: ["italic"] },
            { text: " i " },
            { text: "podvučeno", marks: ["underline"] },
            { text: " i " },
            {
              text: "link",
              marks: [{ type: "link", href: "https://psihointegritet.com" }],
            },
          ],
        },
      ],
    };
    expect(tiptapDocToRichDoc(richDocToTiptapDoc(doc))).toEqual(doc);
  });

  it("round-trips headings at every allowed level", () => {
    const doc: RichDoc = {
      schemaVersion: 1,
      blocks: [
        { id: "h2", type: "heading", level: 2, spans: [{ text: "H2" }] },
        { id: "h3", type: "heading", level: 3, spans: [{ text: "H3" }] },
        { id: "h4", type: "heading", level: 4, spans: [{ text: "H4" }] },
      ],
    };
    expect(tiptapDocToRichDoc(richDocToTiptapDoc(doc))).toEqual(doc);
  });

  it("round-trips an unordered list, preserving item ids", () => {
    const doc: RichDoc = {
      schemaVersion: 1,
      blocks: [
        {
          id: "list1",
          type: "list",
          ordered: false,
          items: [
            { id: "item1", spans: [{ text: "Prva stavka" }] },
            { id: "item2", spans: [{ text: "Druga stavka" }] },
          ],
        },
      ],
    };
    expect(tiptapDocToRichDoc(richDocToTiptapDoc(doc))).toEqual(doc);
  });

  it("round-trips an ordered list", () => {
    const doc: RichDoc = {
      schemaVersion: 1,
      blocks: [
        {
          id: "list1",
          type: "list",
          ordered: true,
          items: [{ id: "item1", spans: [{ text: "Korak jedan" }] }],
        },
      ],
    };
    const result = tiptapDocToRichDoc(richDocToTiptapDoc(doc));
    expect(result).toEqual(doc);
    expect(result.blocks[0]).toMatchObject({ ordered: true });
  });

  it("round-trips a quote block (blockquote wraps one paragraph internally, flattened back on the way out)", () => {
    const doc: RichDoc = {
      schemaVersion: 1,
      blocks: [{ id: "q1", type: "quote", spans: [{ text: "Citat teksta." }] }],
    };
    expect(tiptapDocToRichDoc(richDocToTiptapDoc(doc))).toEqual(doc);
  });

  it("round-trips a full document combining every block type", () => {
    const doc: RichDoc = {
      schemaVersion: 1,
      blocks: [
        { id: "h1", type: "heading", level: 2, spans: [{ text: "Naslov" }] },
        {
          id: "p1",
          type: "paragraph",
          spans: [
            { text: "Pasus sa " },
            {
              text: "linkom",
              marks: [
                { type: "link", href: "/usluge/individualna-psihoterapija" },
              ],
            },
            { text: "." },
          ],
        },
        {
          id: "list1",
          type: "list",
          ordered: false,
          items: [
            { id: "i1", spans: [{ text: "Stavka jedan" }] },
            { id: "i2", spans: [{ text: "Stavka dva" }] },
          ],
        },
        { id: "q1", type: "quote", spans: [{ text: "Citat." }] },
      ],
    };
    expect(tiptapDocToRichDoc(richDocToTiptapDoc(doc))).toEqual(doc);
  });

  it("skips an unknown node type on the way back, without throwing (forward-compat, ADR-017 §5)", () => {
    const tiptapDoc = richDocToTiptapDoc({
      schemaVersion: 1,
      blocks: [{ id: "p1", type: "paragraph", spans: [{ text: "Ostaje" }] }],
    });
    tiptapDoc.content = [
      { type: "horizontalRule" },
      ...(tiptapDoc.content ?? []),
    ];
    const result = tiptapDocToRichDoc(tiptapDoc);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0]).toMatchObject({ type: "paragraph" });
  });

  it("assigns a fresh id to a node missing one, rather than throwing", () => {
    const result = tiptapDocToRichDoc({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Bez id-ja" }] },
      ],
    });
    expect(result.blocks).toHaveLength(1);
    expect(typeof result.blocks[0]?.id).toBe("string");
    expect(result.blocks[0]?.id.length).toBeGreaterThan(0);
  });
});
