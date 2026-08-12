"use client";

import { useState } from "react";

import type { ApiContentRevision } from "../../content-api";

/**
 * What an author may do with the text as a whole, as opposed to its content.
 *
 * Only the moves that are legal from the current status are offered — the
 * server's state machine (`shared/domain/publication.py`) is the authority and
 * a button that always 409s is worse than no button. Sending for review is
 * deliberately absent here: in §5H-4 it becomes one action for the whole
 * editorial package (article + any new area and topic), not a lone transition.
 *
 * Confirmation is inline rather than `ConfirmModal`, which is the superadmin
 * audit gate and demands a written reason. Deleting your own unsent draft is
 * not that kind of act, and asking for a justification would teach authors to
 * type anything to get past a dialog.
 */
export function KompasContentActions({
  entry,
  onTransition,
  onDelete,
  isBusy,
}: {
  entry: ApiContentRevision;
  onTransition: (target: ApiContentRevision["status"]) => void;
  onDelete: () => void;
  isBusy: boolean;
}) {
  const [confirming, setConfirming] = useState<"delete" | "archive" | null>(
    null,
  );

  const canReopen = entry.status === "approved" || entry.status === "archived";
  const canArchive = entry.status === "published";
  const canDelete = entry.status === "draft";

  const button =
    "min-h-11 cursor-pointer rounded-full border px-4 text-[12.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-60";

  if (confirming !== null) {
    const isDelete = confirming === "delete";
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-ink-70 text-[12.5px] leading-[1.45]">
          {isDelete
            ? "Radna verzija se briše i ne može se vratiti."
            : "Tekst prestaje da bude vidljiv posetiocima i Kompas ga više ne preporučuje. Sadržaj ostaje sačuvan."}
        </p>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            setConfirming(null);
            if (isDelete) onDelete();
            else onTransition("archived");
          }}
          className={`${button} ${
            isDelete
              ? "border-danger bg-danger text-panel-canvas"
              : "border-coffee bg-coffee text-panel-canvas"
          }`}
        >
          {isDelete ? "Da, obriši" : "Da, arhiviraj"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(null)}
          className={`${button} border-line-strong text-ink-70`}
        >
          Odustani
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canReopen ? (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onTransition("draft")}
          className={`${button} border-coffee text-coffee hover:bg-coffee/8`}
        >
          Napravi novu radnu verziju
        </button>
      ) : null}

      {canArchive ? (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => setConfirming("archive")}
          className={`${button} border-line-strong text-ink-70`}
        >
          Ukloni sa sajta
        </button>
      ) : null}

      {canDelete ? (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => setConfirming("delete")}
          className={`${button} border-danger/50 text-danger hover:bg-danger/8`}
        >
          Obriši radnu verziju
        </button>
      ) : null}
    </div>
  );
}
