import type { UiLocale } from "@/i18n/locales";
import { findOrganizationLocaleSettings } from "@/lib/tenant/organizations";

import { blankPack } from "./packs/blank";
import { mentalHealthStarterPack } from "./packs/mental-health-starter";
import { psihointegritetPack } from "./packs/psihointegritet";
import type { ContentPack, ContentPackId, FallbackContent } from "./pack-types";

export type {
  ContentPackId,
  ContentPackMetadata,
  FallbackContent,
  HomepageFallbackContent,
  ServicesFallbackContent,
} from "./pack-types";

const CONTENT_PACKS: Record<ContentPackId, ContentPack> = {
  psihointegritet: psihointegritetPack,
  "mental-health-starter": mentalHealthStarterPack,
  blank: blankPack,
};

/** Pure pack boundary. Runtime consumers never import a pack directly. */
export function getContentPackForLocale(
  packId: ContentPackId,
  locale: UiLocale,
): FallbackContent {
  return CONTENT_PACKS[packId][locale];
}

/**
 * C2(a): a verified deployment organization selects the pack. This lookup is
 * checked-in configuration, not a database column and not request input.
 */
export function contentPackForOrganizationSlug(slug: string): ContentPackId {
  const organization = findOrganizationLocaleSettings(slug);
  if (!organization) {
    throw new Error(
      `Unknown organization slug "${slug}" cannot select a content pack.`,
    );
  }
  return organization.contentPack;
}

function deploymentContentPack(): ContentPackId {
  return contentPackForOrganizationSlug(
    process.env.DEFAULT_ORGANIZATION_SLUG ?? "psihointegritet",
  );
}

/** Pure locale boundary with the current deployment's verified pack. */
export function getFallbackContentForLocale(
  locale: UiLocale,
  packId: ContentPackId = deploymentContentPack(),
): FallbackContent {
  return getContentPackForLocale(packId, locale);
}
