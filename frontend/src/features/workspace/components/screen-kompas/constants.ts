import type { StatusBadgeTone } from "@/components/panel/status-badge";
import type { ApprovalCapability } from "@/lib/content-governance/types";

import type { TaxonomyAxis, TaxonomyStatus } from "../../taxonomy-api";
import type { KompasTab } from "./types";

export const TABS: { id: KompasTab; label: string }[] = [
  { id: "areas", label: "Oblasti" },
  { id: "topics", label: "Teme" },
  { id: "audiences", label: "Publike" },
  { id: "goals", label: "Ciljevi sadržaja" },
  { id: "links", label: "Povezivanja" },
  { id: "review", label: "Pregled i odobrenja" },
];

export const STATUS_META: Record<
  TaxonomyStatus,
  { label: string; tone: StatusBadgeTone }
> = {
  draft: { label: "Radna verzija", tone: "neutral" },
  in_review: { label: "U pregledu", tone: "wait" },
  approved: { label: "Odobreno", tone: "amber" },
  published: { label: "Objavljeno", tone: "ok" },
  archived: { label: "Arhivirano", tone: "soft" },
};

export const APPROVAL_LABELS: Record<ApprovalCapability, string> = {
  clinical: "Stručno",
  legal: "Pravno",
  business: "Poslovno",
};

/** D-048: `subscriber`/`purchased` are shown as visibly disabled so the access
 * vocabulary reads complete, but they are not DB rows and cannot be selected
 * before the R5 entitlement evaluator exists. */
export const PLANNED_ACCESS_OPTIONS = [
  { stableId: "subscriber", label: "Pretplata" },
  { stableId: "purchased", label: "Kupljen materijal" },
] as const;

export const TERM_APPROVAL_CAPABILITIES: ApprovalCapability[] = [
  "clinical",
  "business",
];
export const LINK_APPROVAL_CAPABILITIES: ApprovalCapability[] = ["clinical"];
export const ROUTE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const AXIS_BY_TAB: Partial<Record<KompasTab, TaxonomyAxis>> = {
  areas: "topic_group",
  topics: "topic",
  audiences: "audience",
  goals: "content_goal",
};

export const TAB_COPY: Record<
  Exclude<KompasTab, "links" | "review">,
  { title: string; description: string; empty: string }
> = {
  areas: {
    title: "Oblasti",
    description:
      "Široke javne grupe koje ljudima pomažu da započnu istraživanje. Ovo je Kompas oblast, ne Intake oblast podrške.",
    empty: "Još nema oblasti u registru.",
  },
  topics: {
    title: "Teme",
    description:
      "Konkretnije teme unutar jedne oblasti, sa kontrolisanim putem ka sadržaju ili stručnoj podršci.",
    empty: "Još nema konkretnih tema u registru.",
  },
  audiences: {
    title: "Publike",
    description:
      "Kontrolisane vrednosti koje opisuju kome je sadržaj prvenstveno namenjen.",
    empty: "Još nema definisanih publika.",
  },
  goals: {
    title: "Ciljevi sadržaja",
    description:
      "Šta korisnik može da dobije iz sadržaja: razumevanje, praktičan korak ili pripremu za razgovor.",
    empty: "Još nema definisanih ciljeva sadržaja.",
  },
};
