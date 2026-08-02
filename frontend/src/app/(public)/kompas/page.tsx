import { CompassExitFeedback } from "@/features/compass/feedback/compass-exit-feedback";
import { compassFallbackRegistry } from "@/features/compass/fallback-registry";
import { CompassAlwaysAvailable } from "@/features/compass/sections/compass-always-available";
import { CompassHero } from "@/features/compass/sections/compass-hero";
import { CompassStartingView } from "@/features/compass/sections/compass-starting-view";
import { metadataForRoute } from "@/lib/content-governance/discoverability";
import { getContentProvider } from "@/lib/content-governance/provider-resolver";

const STARTING_VIEW_ID = "kompas-oblasti";

export async function generateMetadata() {
  return metadataForRoute("/kompas", await getContentProvider());
}

/**
 * `/kompas` — the dynamic discovery surface (D-054).
 *
 * Server Component. The registry currently holds zero published areas, so the
 * checked-in fallback renders the mechanics; `lib/compass/public-taxonomy.ts`
 * takes over per-term once the first area is published with a canonical route.
 */
export default async function CompassPage() {
  return (
    <>
      <CompassHero areasHref={`#${STARTING_VIEW_ID}`} />
      <CompassAlwaysAvailable startingViewId={STARTING_VIEW_ID} />
      <CompassStartingView
        registry={compassFallbackRegistry}
        id={STARTING_VIEW_ID}
      />
      <CompassExitFeedback />
    </>
  );
}
