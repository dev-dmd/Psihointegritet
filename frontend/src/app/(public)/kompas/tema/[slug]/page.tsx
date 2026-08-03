import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicTaxonomyPage } from "@/app/(public)/kompas/_components/public-taxonomy-page";
import { isCompassPublicEnabled } from "@/lib/compass/flags";
import {
  compassPageDiscoverability,
  createCompassMetadata,
} from "@/lib/compass/discoverability";
import { fallbackTaxonomyPage } from "@/features/compass/fallback-taxonomy";
import { loadPublicTaxonomyPage } from "@/lib/compass/public-page-loader";

interface CompassTopicPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: CompassTopicPageProps): Promise<Metadata> {
  if (!isCompassPublicEnabled()) return {};

  const { slug } = await params;
  const aggregate = await loadPublicTaxonomyPage("tema", slug, () =>
    fallbackTaxonomyPage("tema", slug),
  );
  return createCompassMetadata(compassPageDiscoverability(aggregate, "tema"));
}

export default async function CompassTopicPage({
  params,
}: CompassTopicPageProps) {
  if (!isCompassPublicEnabled()) notFound();

  const { slug } = await params;
  const aggregate = await loadPublicTaxonomyPage("tema", slug, () =>
    fallbackTaxonomyPage("tema", slug),
  );
  return <PublicTaxonomyPage aggregate={aggregate} routeKind="tema" />;
}
