"use client";

import { cn } from "@/helpers/cn";

import { CompassQuizLauncher } from "../quiz/compass-quiz-launcher";

/**
 * The button that opens the Kompas sheet from a static surface.
 *
 * Split out so its hosts stay Server Components: the client island is pushed to
 * the leaf that actually needs state, rather than turning a whole page of areas
 * and topics into client-rendered markup.
 *
 * Every one of these opens the sheet directly. Nothing on the site routes to
 * `/kompas` and then asks for a second „Pokreni Kompas" click.
 */
export function CompassStartQuestionsButton({
  label = "Ipak odgovorite na pitanja",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <CompassQuizLauncher>
      {(open) => (
        <button
          type="button"
          onClick={open}
          className={cn(
            "bg-forest text-canvas hover:bg-forest-hover mt-4 inline-flex min-h-[46px] cursor-pointer items-center rounded-full px-5 text-[14px] font-semibold transition-colors",
            className,
          )}
        >
          {label}
        </button>
      )}
    </CompassQuizLauncher>
  );
}
