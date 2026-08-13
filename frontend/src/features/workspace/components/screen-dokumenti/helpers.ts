import type { StatusBadgeTone } from "@/components/panel/status-badge";
import type { PlatformRouteId } from "@/lib/routes/platform-routes";

import {
  CAPABILITY_LABELS,
  CONTENT_PROBLEM_MESSAGES,
  KIND_LABELS,
  STATUS_LABELS,
  type ApprovalCapability,
  type ContentProblemCode,
  type LegalDocument,
  type RevisionStatus,
} from "../../legal-documents";
import type { ApiPublishBlock } from "../../legal-documents-api";
import type { PanelErrorResource } from "../../panel-errors";

export const ROUTE_ID = "workspace.documents" satisfies PlatformRouteId;
export const TAB_LABEL = "Dokumenti i saglasnosti";
/** Single-tenant seed org; the backend membership check owns the real value. */
const ORGANIZATION_ID = "psihointegritet";
const RESOURCE_TYPE = "legal_document";

export const STATUS_TONES: Record<RevisionStatus, StatusBadgeTone> = {
  draft: "neutral",
  in_review: "wait",
  approved: "amber",
  published: "ok",
  archived: "soft",
};

export const CAPABILITIES: ApprovalCapability[] = [
  "legal",
  "clinical",
  "business",
];

/**
 * Structured error identity (A.6). `ruleId`/`fieldPath` stay unset because
 * `checkPublishable` does not yet emit per-rule findings — known limitation
 * recorded in CMS_TODO CG-A3; CG-B2 introduces real rule-per-finding output.
 */
export function resourceFor(document: LegalDocument): PanelErrorResource {
  return {
    organizationId: ORGANIZATION_ID,
    resourceType: RESOURCE_TYPE,
    resourceId: document.documentId,
    revisionId: document.revisionId,
  };
}

/** A failed create has no document UUID yet, so its selected slug is its
 * short-lived error identity. A later successful create clears only this
 * exact reminder, not unrelated errors on the same tab. */
export function resourceForNewDocument(slug: string): PanelErrorResource {
  return {
    organizationId: ORGANIZATION_ID,
    resourceType: "legal_document_creation",
    resourceId: slug,
  };
}

/** Local mirror of `legal-documents.ts::describePublishBlock`, but reading
 * the backend's `ApiPublishBlock` (camelCase, `contentProblems`) instead of
 * the frontend `PublishBlock` union — the two shapes carry the same
 * information, just from different sides of the wire. */
export function describeApiPublishBlock(
  document: LegalDocument,
  block: ApiPublishBlock,
): { title: string; description: string; details: string[] } {
  const name = document.title.trim() || KIND_LABELS[document.kind];

  if (block.stage === "content") {
    return {
      title: `Dokument „${name}“ nije objavljen — nepotpun sadržaj`,
      description:
        "Objava je zaustavljena pre slanja jer dokumentu nedostaju obavezna polja. Ispravite navedeno pa ponovite objavu.",
      details: block.contentProblems.map(
        (code) => CONTENT_PROBLEM_MESSAGES[code as ContentProblemCode] ?? code,
      ),
    };
  }

  if (block.stage === "transition") {
    return {
      title: `Dokument „${name}“ nije objavljen — pogrešan korak u toku`,
      description: `Dokument je u stanju „${STATUS_LABELS[document.status]}“. Objaviti se može samo dokument koji je prošao pregled i dobio status „${STATUS_LABELS.approved}“.`,
      details: [],
    };
  }

  return {
    title: `Dokument „${name}“ nije objavljen — nedostaju odobrenja`,
    description:
      "Ovaj dokument nosi pravnu težinu: kada ga korisnik prihvati, upisuje se koja je verzija prikazana. Zato objava traži sva navedena odobrenja.",
    details: [
      `Nedostaje: ${block.missing.map((capability) => CAPABILITY_LABELS[capability]).join(", ")}.`,
    ],
  };
}
