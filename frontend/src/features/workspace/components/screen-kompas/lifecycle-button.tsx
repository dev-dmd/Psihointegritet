"use client";

import type { TaxonomyStatus } from "../../taxonomy-api";

/** The lifecycle button is byte-identical for terms and Intake links, so it
 * lives once. `busy` shows the pending label; `disabled` covers the K2.6 rule
 * that „Označi kao odobreno" stays closed until the required decisions exist. */
export function LifecycleButton({
  target,
  label,
  busy,
  disabled = false,
  onClick,
}: {
  target: TaxonomyStatus;
  label: string;
  busy: boolean;
  disabled?: boolean;
  onClick: (target: TaxonomyStatus) => void;
}) {
  return (
    <button
      type="button"
      disabled={busy || disabled}
      onClick={() => onClick(target)}
      className="border-line-strong text-ink-70 hover:border-coffee/40 disabled:text-ink-45 cursor-pointer rounded-full border bg-transparent px-3.5 py-2 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed"
    >
      {busy ? "Čuvanje…" : label}
    </button>
  );
}
