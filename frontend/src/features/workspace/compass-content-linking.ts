import type { ApiContentDiscovery, ApiContentRevision } from "./content-api";
import type { TaxonomyTerm } from "./taxonomy-api";

/**
 * Why a CMS entry is, or is not, something Kompas can recommend.
 *
 * The rules are not invented here: they mirror `_eligible_candidates` in
 * `modules/content/compass_service.py` one for one. The panel used to say
 * nothing at all, so an author could fill in half the discovery metadata,
 * publish, and never learn why the entry stayed invisible. Duplicating the
 * predicate is the cost of telling them before they publish; the backend
 * remains the authority and this file must follow it, never lead it.
 *
 * Pure on purpose — no hooks, no fetching. The panel joins it with whatever
 * the registry query already loaded.
 */

/** One thing the author still has to do, phrased as the next action. */
export interface CompassContentRequirement {
  id:
    | "topicGroup"
    | "topics"
    | "topicParent"
    | "audiences"
    | "goals"
    | "journeyIntent"
    | "contentFormat"
    | "accessLevel";
  label: string;
}

export type CompassContentStage =
  | "not-linked"
  | "incomplete"
  | "draft"
  | "in-review"
  | "ready"
  | "published"
  | "archived";

export interface CompassContentLink {
  stage: CompassContentStage;
  stageLabel: string;
  missing: CompassContentRequirement[];
  /** True, relevant, and not fixable in this screen. */
  advisory: string | null;
}

export const COMPASS_STAGE_LABEL: Record<CompassContentStage, string> = {
  "not-linked": "Nije povezano",
  incomplete: "Nedostaju podaci",
  draft: "Radna verzija",
  "in-review": "Čeka pregled",
  ready: "Spremno za objavu",
  published: "Objavljeno",
  archived: "Arhivirano",
};

/**
 * Content types Kompas can render a recommendation card for.
 *
 * `article` is deliberately absent. Articles are governed content since
 * ADR-019, but both recommendation allowlists — `is_system_content_definition`
 * on the server and `findSystemContentDefinition` in `lib/compass` — still
 * exclude them. An article can be written and published today and will not be
 * recommended, which is exactly the kind of silence this screen exists to end.
 */
const RECOMMENDABLE_CONTENT_TYPES = new Set([
  "static_page",
  "service",
  "program",
  "company_plan",
  "package_offer",
]);

/** Said once, per reason, so neither case is explained with the other's words. */
const NOT_RECOMMENDABLE_ADVISORY: Record<string, string> = {
  article:
    "Članak se piše i objavljuje, ali ga Kompas još ne preporučuje. Javna rubrika i preporuka članaka stižu sa vertikalom članaka.",
  therapist:
    "Terapeute Kompas ne preporučuje — njih vodi Vođeni izbor. Ova stranica se uređuje u tabu „Sadržaj”.",
};

const UNKNOWN_TYPE_ADVISORY =
  "Kompas ne preporučuje ovu vrstu sadržaja, pa povezivanje ovde ništa ne menja.";

function isEmptyLink(discovery: ApiContentDiscovery): boolean {
  return (
    discovery.topicGroupTermId === null &&
    discovery.topicTermIds.length === 0 &&
    discovery.audienceTermIds.length === 0 &&
    discovery.contentGoalTermIds.length === 0 &&
    discovery.journeyIntentTermId === null &&
    discovery.contentFormatTermId === null &&
    discovery.accessLevelTermId === null
  );
}

function publicAccessTermId(terms: readonly TaxonomyTerm[]): string | null {
  return (
    terms.find(
      (term) => term.axis === "access_level" && term.stableId === "public",
    )?.termId ?? null
  );
}

/** Everything the entry still needs before Kompas would consider it. */
export function missingCompassRequirements(
  discovery: ApiContentDiscovery,
  terms: readonly TaxonomyTerm[],
): CompassContentRequirement[] {
  const missing: CompassContentRequirement[] = [];
  const byId = new Map(terms.map((term) => [term.termId, term]));

  const group = discovery.topicGroupTermId
    ? byId.get(discovery.topicGroupTermId)
    : undefined;
  if (!group || group.axis !== "topic_group") {
    missing.push({
      id: "topicGroup",
      label: "Izaberite jednu oblast kojoj ovaj sadržaj pripada.",
    });
  }

  const topics = discovery.topicTermIds
    .map((termId) => byId.get(termId))
    .filter((term): term is TaxonomyTerm => term?.axis === "topic");
  if (topics.length === 0) {
    missing.push({
      id: "topics",
      label:
        "Dodajte bar jednu temu — bez teme Kompas nema po čemu da ga nađe.",
    });
  } else if (
    group &&
    topics.some((topic) => topic.primaryParentTermId !== group.termId)
  ) {
    // The server compares the topic's parent to the chosen area. A topic from
    // another area silently drops the whole entry, so it is named here.
    const strays = topics
      .filter((topic) => topic.primaryParentTermId !== group.termId)
      .map((topic) => `„${topic.publicLabel}”`)
      .join(", ");
    missing.push({
      id: "topicParent",
      label: `${strays} ne pripada izabranoj oblasti „${group.publicLabel}”. Izaberite temu iz te oblasti ili promenite oblast.`,
    });
  }

  if (discovery.audienceTermIds.length === 0) {
    missing.push({
      id: "audiences",
      label: "Recite kome je namenjeno — bar jedna publika.",
    });
  }
  if (discovery.contentGoalTermIds.length === 0) {
    missing.push({
      id: "goals",
      label: "Recite šta čitalac dobija — bar jedan cilj sadržaja.",
    });
  }
  if (!discovery.journeyIntentTermId) {
    missing.push({
      id: "journeyIntent",
      label: "Izaberite gde ovaj sadržaj vodi korisnika.",
    });
  }
  if (!discovery.contentFormatTermId) {
    missing.push({
      id: "contentFormat",
      label: "Izaberite oblik sadržaja (članak, video, PDF…).",
    });
  }

  const publicAccess = publicAccessTermId(terms);
  if (!discovery.accessLevelTermId) {
    missing.push({
      id: "accessLevel",
      label: "Izaberite ko sme da vidi sadržaj.",
    });
  } else if (publicAccess && discovery.accessLevelTermId !== publicAccess) {
    missing.push({
      id: "accessLevel",
      label:
        "Kompas preporučuje samo javno dostupan sadržaj. Promenite pristup na „Javno” ili ostavite sadržaj van Kompasa.",
    });
  }

  return missing;
}

/** Where this entry stands on the way to being recommended. */
export function compassContentLink(
  entry: Pick<ApiContentRevision, "contentType" | "discovery" | "status">,
  terms: readonly TaxonomyTerm[],
): CompassContentLink {
  const advisory = RECOMMENDABLE_CONTENT_TYPES.has(entry.contentType)
    ? null
    : (NOT_RECOMMENDABLE_ADVISORY[entry.contentType] ?? UNKNOWN_TYPE_ADVISORY);

  const stageOf = (stage: CompassContentStage): CompassContentLink => ({
    stage,
    stageLabel: COMPASS_STAGE_LABEL[stage],
    missing: [],
    advisory,
  });

  if (isEmptyLink(entry.discovery)) return stageOf("not-linked");

  const missing = missingCompassRequirements(entry.discovery, terms);
  if (missing.length > 0) {
    return {
      stage: "incomplete",
      stageLabel: COMPASS_STAGE_LABEL.incomplete,
      missing,
      advisory,
    };
  }

  if (entry.status === "archived") return stageOf("archived");
  if (entry.status === "in_review") return stageOf("in-review");
  if (entry.status === "approved") return stageOf("ready");
  if (entry.status === "published") return stageOf("published");
  return stageOf("draft");
}
