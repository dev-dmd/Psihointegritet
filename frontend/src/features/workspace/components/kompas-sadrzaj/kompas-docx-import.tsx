"use client";

import { useRef, useState } from "react";

import type { RichDoc } from "@/lib/content-governance/rich-doc";
import { useUserSafeError } from "@/lib/errors/use-user-safe-error";

import { useArticleImportMutation } from "../../hooks/use-article-import";

/**
 * „Uvezi Word dokument" for the article body.
 *
 * Same conversion the legal registry has used since ADR-017 — same endpoint
 * family, same limits, same findings — pointed at a RichDoc field instead of a
 * document. The import is a **proposal**: the text lands in the editor and
 * reaches the server only when the author saves. Existing text is never
 * replaced without asking, because an accidental import is otherwise
 * unrecoverable in a screen with no undo.
 */
export function KompasDocxImport({
  hasExistingText,
  onImported,
}: {
  hasExistingText: boolean;
  onImported: (body: RichDoc) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const safeError = useUserSafeError();
  const [findings, setFindings] = useState<string[]>([]);
  const [pendingBody, setPendingBody] = useState<RichDoc | null>(null);
  const [error, setError] = useState<string | null>(null);

  const importDocx = useArticleImportMutation({
    onConverted: (result) => {
      setError(null);
      setFindings(result.findings.map((finding) => finding.message));
      if (hasExistingText) {
        setPendingBody(result.body);
        return;
      }
      onImported(result.body);
    },
    onFailed: (cause) => {
      setPendingBody(null);
      setError(safeError.text(cause, "content", "import"));
    },
  });

  return (
    <div className="bg-meadow/30 border-line-strong rounded-tile mb-6 border px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-70 text-[12.5px] leading-[1.5]">
          Imate tekst u Word dokumentu? Uvezite ga umesto ručnog prekucavanja.
        </p>
        <button
          type="button"
          disabled={importDocx.isPending}
          onClick={() => inputRef.current?.click()}
          className="border-coffee text-coffee hover:bg-coffee/8 min-h-11 cursor-pointer rounded-full border px-4 text-[12.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {importDocx.isPending ? "Uvoz u toku…" : "Uvezi Word dokument"}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".docx"
        className="sr-only"
        aria-label="Word dokument sa tekstom članka"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Reset first, so choosing the same file twice still fires a change.
          event.target.value = "";
          if (file) importDocx.mutate(file);
        }}
      />

      {error ? (
        <p className="text-danger mt-2 text-[12.5px] leading-[1.45]">{error}</p>
      ) : null}

      {pendingBody ? (
        <div className="border-badge-amber/40 bg-badge-amber-bg rounded-tile mt-3 border px-4 py-3">
          <p className="text-coffee text-[12.5px] font-semibold">
            Ovde već postoji tekst.
          </p>
          <p className="text-ink-70 mt-1 text-[12.5px] leading-[1.5]">
            Uvezeni dokument će zameniti ono što je sada napisano.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onImported(pendingBody);
                setPendingBody(null);
              }}
              className="border-coffee bg-coffee text-panel-canvas min-h-11 cursor-pointer rounded-full border px-4 text-[12.5px] font-semibold"
            >
              Zameni tekst
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingBody(null);
                setFindings([]);
              }}
              className="border-line-strong text-ink-70 min-h-11 cursor-pointer rounded-full border px-4 text-[12.5px] font-semibold"
            >
              Zadrži postojeći
            </button>
          </div>
        </div>
      ) : null}

      {findings.length > 0 && !pendingBody ? (
        <div className="mt-2">
          <p className="text-ink-70 text-[12px] font-semibold">
            Šta je izmenjeno pri uvozu:
          </p>
          <ul className="text-ink-55 mt-1 list-disc space-y-0.5 pl-5 text-[12px] leading-[1.45]">
            {findings.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
