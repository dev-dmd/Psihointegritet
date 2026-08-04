import { contentCharacterLimits } from "@/lib/content-governance/limits";

import type { SaveTaxonomyTermVariables } from "../../hooks/use-taxonomy-registry";
import type { TaxonomyAxis, TaxonomyTerm } from "../../taxonomy-api";

export type ManagedTaxonomyAxis = Extract<
  TaxonomyAxis,
  "topic_group" | "topic" | "audience" | "content_goal"
>;

export interface AxisEditorConfig {
  newLabel: string;
  publicLabel: string;
  stableIdExample: string;
  requiresTopicContext: boolean;
}

export const AXIS_EDITOR_CONFIG: Record<ManagedTaxonomyAxis, AxisEditorConfig> =
  {
    topic_group: {
      newLabel: "Nova oblast",
      publicLabel: "Naziv oblasti",
      stableIdExample: "stress-overload",
      requiresTopicContext: false,
    },
    topic: {
      newLabel: "Nova tema",
      publicLabel: "Naziv teme",
      stableIdExample: "burnout",
      requiresTopicContext: true,
    },
    audience: {
      newLabel: "Nova publika",
      publicLabel: "Naziv publike",
      stableIdExample: "self",
      requiresTopicContext: false,
    },
    content_goal: {
      newLabel: "Novi cilj sadržaja",
      publicLabel: "Naziv cilja",
      stableIdExample: "understand",
      requiresTopicContext: false,
    },
  };

export type TaxonomyVisualMode = "none" | "icon" | "asset";

export interface TaxonomyTermDraft {
  stableId: string;
  publicLabel: string;
  shortDescription: string;
  primaryParentTermId: string;
  journeyIntentTermId: string;
  searchTermsText: string;
  sortOrder: string;
  internalExpertNote: string;
  visualMode: TaxonomyVisualMode;
  iconKey: string;
  assetId: string;
  publicVisible: boolean;
  compassEnabled: boolean;
  relatedTopicIds: string[];
}

export type TaxonomyDraftFieldSetter = <K extends keyof TaxonomyTermDraft>(
  field: K,
  value: TaxonomyTermDraft[K],
) => void;

export type TaxonomyValidationScope =
  "identity" | "organization" | "content" | "complete";

export interface TaxonomyValidationIssue {
  field: keyof TaxonomyTermDraft | "searchTerms";
  message: string;
}

export interface TaxonomySeoWarnings {
  publicLabel: string | null;
  shortDescription: string | null;
}

const STABLE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Which wizard step owns each field. A validation issue raised on the review
 * step points at an input that lives three steps back; without this map the
 * message is stored against a control nobody can see.
 */
export const TAXONOMY_FIELD_STEP: Record<string, 1 | 2 | 3> = {
  publicLabel: 1,
  stableId: 1,
  shortDescription: 1,
  primaryParentTermId: 2,
  journeyIntentTermId: 2,
  searchTerms: 2,
  sortOrder: 2,
  relatedTopicIds: 2,
  iconKey: 3,
  assetId: 3,
  internalExpertNote: 3,
};

export function suggestTaxonomyStableId(publicLabel: string): string {
  return publicLabel
    .trim()
    .toLocaleLowerCase("sr-Latn")
    .replaceAll("đ", "dj")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** Advisory discoverability limits only. Registry hard limits remain 160/500
 * and these warnings must never truncate input or block a draft save. */
export function taxonomySeoWarnings(
  value: Pick<TaxonomyTermDraft, "publicLabel" | "shortDescription">,
): TaxonomySeoWarnings {
  return {
    publicLabel:
      value.publicLabel.length > contentCharacterLimits.seoTitle
        ? `SEO upozorenje: naziv prelazi preporučenih ${contentCharacterLimits.seoTitle} karaktera. Čuvanje nije blokirano.`
        : null,
    shortDescription:
      value.shortDescription.length > contentCharacterLimits.seoDescription
        ? `SEO upozorenje: opis prelazi preporučenih ${contentCharacterLimits.seoDescription} karaktera. Čuvanje nije blokirano.`
        : null,
  };
}

export function initialTaxonomyVisualMode(
  term: TaxonomyTerm | null,
): TaxonomyVisualMode {
  if (term?.iconKey) return "icon";
  if (term?.assetId) return "asset";
  return "none";
}

export function createTaxonomyTermDraft(
  term: TaxonomyTerm | null,
): TaxonomyTermDraft {
  return {
    stableId: term?.stableId ?? "",
    publicLabel: term?.publicLabel ?? "",
    shortDescription: term?.shortDescription ?? "",
    primaryParentTermId: term?.primaryParentTermId ?? "",
    journeyIntentTermId: term?.journeyIntentTermId ?? "",
    searchTermsText: term?.searchTerms.join("\n") ?? "",
    sortOrder: String(term?.sortOrder ?? 0),
    internalExpertNote: term?.internalExpertNote ?? "",
    visualMode: initialTaxonomyVisualMode(term),
    iconKey: term?.iconKey ?? "",
    assetId: term?.assetId ?? "",
    publicVisible: term?.publicVisible ?? true,
    compassEnabled: term?.compassEnabled ?? true,
    relatedTopicIds:
      term?.relations
        .filter((relation) => relation.kind === "related_topic")
        .map((relation) => relation.targetTermId) ?? [],
  };
}

export function parseTaxonomySearchTerms(value: string): string[] {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const raw of value.split(/\r?\n|,/)) {
    const item = raw.trim();
    const normalized = item.toLocaleLowerCase("sr-Latn");
    if (!item || seen.has(normalized)) continue;
    seen.add(normalized);
    values.push(item);
  }
  return values;
}

function identityIssue(
  axis: ManagedTaxonomyAxis,
  draft: TaxonomyTermDraft,
  hasPersistedTerm: boolean,
): TaxonomyValidationIssue | null {
  const config = AXIS_EDITOR_CONFIG[axis];
  if (!draft.publicLabel.trim()) {
    return {
      field: "publicLabel",
      message: `${config.publicLabel} je obavezan.`,
    };
  }
  if (!hasPersistedTerm && !STABLE_ID_PATTERN.test(draft.stableId.trim())) {
    return {
      field: "stableId",
      message: `Stabilni ID koristi mala ASCII slova, brojeve i crtice, na primer ${config.stableIdExample}.`,
    };
  }
  return null;
}

function organizationIssue(
  axis: ManagedTaxonomyAxis,
  draft: TaxonomyTermDraft,
): TaxonomyValidationIssue | null {
  const config = AXIS_EDITOR_CONFIG[axis];
  if (config.requiresTopicContext && !draft.primaryParentTermId) {
    return {
      field: "primaryParentTermId",
      message: "Izaberite oblast kojoj tema pripada.",
    };
  }
  if (config.requiresTopicContext && !draft.journeyIntentTermId) {
    return {
      field: "journeyIntentTermId",
      message: "Izaberite put korisnika za ovu temu.",
    };
  }

  const searchTerms = parseTaxonomySearchTerms(draft.searchTermsText);
  if (searchTerms.length > 100) {
    return {
      field: "searchTerms",
      message: "Možete uneti najviše 100 sinonima i pojmova za pretragu.",
    };
  }
  if (searchTerms.some((item) => item.length > 160)) {
    return {
      field: "searchTerms",
      message: "Jedan sinonim ili pojam može imati najviše 160 karaktera.",
    };
  }

  const sortOrder = Number(draft.sortOrder);
  if (
    !draft.sortOrder.trim() ||
    !Number.isInteger(sortOrder) ||
    sortOrder < 0 ||
    sortOrder > 100_000
  ) {
    return {
      field: "sortOrder",
      message: "Redosled mora biti ceo broj između 0 i 100000.",
    };
  }
  if (draft.relatedTopicIds.length > 100) {
    return {
      field: "relatedTopicIds",
      message: "Možete povezati najviše 100 tema.",
    };
  }
  return null;
}

function contentIssue(
  draft: TaxonomyTermDraft,
  requireDescription: boolean,
): TaxonomyValidationIssue | null {
  if (requireDescription && !draft.shortDescription.trim()) {
    return {
      field: "shortDescription",
      message: "Unesite kratak javni opis pre nastavka.",
    };
  }
  if (draft.visualMode === "icon" && !draft.iconKey.trim()) {
    return {
      field: "iconKey",
      message: "Unesite ključ ikone ili izaberite drugi vizuelni režim.",
    };
  }
  if (draft.visualMode === "asset" && !draft.assetId.trim()) {
    return {
      field: "assetId",
      message: "Unesite ID asseta ili izaberite drugi vizuelni režim.",
    };
  }
  return null;
}

export function validateTaxonomyTermDraft(
  axis: ManagedTaxonomyAxis,
  draft: TaxonomyTermDraft,
  options: {
    hasPersistedTerm: boolean;
    scope: TaxonomyValidationScope;
    requireDescription?: boolean;
  },
): TaxonomyValidationIssue | null {
  const scopes =
    options.scope === "complete"
      ? (["identity", "organization", "content"] as const)
      : ([options.scope] as const);

  for (const scope of scopes) {
    const issue =
      scope === "identity"
        ? identityIssue(axis, draft, options.hasPersistedTerm)
        : scope === "organization"
          ? organizationIssue(axis, draft)
          : contentIssue(draft, options.requireDescription ?? false);
    if (issue) return issue;
  }
  return null;
}

export function buildTaxonomyTermSavePayload({
  axis,
  draft,
  term,
}: {
  axis: ManagedTaxonomyAxis;
  draft: TaxonomyTermDraft;
  term: TaxonomyTerm | null;
}): SaveTaxonomyTermVariables {
  const shared = {
    publicLabel: draft.publicLabel.trim(),
    shortDescription: draft.shortDescription.trim(),
    internalExpertNote: draft.internalExpertNote.trim() || null,
    sortOrder: Number(draft.sortOrder),
    iconKey: draft.visualMode === "icon" ? draft.iconKey.trim() || null : null,
    assetId: draft.visualMode === "asset" ? draft.assetId.trim() || null : null,
    publicVisible: draft.publicVisible,
    compassEnabled: draft.compassEnabled,
    searchTerms: parseTaxonomySearchTerms(draft.searchTermsText),
    ...(axis === "topic"
      ? {
          primaryParentTermId: draft.primaryParentTermId || null,
          journeyIntentTermId: draft.journeyIntentTermId || null,
          relatedTopicIds: draft.relatedTopicIds,
        }
      : {}),
  };

  if (term) {
    return {
      create: null,
      update: {
        termId: term.termId,
        revisionId: term.revisionId,
        input: { lockVersion: term.lockVersion, ...shared },
      },
    };
  }
  return {
    create: {
      axis,
      stableId: draft.stableId.trim(),
      locale: "sr-Latn",
      ...shared,
    },
    update: null,
  };
}
