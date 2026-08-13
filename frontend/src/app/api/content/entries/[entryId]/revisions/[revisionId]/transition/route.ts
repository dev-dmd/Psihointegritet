import { revalidatePath, revalidateTag } from "next/cache";

import { isUiLocale } from "@/i18n/locales";
import { revalidatePublicCompassAfterMutation } from "@/lib/compass/revalidation";
import {
  pathsForContentChange,
  publicContentCacheTag,
} from "@/lib/content-governance/cache";
import type {
  ContentType,
  PublicationStatus,
} from "@/lib/content-governance/types";
import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

interface RouteContext {
  params: Promise<{ entryId: string; revisionId: string }>;
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { entryId, revisionId } = await context.params;
  const body = await request.text();
  const response = await forwardStaffIntake(
    `/api/v1/content/entries/${encodeURIComponent(entryId)}/revisions/${encodeURIComponent(revisionId)}/transition`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    },
  );

  if (!response.ok) return response;

  let target: PublicationStatus | null = null;
  try {
    target =
      (JSON.parse(body) as { target?: PublicationStatus }).target ?? null;
  } catch {
    return response;
  }
  if (target !== "published" && target !== "archived") return response;

  // The anonymous aggregate may gain or lose this content card. It shares one
  // bounded tag across every taxonomy page because one card can affect more
  // than one published area/topic.
  revalidatePublicCompassAfterMutation(response);

  try {
    const revision = (await response.clone().json()) as {
      contentType: ContentType;
      slug: string;
      locale: unknown;
    };
    if (!isUiLocale(revision.locale)) return response;
    // `expire: 0` makes the next public request fetch the new read-model
    // immediately; the default "max" profile may serve one stale response.
    revalidateTag(publicContentCacheTag(revision.locale), { expire: 0 });
    for (const path of pathsForContentChange(
      revision.contentType,
      revision.slug,
    )) {
      revalidatePath(path);
    }
  } catch {
    // The backend mutation already succeeded. A malformed response must not
    // turn that success into a false panel error; the 5-minute tag TTL remains
    // the bounded recovery path.
  }

  return response;
}
