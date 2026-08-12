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

interface CompassAreaPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: CompassAreaPageProps): Promise<Metadata> {
  if (!isCompassPublicEnabled()) return {};

  const { slug } = await params;
  const aggregate = await loadPublicTaxonomyPage("oblast", slug, () =>
    fallbackTaxonomyPage("oblast", slug),
  );
  return createCompassMetadata(compassPageDiscoverability(aggregate, "oblast"));
}

export default async function CompassAreaPage({
  params,
}: CompassAreaPageProps) {
  if (!isCompassPublicEnabled()) notFound();

  const { slug } = await params;
  const aggregate = await loadPublicTaxonomyPage("oblast", slug, () =>
    fallbackTaxonomyPage("oblast", slug),
  );
  return <PublicTaxonomyPage aggregate={aggregate} routeKind="oblast" />;
}
