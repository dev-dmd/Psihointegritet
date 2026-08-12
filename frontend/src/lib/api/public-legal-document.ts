import { z } from "zod";

import type { RichDoc } from "@/lib/content-governance/rich-doc";
import { requestJson } from "@/lib/api/request-json";

export type PublicLegalDocumentKind =
  "intake_data_processing_notice" | "intake_request_acknowledgement";

const simpleMarkSchema = z.enum(["bold", "italic", "underline"]);
const linkMarkSchema = z.object({
  type: z.literal("link"),
  href: z.string(),
});
const markSchema = z.union([simpleMarkSchema, linkMarkSchema]);
const spanSchema = z.object({
  text: z.string(),
  marks: z.array(markSchema).default([]),
});
const headingBlockSchema = z.object({
  id: z.string(),
  type: z.literal("heading"),
  level: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  spans: z.array(spanSchema),
});
const paragraphBlockSchema = z.object({
  id: z.string(),
  type: z.literal("paragraph"),
  spans: z.array(spanSchema),
});
const listBlockSchema = z.object({
  id: z.string(),
  type: z.literal("list"),
  ordered: z.boolean(),
  items: z.array(
    z.object({
      id: z.string(),
      spans: z.array(spanSchema),
    }),
  ),
});
const quoteBlockSchema = z.object({
  id: z.string(),
  type: z.literal("quote"),
  spans: z.array(spanSchema),
});
const richDocSchema: z.ZodType<RichDoc> = z.object({
  schemaVersion: z.literal(1),
  blocks: z.array(
    z.discriminatedUnion("type", [
      headingBlockSchema,
      paragraphBlockSchema,
      listBlockSchema,
      quoteBlockSchema,
    ]),
  ),
});

const publicLegalDocumentSchema = z.object({
  title: z.string(),
  body: richDocSchema,
});

export type PublicLegalDocument = z.infer<typeof publicLegalDocumentSchema>;

export async function fetchPublicLegalDocument(
  kind: PublicLegalDocumentKind,
  signal?: AbortSignal,
): Promise<PublicLegalDocument> {
  return requestJson(
    `/api/privacy/public-documents/${kind}`,
    {
      method: "GET",
      cache: "no-store",
      ...(signal ? { signal } : {}),
    },
    publicLegalDocumentSchema,
  );
}
