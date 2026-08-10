import type { SlotOverride } from "@/lib/content-governance/slot-schema";

import type { ApiContentRevision } from "./content-api";

/**
 * Reading an article revision the way its own screen needs it (D-063).
 *
 * The Kompas authoring surface asks different questions than the six-type CMS
 * screen: what is this text called, who signs it, and what is still missing
 * before it can be sent for review. None of that is answerable from `seo` —
 * an article's real title lives in `hero.title`, its author in `byline.author`
 * — so the reads are collected here rather than repeated in each component.
 *
 * Pure: no hooks, no fetching, no React.
 */

function slot(
  entry: Pick<ApiContentRevision, "slotData">,
  name: string,
): SlotOverride | null {
  const value = entry.slotData[name];
  if (typeof value !== "object" || value === null) return null;
  return value as SlotOverride;
}

/** A field only counts when the slot is actually authored, not inherited. */
function overriddenField(
  entry: Pick<ApiContentRevision, "slotData">,
  slotName: string,
  fieldName: string,
): unknown {
  const override = slot(entry, slotName);
  if (!override || override.mode !== "override") return undefined;
  return override.fields?.[fieldName];
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** The article's own title, or the fallbacks that keep a row readable. */
export function articleTitle(
  entry: Pick<ApiContentRevision, "slotData" | "seo" | "slug">,
): string {
  const hero = text(overriddenField(entry, "hero", "title"));
  if (hero.length > 0) return hero;
  const seo = text(entry.seo?.title);
  if (seo.length > 0) return seo;
  // A brand-new article has neither yet; the address is the only honest label.
  return entry.slug;
}

/** Public byline as stored — a CTA pointing at a therapist entity. */
export function articleAuthorTargetId(
  entry: Pick<ApiContentRevision, "slotData">,
): string | null {
  const author = overriddenField(entry, "byline", "author");
  if (typeof author !== "object" || author === null) return null;
  const targetId = text((author as { targetId?: unknown }).targetId);
  return targetId.length > 0 ? targetId : null;
}

/** `therapist:john-francis` → `john-francis`. */
export function therapistSlugFromTargetId(
  targetId: string | null,
): string | null {
  if (!targetId) return null;
  const [prefix, ...rest] = targetId.split(":");
  if (prefix !== "therapist" || rest.length === 0) return null;
  const slug = rest.join(":").trim();
  return slug.length > 0 ? slug : null;
}

/**
 * Where the article will live once `/znanje` exists (ADR-019 §3).
 *
 * Returned as a string rather than a `Route`: the public page is built in
 * §5H-4, so this is a label today and a link later. Callers must not pass it
 * to `next/link` before that route exists.
 */
export function articlePublicPath(
  entry: Pick<ApiContentRevision, "slug">,
): string {
  return `/znanje/${entry.slug}`;
}

export type ArticleStepId = "what" | "where" | "write" | "kompas";

export interface ArticleStepState {
  id: ArticleStepId;
  label: string;
  done: boolean;
  /** What the author still has to do here, when it is not done. */
  missing: string | null;
}

/**
 * How far the article has got, in the author's terms.
 *
 * Deliberately advisory: it mirrors the steps of the content-first flow so a
 * returning author can see where they stopped. The authority on whether the
 * article may be sent for review stays with the server's Content Health.
 */
export function articleSteps(
  entry: Pick<ApiContentRevision, "slotData" | "seo" | "slug" | "discovery">,
): ArticleStepState[] {
  const hasTitle = text(overriddenField(entry, "hero", "title")).length > 0;
  const hasAuthor = articleAuthorTargetId(entry) !== null;
  const body = overriddenField(entry, "body_intro", "body");
  const hasBody =
    typeof body === "object" &&
    body !== null &&
    Array.isArray((body as { blocks?: unknown }).blocks) &&
    ((body as { blocks: unknown[] }).blocks.length ?? 0) > 0;

  const { discovery } = entry;
  const hasPlace =
    discovery.topicGroupTermId !== null && discovery.topicTermIds.length > 0;
  const hasKompasAnswers =
    discovery.audienceTermIds.length > 0 &&
    discovery.contentGoalTermIds.length > 0 &&
    discovery.journeyIntentTermId !== null;

  return [
    {
      id: "what",
      label: "Naslov i autor",
      done: hasTitle && hasAuthor,
      missing: !hasTitle
        ? "Unesite naslov članka."
        : !hasAuthor
          ? "Izaberite ko javno potpisuje tekst."
          : null,
    },
    {
      id: "where",
      label: "Oblast i tema",
      done: hasPlace,
      missing: hasPlace
        ? null
        : "Izaberite oblast i bar jednu temu kojoj tekst pripada.",
    },
    {
      id: "write",
      label: "Tekst",
      done: hasBody,
      missing: hasBody ? null : "Napišite ili uvezite tekst članka.",
    },
    {
      id: "kompas",
      label: "Kako Kompas koristi tekst",
      done: hasKompasAnswers,
      missing: hasKompasAnswers
        ? null
        : "Odgovorite kome je namenjen, šta čitalac dobija i gde ga vodi.",
    },
  ];
}
