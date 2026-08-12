"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/helpers/cn";

import type {
  ArticleCompletionState,
  ArticleStepId,
} from "./article-completion";
import { stepParam } from "./article-completion";

/**
 * Actionable pre-submit checklist.
 *
 * Every incomplete item links directly to its step and, where possible, its
 * anchor so the author doesn't have to guess where a field lives. Blocking
 * items are listed first; advisory items follow a divider.
 *
 * §5H-4: this is displayed in step 5 (Pregled i slanje) and summarised in
 * the next-action card in earlier steps.
 */
export function ArticleChecklist({ state }: { state: ArticleCompletionState }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const navigate = (step: ArticleStepId, anchor?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const currentKorak = params.get("korak");
    const targetKorak = stepParam(step);
    let changed = false;
    if (targetKorak !== currentKorak) {
      params.set("korak", targetKorak);
      changed = true;
    }
    if (changed) {
      router.push(`?${params.toString()}`, { scroll: false });
    }
    setTimeout(() => {
      const id = anchor ? anchor : `compass-step-${step}`;
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  if (
    state.blockingTasks.length === 0 &&
    state.advisoryTasks.length === 0 &&
    state.canSubmitForReview
  ) {
    return (
      <div className="border-sage bg-sage/8 rounded-panel border px-6 py-5">
        <p className="text-forest font-serif text-[16px] font-semibold">
          ✓ Spremno za pregled
        </p>
        <p className="text-ink-70 mt-1.5 text-[13px] leading-[1.55]">
          Svi potrebni podaci su uneti. Možete poslati tekst na stručni pregled.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-panel border-line bg-surface border px-6 py-5">
      <h2 className="text-forest font-serif text-[16px] font-semibold">
        Spremnost za pregled
      </h2>

      {state.blockingTasks.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1.5">
          {state.blockingTasks.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => navigate(task.step, task.anchor)}
                className={cn(
                  "text-ink-70 hover:text-coffee rounded-tile flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] leading-[1.5] transition-colors",
                  "hover:bg-ink/5 focus-visible:ring-coffee cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none",
                )}
              >
                <span className="text-danger mt-0.5 shrink-0 text-[16px] leading-none">
                  ✗
                </span>
                <span>{task.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {state.advisoryTasks.length > 0 ? (
        <>
          {state.blockingTasks.length > 0 ? (
            <hr className="border-line my-3" />
          ) : null}
          <ul className="flex flex-col gap-1.5">
            {state.advisoryTasks.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => navigate(task.step, task.anchor)}
                  className={cn(
                    "text-ink-55 hover:text-ink-70 rounded-tile flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[12.5px] leading-[1.5] transition-colors",
                    "hover:bg-ink/5 focus-visible:ring-coffee cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none",
                  )}
                >
                  <span className="text-ink-45 mt-0.5 shrink-0 text-[14px] leading-none">
                    ◯
                  </span>
                  <span>{task.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {state.blockingTasks.length === 0 && state.advisoryTasks.length === 0 ? (
        <p className="text-ink-55 mt-2 text-[12.5px]">
          Proverite pregled pre slanja na stručni pregled.
        </p>
      ) : null}
    </div>
  );
}
