"use client";

// ---------------------------------------------------------------------------
// ReadinessChecklist — animated readiness checklist for Kompas overview
//
// Renders the "Spremnost za testiranje i objavu" heading immediately, then
// reveals each check item one-by-one with a staggered fade-up animation.
// Each item shows one of three states:
//   loading — warm-coloured spinning circle
//   ok      — green checkmark
//   pending — amber circle
// ---------------------------------------------------------------------------

export type ReadinessCheckStatus = "loading" | "ok" | "pending" | "error";

export interface ReadinessCheck {
  label: string;
  status: ReadinessCheckStatus;
  note?: string;
}

function CheckIcon({ status }: { status: ReadinessCheckStatus }) {
  if (status === "loading") {
    return (
      <span
        aria-label="Učitavanje"
        className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2"
        style={{
          borderColor: "rgba(209, 164, 140, 0.3)",
          borderTopColor: "var(--color-warm, #d1a48c)",
        }}
      />
    );
  }
  if (status === "ok") {
    return (
      <span aria-label="Spremno" className="text-badge-ok shrink-0 text-[15px] leading-none">
        ✓
      </span>
    );
  }
  if (status === "error") {
    return (
      <span aria-label="Greška" className="text-badge-danger shrink-0 text-[15px] leading-none">
        ✗
      </span>
    );
  }
  return (
    <span aria-label="Na čekanju" className="text-badge-amber shrink-0 text-[15px] leading-none">
      ○
    </span>
  );
}

export function ReadinessChecklist({ checks }: { checks: readonly ReadinessCheck[] }) {
  return (
    <div className="rounded-panel border-line bg-surface border px-6 py-5">
      <h2 className="text-forest font-serif text-[21px]">
        Spremnost za testiranje i objavu
      </h2>
      <ul className="mt-4 space-y-2">
        {checks.map((check, index) => (
          <li
            key={check.label}
            className="flex items-center gap-3 text-[13.5px]"
            style={{
              opacity: 0,
              animation: `fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both`,
              animationDelay: `${index * 400}ms`,
            }}
          >
            <CheckIcon status={check.status} />
            {check.label}
            {check.note ? (
              <span className="text-ink-45"> — {check.note}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
