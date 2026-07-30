import { staticContentEntities } from "./static-provider";
import type { ContentEntity, ContentTemplate, ContentType } from "./types";

/**
 * System content is the fixed set of public platform entities that every
 * tenant may override. Legal pages deliberately stay out of this catalogue:
 * their route and RichDoc body are owned by "Dokumenti i saglasnosti".
 *
 * The catalogue is derived from the same fallback entities consumed by the
 * public renderer. A route therefore cannot exist in the public application
 * while silently drifting to a second hand-maintained panel list.
 */
export interface SystemContentDefinition {
  id: string;
  contentType: ContentType;
  slug: string;
  template: ContentTemplate;
  publicRoute: string;
  title: string;
}

function contentTitle(entity: ContentEntity): string {
  switch (entity.type) {
    case "static_page":
      return entity.h1;
    case "service":
      return entity.source.name;
    case "therapist":
      return entity.source.name;
    case "program":
      return entity.source.title;
    case "company_plan":
      return entity.source.title;
    case "package_offer":
      return `${entity.source.sessions} individualnih seansi`;
  }
  const unreachable: never = entity;
  return unreachable;
}

export function systemContentIdentity(
  value: Pick<SystemContentDefinition, "contentType" | "slug">,
): string {
  return `${value.contentType}:${value.slug}`;
}

export const systemContentCatalog: readonly SystemContentDefinition[] =
  staticContentEntities
    .filter((entity) => entity.management === "system")
    .map((entity) => ({
      id: entity.id,
      contentType: entity.type,
      slug: entity.canonicalSlug,
      template: entity.template,
      publicRoute: entity.route,
      title: contentTitle(entity),
    }));

export function findSystemContentDefinition(
  contentType: ContentType,
  slug: string,
): SystemContentDefinition | null {
  return (
    systemContentCatalog.find(
      (item) => item.contentType === contentType && item.slug === slug,
    ) ?? null
  );
}
