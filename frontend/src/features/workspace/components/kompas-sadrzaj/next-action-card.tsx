"use client";

import { useRouter, useSearchParams } from "next/navigation";

import type {
  ArticleCompletionState,
  ArticleStepId,
} from "./article-completion";
import { stepParam } from "./article-completion";

/**
 * One dominant recommendation above the fold — what the author should do next.
 *
 * §5H calls it „Sledeći korak". It tells the author exactly what is left
 * and offers a single clear button that navigates to the correct section.
 */
export function NextActionCard({ state }: { state: ArticleCompletionState }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (!state.nextAction) return null;

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

  return (
    <div className="border-forest/25 bg-forest/5 rounded-panel border px-6 py-5">
      <h2 className="text-forest font-serif text-[16px] font-semibold">
        Sledeći korak
      </h2>
      <p className="text-ink-70 mt-2 max-w-prose text-[13px] leading-[1.6]">
        {state.nextAction.description}
      </p>
      <button
        type="button"
        onClick={() =>
          navigate(state.nextAction!.step, state.nextAction!.anchor)
        }
        className="border-forest bg-forest text-panel-canvas focus-visible:ring-coffee mt-3 inline-flex min-h-11 cursor-pointer items-center rounded-full border px-5 text-[12.5px] font-semibold transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
      >
        {state.nextAction.label}
      </button>
    </div>
  );
}
