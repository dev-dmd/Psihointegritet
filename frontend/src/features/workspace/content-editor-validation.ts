import {
  contentCharacterLimits,
  templateRegistry,
} from "@/lib/content-governance/limits";
import { normalizeContentFieldOverride } from "@/lib/content-governance/content-field-override";
import { slotSpecRegistry } from "@/lib/content-governance/slot-schema";
import {
  isKnownPublicRoute,
  staticContentProvider,
} from "@/lib/content-governance/static-provider";
import type {
  ContentEntity,
  ContentHealthFinding,
  ContentTextField,
  ContentType,
  SeoFields,
} from "@/lib/content-governance/types";
import { evaluatePublishGate } from "@/lib/content-governance/validation";

import type { ApiContentRevision } from "./content-api";
import { requiredContentApprovals } from "./content-approval-policy";

const ROUTE_PREFIX: Record<ContentType, string> = {
  static_page: "",
  article: "/znanje",
  service: "/usluge",
  therapist: "/tim",
  program: "/programi",
  company_plan: "/rad-sa-kompanijama",
  package_offer: "/cene",
};

function overrideFields(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  const fields = (value as { fields?: unknown }).fields;
  return fields && typeof fields === "object"
    ? (fields as Record<string, unknown>)
    : {};
}

function textFieldsFor(
  entry: ApiContentRevision,
  slotData: Record<string, unknown>,
): ContentTextField[] {
  const fields: ContentTextField[] = [];
  for (const [slotName, slotSpec] of Object.entries(
    slotSpecRegistry[entry.template],
  )) {
    if (slotSpec.editability !== "editable") continue;
    const values = overrideFields(slotData[slotName]);
    for (const [fieldName, fieldSpec] of Object.entries(slotSpec.fields)) {
      if (fieldSpec.kind !== "text") continue;
      const normalized = normalizeContentFieldOverride(values[fieldName]);
      if (
        !normalized.valid ||
        normalized.mode !== "custom" ||
        typeof normalized.value !== "string"
      ) {
        continue;
      }
      fields.push({
        field: `${slotName}.${fieldName}`,
        value: normalized.value,
        limit: fieldSpec.limit,
      });
    }
  }
  return fields;
}

function firstText(
  fields: readonly ContentTextField[],
  candidates: readonly string[],
): string {
  return (
    candidates
      .map((candidate) => fields.find((item) => item.field.endsWith(candidate)))
      .find((item) => item?.value.trim())?.value ?? ""
  );
}

export function validateContentDraft(
  entry: ApiContentRevision,
  slotData: Record<string, unknown>,
  seo: SeoFields,
): ContentHealthFinding[] {
  const fallback =
    staticContentProvider
      .listAll()
      .find(
        (item) =>
          item.type === entry.contentType && item.canonicalSlug === entry.slug,
      ) ?? null;
  const definition = templateRegistry[entry.template];
  const textFields = textFieldsFor(entry, slotData);
  const route =
    fallback?.route ??
    `${ROUTE_PREFIX[entry.contentType]}/${entry.slug}`.replace(/^\/\//, "/");
  const title =
    firstText(textFields, [".h1", ".title", ".name"]) ||
    fallback?.seo.title ||
    entry.slug;
  const description =
    firstText(textFields, [
      ".seoDescription",
      ".heroLead",
      ".description",
      ".intro",
    ]) ||
    fallback?.seo.description ||
    "";
  const slots = [
    ...definition.requiredSlots.filter(
      (slot) =>
        (slotData[slot] as { mode?: string } | undefined)?.mode !== "hidden",
    ),
    ...definition.optionalSlots.filter(
      (slot) =>
        (slotData[slot] as { mode?: string } | undefined)?.mode === "override",
    ),
  ];
  const requirements = requiredContentApprovals(
    entry.contentType,
    entry.template,
  );

  const entity = {
    ...(fallback ?? {}),
    id: entry.entryId,
    type: entry.contentType,
    route,
    canonicalSlug: entry.slug,
    publicationStatus: entry.status,
    indexingPolicy: fallback?.indexingPolicy ?? "noindex",
    template: entry.template,
    slots,
    requiredApprovals: requirements.map((capability) => ({
      capability,
      required: true,
    })),
    approvalEvidence: entry.decisions.map((decision) => ({
      capability: decision.capability,
      status: decision.outcome,
      ...(decision.decidedBy
        ? { approvedByLabel: decision.decidedBy.displayName }
        : {}),
      approvedAt: decision.decidedAt,
      ...(decision.note ? { note: decision.note } : {}),
    })),
    seo: {
      title: seo.title || title,
      description: seo.description || description,
      ...(seo.ogImageAssetId
        ? { ogImageAssetId: seo.ogImageAssetId }
        : fallback?.seo.ogImageAssetId
          ? { ogImageAssetId: fallback.seo.ogImageAssetId }
          : {}),
    },
    textFields,
    ctas: fallback?.ctas ?? [],
    widgets: fallback?.widgets ?? [],
    jsonLdKinds: fallback?.jsonLdKinds ?? [],
  } as ContentEntity;

  return evaluatePublishGate(entity, {
    provider: staticContentProvider,
    isKnownPublicRoute,
  }).findings.filter(
    (finding) =>
      finding.ruleId !== "LIMIT-001" ||
      !finding.field ||
      textFields.some(
        (field) =>
          field.field === finding.field &&
          field.value.length > contentCharacterLimits[field.limit],
      ),
  );
}
