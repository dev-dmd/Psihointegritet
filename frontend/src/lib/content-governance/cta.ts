import type { ContentEntity, ContentProvider, CtaReference } from "./types";

function targetSlug(target: ContentEntity | null): string | null {
  return target?.canonicalSlug ?? null;
}

export function resolveCtaHref(
  cta: CtaReference,
  provider: ContentProvider,
): string | null {
  const target = cta.targetId ? provider.getEntityById(cta.targetId) : null;

  switch (cta.action) {
    case "START_MATCHING":
      return "/pronadji-podrsku";
    case "BOOK_SERVICE": {
      if (target?.type !== "service") return null;
      return `/zakazi?service=${encodeURIComponent(targetSlug(target) ?? "")}`;
    }
    case "BOOK_THERAPIST": {
      if (target?.type !== "therapist") return null;
      return `/zakazi?therapist=${encodeURIComponent(targetSlug(target) ?? "")}`;
    }
    case "VIEW_SERVICE":
      return target?.type === "service" ? target.route : null;
    case "VIEW_THERAPIST":
      return target?.type === "therapist" ? target.route : null;
    case "VIEW_PROGRAM":
    case "JOIN_PROGRAM_WAITLIST":
      return target?.type === "program" ? target.route : null;
    case "OPEN_COMPANY_CONFIGURATOR":
      return target === null || target.type === "company_plan"
        ? "/rad-sa-kompanijama"
        : null;
    case "VIEW_PRICING":
      return "/cene";
    case "GENERAL_CONTACT":
      return "/kontakt";
  }
}
