/**
 * The collapsed home for values the platform owns (D-062).
 *
 * Internal ids, axes and lock versions are real and stay reachable — a
 * platform admin sometimes needs them — but they are never the first thing a
 * therapist meets, and never a field they must fill to finish a task.
 */
export function TechnicalDetails({
  summary = "Tehnički detalji",
  children,
}: {
  summary?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="border-line rounded-tile bg-panel-canvas/40 mt-4 border px-4 py-3">
      <summary className="text-ink-55 cursor-pointer text-[12.5px] font-semibold">
        {summary}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
