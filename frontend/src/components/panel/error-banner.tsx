"use client";

import type { PanelError } from "@/features/workspace/panel-errors";

interface ErrorBannerProps {
  errors: PanelError[];
  /** Dismiss one error; omit to render the banner read-only. */
  onDismiss?: (id: string) => void;
}

/**
 * Tab-level error banner: the name and description of what failed on this
 * screen, plus the specifics. Renders nothing when the tab is clean.
 */
export function ErrorBanner({ errors, onDismiss }: ErrorBannerProps) {
  if (errors.length === 0) return null;

  return (
    <div className="mb-5 flex flex-col gap-3" role="alert" aria-live="polite">
      {errors.map((error) => (
        <div
          key={error.id}
          className="border-danger/45 bg-danger/8 rounded-panel border px-5 py-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-danger mb-1 text-[11px] font-semibold tracking-[0.14em] uppercase">
                Greška
              </div>
              <p className="text-coffee text-[15px] font-semibold">
                {error.title}
              </p>
              <p className="text-ink-70 mt-1 text-[13.5px] leading-[1.5]">
                {error.description}
              </p>
              {error.details.length > 0 ? (
                <ul className="text-ink-70 mt-2.5 flex list-disc flex-col gap-1 pl-5 text-[13px] leading-[1.5]">
                  {error.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            {onDismiss ? (
              <button
                type="button"
                onClick={() => onDismiss(error.id)}
                aria-label={`Ukloni grešku: ${error.title}`}
                className="text-ink-55 hover:text-coffee shrink-0 cursor-pointer rounded-full border-0 bg-transparent px-2 py-1 text-lg leading-none transition-colors"
              >
                ×
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
