import type { ApiContentFinding, ApiContentRevision } from "../../content-api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The five steps, in the natural authoring order (D-063). */
export type ArticleStepId =
  | "basics" // 1. Osnovni podaci
  | "text" // 2. Tekst
  | "taxonomy" // 3. Oblast i teme
  | "kompas" // 4. Kako Kompas koristi tekst
  | "review"; // 5. Pregled i slanje

export interface ArticleStepStatus {
  id: ArticleStepId;
  /** 1–5, for badge display. */
  ordinal: number;
  label: string;
  done: boolean;
  /** Cannot proceed because a previous step is incomplete. */
  blocked: boolean;
  /** Step is done but a health finding exists for a field within it. */
  hasProblem: boolean;
  /** What the tooltip says when the badge is amber. */
  problemSummary: string | null;
}

export interface ArticleTask {
  /** Stable id matching a field anchor or a rule id. */
  id: string;
  label: string;
  step: ArticleStepId;
  /** If set, navigating to this step and focusing this anchor resolves it. */
  anchor?: string | undefined;
  /** Server says this must be resolved to publish. */
  blocking: boolean;
}

export interface ArticleCompletionState {
  steps: ArticleStepStatus[];
  currentStep: ArticleStepId;
  nextAction: {
    label: string;
    step: ArticleStepId;
    description: string;
    anchor?: string;
  } | null;
  canSubmitForReview: boolean;
  blockingTasks: ArticleTask[];
  advisoryTasks: ArticleTask[];
}

// ---------------------------------------------------------------------------
// Slot readers — pure, no React, no hooks
// ---------------------------------------------------------------------------

interface SlotLike {
  mode?: string;
  fields?: Record<string, unknown>;
}

function readSlot(
  entry: Pick<ApiContentRevision, "slotData">,
  name: string,
): SlotLike | null {
  const value = entry.slotData[name];
  if (typeof value !== "object" || value === null) return null;
  return value as SlotLike;
}

function overriddenField(
  entry: Pick<ApiContentRevision, "slotData">,
  slotName: string,
  fieldName: string,
): unknown {
  const slot = readSlot(entry, slotName);
  if (!slot || slot.mode !== "override") return undefined;
  return slot.fields?.[fieldName];
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasRichBody(
  entry: Pick<ApiContentRevision, "slotData">,
  slotName: string,
  fieldName = "body",
): boolean {
  const body = overriddenField(entry, slotName, fieldName);
  return (
    typeof body === "object" &&
    body !== null &&
    Array.isArray((body as { blocks?: unknown }).blocks) &&
    ((body as { blocks: unknown[] }).blocks.length ?? 0) > 0
  );
}

// ---------------------------------------------------------------------------
// Individual checks
// ---------------------------------------------------------------------------

function basicsDone(entry: Pick<ApiContentRevision, "slotData">): {
  done: boolean;
  missingTitle: boolean;
  missingAuthor: boolean;
} {
  const missingTitle = !hasText(overriddenField(entry, "hero", "title"));
  const authorTarget = overriddenField(entry, "byline", "author");
  const missingAuthor =
    typeof authorTarget !== "object" ||
    authorTarget === null ||
    !hasText((authorTarget as { targetId?: unknown }).targetId);
  return { done: !missingTitle && !missingAuthor, missingTitle, missingAuthor };
}

function textDone(entry: Pick<ApiContentRevision, "slotData">): {
  done: boolean;
  missingBody: boolean;
} {
  const missingBody = !hasRichBody(entry, "body_intro");
  return { done: !missingBody, missingBody };
}

function taxonomyDone(discovery: ApiContentRevision["discovery"]): {
  done: boolean;
  missingTopicGroup: boolean;
  missingTopics: boolean;
} {
  const missingTopicGroup = discovery.topicGroupTermId === null;
  const missingTopics = discovery.topicTermIds.length === 0;
  return {
    done: !missingTopicGroup && !missingTopics,
    missingTopicGroup,
    missingTopics,
  };
}

function kompasAnswersDone(discovery: ApiContentRevision["discovery"]): {
  done: boolean;
  missingAudience: boolean;
  missingGoals: boolean;
  missingJourney: boolean;
} {
  const missingAudience = discovery.audienceTermIds.length === 0;
  const missingGoals = discovery.contentGoalTermIds.length === 0;
  const missingJourney = discovery.journeyIntentTermId === null;
  return {
    done: !missingAudience && !missingGoals && !missingJourney,
    missingAudience,
    missingGoals,
    missingJourney,
  };
}

// ---------------------------------------------------------------------------
// Health-finding → Task mapping
// ---------------------------------------------------------------------------

/**
 * Translates server-side Content Health findings into author-facing tasks.
 * Parses rule ids rather than message text — the message is a human-readable
 * sentence; the rule id is the stable, machine-readable contract.
 */
function findingsToTasks(findings: readonly ApiContentFinding[]): {
  blocking: ArticleTask[];
  advisory: ArticleTask[];
} {
  const blocking: ArticleTask[] = [];
  const advisory: ArticleTask[] = [];

  /** Safe label — never empty. */
  function label(finding: ApiContentFinding): string {
    return finding.remediation || finding.message || "Proverite ovo polje.";
  }

  for (const finding of findings) {
    // Discovery / taxonomy findings
    if (
      finding.ruleId === "KOMPAS-ELIGIBILITY-001" ||
      finding.ruleId === "EDIT-001"
    ) {
      // These are about missing discovery metadata. The task map below covers
      // the specific fields; the generic message is deliberately not shown as
      // a raw sentence.
      if (finding.fieldPath)
        advisory.push({
          id: `${finding.ruleId}-${finding.fieldPath}`,
          label: label(finding),
          step: "kompas",
          anchor: finding.fieldPath,
          blocking: finding.severity === "error",
        });
      continue;
    }

    // Reference validation — taxonomy term not found / archived
    if (finding.ruleId === "TAX-REF-001" || finding.ruleId === "TAX-REF-002") {
      const task = {
        id: `${finding.ruleId}-${finding.fieldPath ?? ""}`,
        label: label(finding),
        step:
          (finding.fieldPath?.startsWith("topic") ?? false)
            ? "taxonomy"
            : ("kompas" as ArticleStepId),
        anchor: finding.fieldPath ?? undefined,
        blocking: finding.severity === "error",
      };
      (finding.severity === "error" ? blocking : advisory).push(task);
      continue;
    }

    // Content-model / structural
    if (finding.ruleId?.startsWith("MODEL-") ?? false) {
      // MODEL-003 is about toggleable (optional) sections having no override
      // — for articles these are deliberate: the author adds them manually.
      const isOptionalOverride =
        finding.ruleId === "MODEL-003" &&
        finding.fieldPath != null &&
        ["questions", "practice", "body_outro", "sources", "cta"].includes(
          finding.fieldPath,
        );
      (isOptionalOverride ? advisory : blocking).push({
        id: `${finding.ruleId}-${finding.fieldPath ?? ""}`,
        // Translate MODEL-003 into Serbian the author understands.
        label: isOptionalOverride
          ? optionalSectionLabel(finding.fieldPath ?? "")
          : label(finding),
        step: guessStepForField(finding.fieldPath),
        anchor: finding.fieldPath ?? undefined,
        blocking: !isOptionalOverride,
      });
      continue;
    }

    // Rich-doc findings
    if (finding.ruleId?.startsWith("RICH-") ?? false) {
      advisory.push({
        id: `${finding.ruleId}-${finding.fieldPath ?? ""}`,
        label: label(finding),
        step: "text",
        anchor: finding.fieldPath ?? undefined,
        blocking: finding.severity === "error",
      });
      continue;
    }

    // Import findings
    if (finding.ruleId?.startsWith("IMPORT-") ?? false) {
      advisory.push({
        id: `${finding.ruleId}-${finding.fieldPath ?? ""}`,
        label: label(finding),
        step: "text",
        anchor: finding.fieldPath ?? undefined,
        blocking: false,
      });
      continue;
    }

    // Anything else becomes an advisory, kept for visibility
    advisory.push({
      id: `${finding.ruleId}-${finding.fieldPath ?? ""}`,
      label: label(finding),
      step: "review",
      anchor: finding.fieldPath ?? undefined,
      blocking: finding.severity === "error",
    });
  }

  return { blocking, advisory };
}

/** Human-readable Serbian labels for optional article sections.
 *  Replaces the technical MODEL-003 remediation text ("Sekcija „x" nema
 *  važeći override oblik.") that means nothing to a Word user. */
function optionalSectionLabel(fieldPath: string): string {
  const map: Record<string, string> = {
    questions: "Pitanja za razmišljanje nisu dodata",
    practice: "Praktični koraci nisu dodati",
    body_outro: "Završna poruka nije dodata",
    sources: "Izvori i literatura nisu dodati",
    cta: "Sledeći korak za čitaoca nije dodat",
  };
  return map[fieldPath] ?? `${fieldPath} nije podešeno`;
}

/** Reasonable guess at which step a field path belongs to. */
function guessStepForField(fieldPath: string | null): ArticleStepId {
  if (!fieldPath) return "review";
  if (fieldPath.startsWith("hero") || fieldPath.startsWith("byline"))
    return "basics";
  if (fieldPath.startsWith("body")) return "text";
  if (fieldPath.startsWith("topic")) return "taxonomy";
  if (
    fieldPath.startsWith("audience") ||
    fieldPath.startsWith("contentGoal") ||
    fieldPath.startsWith("journey")
  )
    return "kompas";
  return "review";
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

const STEP_ORDER: ArticleStepId[] = [
  "basics",
  "text",
  "taxonomy",
  "kompas",
  "review",
];

const STEP_LABELS: Record<ArticleStepId, string> = {
  basics: "Osnovni podaci",
  text: "Tekst",
  taxonomy: "Oblast i teme",
  kompas: "Kako Kompas koristi tekst",
  review: "Pregled i slanje",
};

/**
 * Derives the article's completion state from its current slot data, discovery
 * metadata, and optional server-side Content Health findings.
 *
 * Pure: no hooks, no fetching, no React. The same result feeds the stepper,
 * the next-action card, the checklist, and the submit button.
 */
export function deriveArticleCompletion(
  entry: Pick<ApiContentRevision, "slotData" | "discovery" | "status">,
  healthFindings: readonly ApiContentFinding[] = [],
): ArticleCompletionState {
  const discovery = entry.discovery;

  const b = basicsDone(entry);
  const t = textDone(entry);
  const x = taxonomyDone(discovery);
  const k = kompasAnswersDone(discovery);

  const doneMap: Record<ArticleStepId, boolean> = {
    basics: b.done,
    text: t.done,
    taxonomy: x.done,
    kompas: k.done,
    review: false, // never "done" in the sense of a green check — it's the gate
  };

  // Determine current step — first incomplete step wins.
  let current: ArticleStepId = "basics";
  for (const step of STEP_ORDER) {
    current = step;
    if (!doneMap[step]) break;
  }

  const { blocking, advisory } = findingsToTasks(healthFindings);

  // Add derived tasks that the health endpoint doesn't explicitly enumerate
  // — the field-level gap analysis that is the whole point of this function.
  const derived: ArticleTask[] = [];

  if (b.missingTitle)
    derived.push({
      id: "missing-hero-title",
      label: "Unesite naslov članka.",
      step: "basics",
      anchor: "hero.title",
      blocking: true,
    });
  if (b.missingAuthor)
    derived.push({
      id: "missing-byling-author",
      label: "Izaberite ko javno potpisuje tekst.",
      step: "basics",
      anchor: "byline.author",
      blocking: true,
    });

  if (t.missingBody)
    derived.push({
      id: "missing-body",
      label: "Napišite ili uvezite tekst članka.",
      step: "text",
      anchor: "body_intro.body",
      blocking: true,
    });

  if (x.missingTopicGroup)
    derived.push({
      id: "missing-topic-group",
      label: "Izaberite oblast kojoj tekst pripada.",
      step: "taxonomy",
      anchor: "discovery.topicGroupTermId",
      blocking: true,
    });
  if (x.missingTopics)
    derived.push({
      id: "missing-topics",
      label: "Izaberite bar jednu temu.",
      step: "taxonomy",
      anchor: "discovery.topicTermIds",
      blocking: true,
    });

  if (k.missingAudience)
    derived.push({
      id: "missing-audience",
      label: "Odgovorite kome je tekst namenjen.",
      step: "kompas",
      anchor: "discovery.audienceTermIds",
      blocking: true,
    });
  if (k.missingGoals)
    derived.push({
      id: "missing-goals",
      label: "Odgovorite šta čitalac dobija iz ovog teksta.",
      step: "kompas",
      anchor: "discovery.contentGoalTermIds",
      blocking: true,
    });
  if (k.missingJourney)
    derived.push({
      id: "missing-journey",
      label: "Odgovorite gde tekst može dalje da vodi čitaoca.",
      step: "kompas",
      anchor: "discovery.journeyIntentTermId",
      blocking: true,
    });

  // Merge: derived tasks win because they are field-level; backend tasks
  // fill in for structural / reference / import issues the function doesn't
  // model. Deduplicate by id.
  const seen = new Set<string>();
  const allBlocking: ArticleTask[] = [];
  const allAdvisory: ArticleTask[] = [];

  for (const task of derived) {
    if (seen.has(task.id)) continue;
    seen.add(task.id);
    (task.blocking ? allBlocking : allAdvisory).push(task);
  }
  for (const task of blocking) {
    if (seen.has(task.id)) continue;
    seen.add(task.id);
    allBlocking.push(task);
  }
  for (const task of advisory) {
    if (seen.has(task.id)) continue;
    seen.add(task.id);
    allAdvisory.push(task);
  }

  // Can submit for review only when all four first steps are done and there
  // are no blocking tasks. The article's publication status is not considered
  // — only the draft readiness.
  const canSubmitForReview =
    b.done && t.done && x.done && k.done && allBlocking.length === 0;

  // Next-action text.
  let nextAction: ArticleCompletionState["nextAction"] = null;

  if (!b.done) {
    nextAction = {
      label: "Nastavi na osnovne podatke",
      step: "basics",
      description: "Unesite naslov i izaberite autora teksta.",
    };
  } else if (!t.done) {
    nextAction = {
      label: "Nastavi na tekst",
      step: "text",
      description:
        "Tekst je najvažniji deo. Napišite ga ili uvezite Word dokument.",
    };
  } else if (!x.done) {
    nextAction = {
      label: "Izaberite oblast i teme",
      step: "taxonomy",
      description:
        "Da bi Kompas znao kada da predloži tekst posetiocima, izaberite oblast i najmanje jednu temu.",
    };
  } else if (!k.done) {
    nextAction = {
      label: "Dovršite podešavanje za Kompas",
      step: "kompas",
      description:
        "Još tri kratka odgovora: kome je tekst namenjen, šta čitalac dobija i da li ga vodi ka istraživanju ili stručnoj podršci.",
    };
  } else {
    nextAction = {
      label: "Pregledajte i pošaljite",
      step: "review",
      description:
        "Tekst je spreman. Pregledajte kako će izgledati posetiocima i pošaljite ga timu.",
    };
  }

  // Step statuses.
  const steps: ArticleStepStatus[] = STEP_ORDER.map((id, i) => {
    const blocked =
      i > 0 && !STEP_ORDER.slice(0, i).every((prev) => doneMap[prev]);
    const stepTasks = allBlocking
      .concat(allAdvisory)
      .filter(
        (task) => task.step === id || task.anchor?.startsWith(stepAnchor(id)),
      );
    const hasProblem = doneMap[id] && stepTasks.length > 0;
    const problemSummary =
      hasProblem && stepTasks.length > 0
        ? stepTasks.map((task) => task.label).join("; ")
        : null;
    return {
      id,
      ordinal: i + 1,
      label: STEP_LABELS[id],
      done: id === "review" ? canSubmitForReview : doneMap[id],
      blocked,
      hasProblem,
      problemSummary,
    };
  });

  return {
    steps,
    currentStep: current,
    nextAction,
    canSubmitForReview,
    blockingTasks: allBlocking,
    advisoryTasks: allAdvisory,
  };
}

/** The anchor prefix the stepper navigates to for the corresponding step. */
export function stepAnchor(step: ArticleStepId): string {
  switch (step) {
    case "basics":
      return "basics";
    case "text":
      return "text";
    case "taxonomy":
      return "taxonomy";
    case "kompas":
      return "kompas";
    case "review":
      return "review";
  }
}

/** The URL korak value for a given step. */
export function stepParam(step: ArticleStepId): string {
  switch (step) {
    case "basics":
      return "osnovni-podaci";
    case "text":
      return "tekst";
    case "taxonomy":
      return "oblast-teme";
    case "kompas":
      return "kompas";
    case "review":
      return "pregled";
  }
}

/** Reverse-maps a korak URL value to a step id. */
export function stepFromParam(param: string | null): ArticleStepId | null {
  switch (param) {
    case "osnovni-podaci":
      return "basics";
    case "tekst":
      return "text";
    case "oblast-teme":
      return "taxonomy";
    case "kompas":
      return "kompas";
    case "pregled":
      return "review";
    default:
      return null;
  }
}
