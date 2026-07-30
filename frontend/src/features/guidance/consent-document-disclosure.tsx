"use client";

import { useState } from "react";

import { RichText } from "@/components/content/rich-text";
import { richDocText, type RichDoc } from "@/lib/content-governance/rich-doc";

/**
 * A public consent checkbox that lets the person actually read what they're
 * agreeing to, instead of only the fixed label sentence next to it (0.7 —
 * "RichDoc renderer ... u intake saglasnostima"). Fetches on first expand
 * from `/api/privacy/public-documents/{kind}`, a same-origin, unauthenticated
 * proxy — `lib/privacy/public-legal-document.ts` is `server-only` and cannot
 * be called from this client component directly.
 */

type Kind = "intake_data_processing_notice" | "intake_request_acknowledgement";

interface FetchedDocument {
  title: string;
  body: RichDoc;
}

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; document: FetchedDocument }
  | { status: "missing" }
  | { status: "error" };

export function ConsentDocumentDisclosure({
  kind,
  label,
}: {
  kind: Kind;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<LoadState>({ status: "idle" });

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next || state.status !== "idle") return;

    setState({ status: "loading" });
    try {
      const response = await fetch(`/api/privacy/public-documents/${kind}`, {
        cache: "no-store",
      });
      if (response.status === 404) {
        setState({ status: "missing" });
        return;
      }
      if (!response.ok) {
        setState({ status: "error" });
        return;
      }
      setState({
        status: "loaded",
        document: (await response.json()) as FetchedDocument,
      });
    } catch {
      setState({ status: "error" });
    }
  };

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => void toggle()}
        className="text-forest cursor-pointer text-[12.5px] font-semibold underline underline-offset-2"
      >
        {open ? "Sakrij tekst" : label}
      </button>
      {open ? (
        <div className="border-line-strong bg-panel-canvas/60 rounded-tile mt-2 max-h-[220px] overflow-y-auto border px-3.5 py-3 text-[13px] leading-[1.6]">
          {state.status === "loading" ? (
            <p className="text-ink-55">Učitavanje…</p>
          ) : null}
          {state.status === "missing" || state.status === "error" ? (
            <p className="text-ink-55">
              Tekst je u pripremi i još nije objavljen.
            </p>
          ) : null}
          {state.status === "loaded" ? (
            richDocText(state.document.body) ? (
              <RichText doc={state.document.body} />
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
