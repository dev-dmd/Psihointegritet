import type { GroupProgram } from "@/content/programs";
import type { ServiceCatalogItem, SessionPackage } from "@/content/services";
import type { Therapist } from "@/types/therapist";

import type {
  CompanyPlanContentEntity,
  ContentEntity,
  ContentEntityOfType,
  ContentProvider,
  ContentType,
  ProgramContentEntity,
  PublishedListQuery,
  RedirectRecord,
  SeoFields,
  ServiceContentEntity,
  StaticPageEntity,
  TherapistContentEntity,
} from "./types";

export interface PublishedContentOverride {
  contentType: ContentType;
  slug: string;
  locale: string;
  template: ContentEntity["template"];
  slotData: Record<string, unknown>;
  seo: SeoFields;
  publishedAt: string;
}

const contentTypes = new Set<ContentType>([
  "static_page",
  "service",
  "therapist",
  "program",
  "company_plan",
  "package_offer",
]);

const contentTemplates = new Set<ContentEntity["template"]>([
  "service_detail",
  "therapist_profile",
  "support_area",
  "audience_page",
  "program_detail",
  "company_page",
  "pricing_page",
  "static_information",
  "legal_page",
]);

/** Runtime boundary shared by the public resolver and `content:check`. */
export function parsePublishedContentOverrides(
  value: unknown,
): PublishedContentOverride[] | null {
  if (!Array.isArray(value)) return null;
  const revisions: PublishedContentOverride[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const revision = item as Record<string, unknown>;
    const seo = revision.seo;
    if (
      !contentTypes.has(revision.contentType as ContentType) ||
      typeof revision.slug !== "string" ||
      typeof revision.locale !== "string" ||
      !contentTemplates.has(revision.template as ContentEntity["template"]) ||
      !revision.slotData ||
      typeof revision.slotData !== "object" ||
      Array.isArray(revision.slotData) ||
      !seo ||
      typeof seo !== "object" ||
      Array.isArray(seo) ||
      typeof (seo as Record<string, unknown>).title !== "string" ||
      typeof (seo as Record<string, unknown>).description !== "string" ||
      ((seo as Record<string, unknown>).ogImageAssetId !== undefined &&
        typeof (seo as Record<string, unknown>).ogImageAssetId !== "string") ||
      typeof revision.publishedAt !== "string"
    ) {
      return null;
    }
    revisions.push(item as PublishedContentOverride);
  }
  return revisions;
}

type OverrideSlot = {
  mode?: "inherit" | "override" | "hidden";
  fields?: Record<string, unknown>;
};

function slot(
  revision: PublishedContentOverride,
  name: string,
): OverrideSlot | undefined {
  const value = revision.slotData[name];
  return value && typeof value === "object"
    ? (value as OverrideSlot)
    : undefined;
}

function field(
  revision: PublishedContentOverride,
  slotName: string,
  fieldName: string,
): unknown {
  const current = slot(revision, slotName);
  if (current?.mode !== "override") return undefined;
  const value = current.fields?.[fieldName];
  return typeof value === "string" && !value.trim() ? undefined : value;
}

function text(
  revision: PublishedContentOverride,
  slotName: string,
  fieldName: string,
): string | undefined {
  const value = field(revision, slotName, fieldName);
  return typeof value === "string" ? value : richDocText(value);
}

function richDocParagraphs(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const node = value as {
    type?: unknown;
    text?: unknown;
    content?: unknown;
    blocks?: unknown;
    spans?: unknown;
    items?: unknown;
  };
  if (typeof node.text === "string") return [node.text];
  if (Array.isArray(node.blocks)) return node.blocks.flatMap(richDocParagraphs);
  if (Array.isArray(node.spans)) {
    const paragraph = node.spans.flatMap(richDocParagraphs).join("").trim();
    return paragraph ? [paragraph] : [];
  }
  if (Array.isArray(node.items)) return node.items.flatMap(richDocParagraphs);
  if (!Array.isArray(node.content)) return [];
  if (node.type === "paragraph" || node.type === "heading") {
    const paragraph = node.content.flatMap(richDocParagraphs).join("").trim();
    return paragraph ? [paragraph] : [];
  }
  return node.content.flatMap(richDocParagraphs);
}

function richDocText(value: unknown): string | undefined {
  const paragraphs = richDocParagraphs(value);
  return paragraphs.length ? paragraphs.join(" ") : undefined;
}

function mergedSeo(fallback: SeoFields, override: SeoFields): SeoFields {
  return {
    title: override.title.trim() || fallback.title,
    description: override.description.trim() || fallback.description,
    ...(override.ogImageAssetId
      ? { ogImageAssetId: override.ogImageAssetId }
      : fallback.ogImageAssetId
        ? { ogImageAssetId: fallback.ogImageAssetId }
        : {}),
  };
}

function publishedBase(
  fallback: ContentEntity,
  revision: PublishedContentOverride,
): ContentEntity {
  const hidden = new Set(
    Object.entries(revision.slotData)
      .filter(
        ([, value]) => (value as OverrideSlot | undefined)?.mode === "hidden",
      )
      .map(([name]) => name),
  );
  return {
    ...fallback,
    publicationStatus: "published",
    slots: fallback.slots.filter((name) => !hidden.has(name)),
    seo: mergedSeo(fallback.seo, revision.seo),
    approvalEvidence: fallback.requiredApprovals.map(({ capability }) => ({
      capability,
      status: "approved",
      approvedAt: revision.publishedAt,
    })),
  };
}

function overlayStaticPage(
  fallback: StaticPageEntity,
  revision: PublishedContentOverride,
): StaticPageEntity {
  const base = publishedBase(fallback, revision) as StaticPageEntity;
  return {
    ...base,
    h1:
      text(revision, "hero", "h1") ??
      text(revision, "title", "title") ??
      fallback.h1,
  };
}

function overlayService(
  fallback: ServiceContentEntity,
  revision: PublishedContentOverride,
): ServiceContentEntity {
  const source: ServiceCatalogItem = {
    ...fallback.source,
    name: text(revision, "hero", "title") ?? fallback.source.name,
    description: text(revision, "hero", "lead") ?? fallback.source.description,
    duration: text(revision, "facts", "duration") ?? fallback.source.duration,
    format: text(revision, "facts", "format") ?? fallback.source.format,
    audience: text(revision, "description", "body") ?? fallback.source.audience,
    firstStep:
      text(revision, "first_step", "body") ?? fallback.source.firstStep,
  };
  return {
    ...(publishedBase(fallback, revision) as ServiceContentEntity),
    source,
  };
}

function stringList(value: unknown, key: string): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result = value
    .map((item) =>
      item && typeof item === "object"
        ? (item as Record<string, unknown>)[key]
        : undefined,
    )
    .filter(
      (item): item is string =>
        typeof item === "string" && Boolean(item.trim()),
    );
  return result.length ? result : undefined;
}

function overlayTherapist(
  fallback: TherapistContentEntity,
  revision: PublishedContentOverride,
): TherapistContentEntity {
  const image = field(revision, "hero", "image");
  const bioValue = field(revision, "bio", "body");
  const paragraphs = richDocParagraphs(bioValue);
  const source: Therapist = {
    ...fallback.source,
    badge: text(revision, "hero", "badge") ?? fallback.source.badge,
    name: text(revision, "hero", "name") ?? fallback.source.name,
    title: text(revision, "hero", "title") ?? fallback.source.title,
    quote: text(revision, "hero", "quote") ?? fallback.source.quote,
    formats: text(revision, "hero", "formats") ?? fallback.source.formats,
    image:
      image &&
      typeof image === "object" &&
      typeof (image as { assetId?: unknown }).assetId === "string"
        ? (image as { assetId: string }).assetId
        : fallback.source.image,
    areas:
      stringList(field(revision, "areas", "items"), "label") ??
      fallback.source.areas,
    cardExcerpt:
      text(revision, "bio", "cardExcerpt") ?? fallback.source.cardExcerpt,
    bio: paragraphs.length ? paragraphs : fallback.source.bio,
  };
  return {
    ...(publishedBase(fallback, revision) as TherapistContentEntity),
    source,
  };
}

function overlayProgram(
  fallback: ProgramContentEntity,
  revision: PublishedContentOverride,
): ProgramContentEntity {
  const details = text(revision, "facts", "details");
  const note = text(revision, "facts", "note");
  const source: GroupProgram = {
    ...fallback.source,
    title: text(revision, "hero", "title") ?? fallback.source.title,
    sessions: text(revision, "facts", "sessions") ?? fallback.source.sessions,
    priceLine:
      text(revision, "facts", "priceLine") ?? fallback.source.priceLine,
    audience: text(revision, "audience", "body") ?? fallback.source.audience,
    ...(details ? { details } : {}),
    ...(note ? { note } : {}),
  };
  return {
    ...(publishedBase(fallback, revision) as ProgramContentEntity),
    source,
  };
}

function overlayCompanyPlan(
  fallback: CompanyPlanContentEntity,
  revision: PublishedContentOverride,
): CompanyPlanContentEntity {
  return {
    ...(publishedBase(fallback, revision) as CompanyPlanContentEntity),
    source: {
      ...fallback.source,
      title: text(revision, "hero", "title") ?? fallback.source.title,
      description:
        text(revision, "hero", "lead") ?? fallback.source.description,
    },
  };
}

function overlayPackage(
  fallback: Extract<ContentEntity, { type: "package_offer" }>,
  revision: PublishedContentOverride,
): Extract<ContentEntity, { type: "package_offer" }> {
  const items = field(revision, "packages", "items");
  const matching =
    Array.isArray(items) &&
    items.find(
      (item) =>
        item &&
        typeof item === "object" &&
        (item as { title?: unknown }).title ===
          `${fallback.source.sessions} individualnih seansi`,
    );
  const authored = matching as Record<string, unknown> | false;
  const source: SessionPackage = {
    ...fallback.source,
    deadline:
      (authored && typeof authored.deadline === "string"
        ? authored.deadline
        : undefined) ?? fallback.source.deadline,
    priceAmount:
      (authored && typeof authored.priceAmount === "number"
        ? authored.priceAmount
        : undefined) ?? fallback.source.priceAmount,
    ...(authored && typeof authored.fullPriceAmount === "number"
      ? { fullPriceAmount: authored.fullPriceAmount }
      : {}),
  };
  return {
    ...(publishedBase(fallback, revision) as Extract<
      ContentEntity,
      { type: "package_offer" }
    >),
    source,
  };
}

function overlay(
  fallback: ContentEntity,
  revision: PublishedContentOverride,
): ContentEntity {
  switch (fallback.type) {
    case "static_page":
      return overlayStaticPage(fallback, revision);
    case "service":
      return overlayService(fallback, revision);
    case "therapist":
      return overlayTherapist(fallback, revision);
    case "program":
      return overlayProgram(fallback, revision);
    case "company_plan":
      return overlayCompanyPlan(fallback, revision);
    case "package_offer":
      return overlayPackage(fallback, revision);
  }
}

export class CmsContentProvider implements ContentProvider {
  private readonly entities: ContentEntity[];
  private readonly byId: Map<string, ContentEntity>;

  constructor(
    private readonly fallback: ContentProvider,
    revisions: readonly PublishedContentOverride[],
  ) {
    const byIdentity = new Map(
      revisions.map((revision) => [
        `${revision.contentType}:${revision.slug}`,
        revision,
      ]),
    );
    this.entities = fallback.listAll().map((entity) => {
      const revision = byIdentity.get(`${entity.type}:${entity.canonicalSlug}`);
      return revision ? overlay(entity, revision) : entity;
    });
    this.byId = new Map(this.entities.map((entity) => [entity.id, entity]));
  }

  getPageByRoute(route: string): ContentEntity | null {
    return this.entities.find((entity) => entity.route === route) ?? null;
  }

  getEntity<T extends ContentType>(
    type: T,
    id: string,
  ): ContentEntityOfType<T> | null {
    const entity = this.byId.get(id);
    return entity?.type === type ? (entity as ContentEntityOfType<T>) : null;
  }

  getEntityById(id: string): ContentEntity | null {
    return this.byId.get(id) ?? null;
  }

  listPublished(input: PublishedListQuery = {}): ContentEntity[] {
    return this.entities.filter(
      (entity) =>
        entity.publicationStatus === "published" &&
        (input.type === undefined || entity.type === input.type),
    );
  }

  listAll(): ContentEntity[] {
    return [...this.entities];
  }

  getRedirect(sourcePath: string): RedirectRecord | null {
    return this.fallback.getRedirect(sourcePath);
  }
}
