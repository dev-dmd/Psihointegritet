"use client";

import { useState } from "react";

import { RichText } from "@/components/content/rich-text";
import { usePublicLegalDocument } from "@/features/guidance/hooks/use-public-legal-document";
import { richDocText } from "@/lib/content-governance/rich-doc";
import type { PublicLegalDocumentKind } from "@/lib/api/public-legal-document";

/**
 * Public consent disclosure. Network state belongs to a feature query hook;
 * this component only owns the disclosure's local open/closed UI state.
 */
export function ConsentDocumentDisclosure({
  kind,
  label,
}: {
  kind: PublicLegalDocumentKind;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const documentQuery = usePublicLegalDocument(kind, open);

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="text-forest cursor-pointer text-[12.5px] font-semibold underline underline-offset-2"
      >
        {open ? "Sakrij tekst" : label}
      </button>
      {open ? (
        <div className="border-line-strong bg-panel-canvas/60 rounded-tile mt-2 max-h-[220px] overflow-y-auto border px-3.5 py-3 text-[13px] leading-[1.6]">
          {documentQuery.isPending ? (
            <p className="text-ink-55">Učitavanje…</p>
          ) : null}
          {documentQuery.isError ? (
            <p className="text-ink-55">
              Tekst je u pripremi i još nije objavljen.
            </p>
          ) : null}
          {documentQuery.data ? (
            richDocText(documentQuery.data.body) ? (
              <RichText doc={documentQuery.data.body} />
            ) : (
              <p className="text-ink-55">
                Tekst je u pripremi i još nije objavljen.
              </p>
            )
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
