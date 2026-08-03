import { CompassExitFeedback } from "@/features/compass/feedback/compass-exit-feedback";
import {
  compassDemoPreviewEnabled,
  withFallbackTerms,
} from "@/features/compass/fallback-taxonomy";
import { CompassAlwaysAvailable } from "@/features/compass/sections/compass-always-available";
import { CompassHero } from "@/features/compass/sections/compass-hero";
import { CompassStartingView } from "@/features/compass/sections/compass-starting-view";
import { metadataForRoute } from "@/lib/content-governance/discoverability";
import { getContentProvider } from "@/lib/content-governance/provider-resolver";
import { getPublicTaxonomy } from "@/lib/compass/public-taxonomy";
import { publicTermsForRouteKind } from "@/lib/compass/taxonomy-view";

const STARTING_VIEW_ID = "kompas-oblasti";

export async function generateMetadata() {
  return metadataForRoute("/kompas", await getContentProvider());
}

/**
 * `/kompas` — the dynamic discovery surface (D-054).
 *
 * Server Component. Published taxonomy is authoritative. Checked-in demo rows
 * are available only under an explicit, non-production preview flag.
 */
export default async function CompassPage() {
  const taxonomy = await getPublicTaxonomy();
  const liveAreas = publicTermsForRouteKind(taxonomy, "oblast");
  const liveTopics = publicTermsForRouteKind(taxonomy, "tema");
  const areas = withFallbackTerms(liveAreas, "oblast");
  const topics = withFallbackTerms(liveTopics, "tema");
  const isDemo =
    liveAreas.length === 0 && areas.length > 0 && compassDemoPreviewEnabled();

  return (
    <>
      <CompassHero areasHref={`#${STARTING_VIEW_ID}`} />
      <CompassAlwaysAvailable startingViewId={STARTING_VIEW_ID} />
      <CompassStartingView
        areas={areas}
        topics={topics}
        isDemo={isDemo}
        id={STARTING_VIEW_ID}
      />
      <CompassExitFeedback />
    </>
  );
}
