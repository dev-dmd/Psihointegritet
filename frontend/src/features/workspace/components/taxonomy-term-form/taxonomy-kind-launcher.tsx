"use client";

import { cn } from "@/helpers/cn";

import { AXIS_EDITOR_CONFIG, type ManagedTaxonomyAxis } from "./model";
import { TAXONOMY_KIND_COPY } from "./taxonomy-copy";

/**
 * "Šta želite da dodate?" — the first thing a therapist meets.
 *
 * It used to be "Izaberite upravljani registar" with four equal buttons named
 * after taxonomy axes. Two of those four (publike, ciljevi sadržaja) are set
 * once and rarely touched, and none of the four says what the thing *is* to a
 * visitor. So the launcher now offers the three choices someone actually
 * arrives with, each with an example, and demotes the other two registries to
 * an advanced section rather than removing them.
 *
 * "Sadržaj" is deliberately not a taxonomy kind: choosing it hands over to the
 * Kompas content workspace instead of creating a term nobody asked for.
 */
export function TaxonomyKindLauncher({
  disabled,
  onSelectAxis,
  onSelectContent,
}: {
  disabled?: boolean;
  onSelectAxis: (axis: ManagedTaxonomyAxis) => void;
  onSelectContent?: () => void;
}) {
  return (
    <div>
      <h3 className="text-forest font-serif text-[19px]">
        Šta želite da dodate?
      </h3>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <KindCard
          title={TAXONOMY_KIND_COPY.topic_group.title}
          description={TAXONOMY_KIND_COPY.topic_group.description}
          example={TAXONOMY_KIND_COPY.topic_group.example}
          disabled={Boolean(disabled)}
          onClick={() => onSelectAxis("topic_group")}
        />
        <KindCard
          title={TAXONOMY_KIND_COPY.topic.title}
          description={TAXONOMY_KIND_COPY.topic.description}
          example={TAXONOMY_KIND_COPY.topic.example}
          disabled={Boolean(disabled)}
          onClick={() => onSelectAxis("topic")}
        />
        <KindCard
          title={TAXONOMY_KIND_COPY.content.title}
          description={TAXONOMY_KIND_COPY.content.description}
          example={TAXONOMY_KIND_COPY.content.example}
          disabled={Boolean(disabled) || !onSelectContent}
          onClick={() => onSelectContent?.()}
        />
      </div>

      <details className="border-line rounded-tile bg-panel-canvas/40 mt-4 border px-4 py-3">
        <summary className="text-ink-55 cursor-pointer text-[12.5px] font-semibold">
          Napredne vrednosti registra
        </summary>
        <p className="text-ink-55 mt-2 text-[12px] leading-[1.5]">
          Publike i ciljevi sadržaja se postavljaju jednom i retko menjaju.
          Koriste se pri povezivanju sadržaja, ne pri svakodnevnom unosu.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["audience", "content_goal"] as const).map((axis) => (
            <button
              key={axis}
              type="button"
              disabled={disabled}
              onClick={() => onSelectAxis(axis)}
              className="border-line-strong hover:border-coffee/35 min-h-11 cursor-pointer rounded-full border bg-transparent px-4 text-[12.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-55"
            >
              {AXIS_EDITOR_CONFIG[axis].newLabel}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}

function KindCard({
  title,
  description,
  example,
  disabled,
  onClick,
}: {
  title: string;
  description: string;
  example: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-tile border-line-strong hover:border-coffee/35 cursor-pointer border bg-transparent px-4 py-4 text-left",
        "disabled:cursor-not-allowed disabled:opacity-55",
      )}
    >
      <span className="text-coffee block text-[14.5px] font-semibold">
        {title}
      </span>
      <span className="text-ink-55 mt-1.5 block text-[12.5px] leading-[1.5]">
        {description}
      </span>
      <span className="text-ink-45 mt-2 block text-[12px] italic">
        Primer: „{example}”
      </span>
    </button>
  );
}
