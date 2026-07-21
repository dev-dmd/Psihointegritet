import { resolveCtaHref } from "./cta";
import {
  contentCharacterLimits,
  templateRegistry,
  widgetPlacementRegistry,
} from "./limits";
import type {
  ContentEntity,
  ContentHealthFinding,
  ContentProvider,
  CtaReference,
  PublishGateResult,
  PublicationStatus,
  RedirectRecord,
} from "./types";
import {
  availabilityStatuses,
  bookingModes,
  indexingPolicies,
  publicationStatuses,
} from "./types";

export interface ContentValidationContext {
  provider: ContentProvider;
  isKnownPublicRoute(path: string): boolean;
}

const publicationTransitions: Record<
  PublicationStatus,
  readonly PublicationStatus[]
> = {
  draft: ["in_review"],
  in_review: ["draft", "approved"],
  approved: ["draft", "published"],
  published: ["archived"],
  archived: ["draft"],
};

const ctaActions = new Set([
  "START_MATCHING",
  "BOOK_SERVICE",
  "BOOK_THERAPIST",
  "VIEW_SERVICE",
  "VIEW_THERAPIST",
  "VIEW_PROGRAM",
  "JOIN_PROGRAM_WAITLIST",
  "OPEN_COMPANY_CONFIGURATOR",
  "VIEW_PRICING",
  "GENERAL_CONTACT",
] as const);

function finding(
  entity: Pick<ContentEntity, "type" | "id">,
  ruleId: string,
  severity: ContentHealthFinding["severity"],
  message: string,
  recommendation: string,
  field?: string,
): ContentHealthFinding {
  return {
    ruleId,
    severity,
    entityType: entity.type,
    entityId: entity.id,
    ...(field ? { field } : {}),
    message,
    recommendation,
  };
}

function redirectFinding(
  redirect: RedirectRecord,
  ruleId: string,
  message: string,
  recommendation: string,
): ContentHealthFinding {
  return {
    ruleId,
    severity: "error",
    entityType: "redirect",
    entityId: redirect.sourcePath,
    message,
    recommendation,
  };
}

export function normalizedLength(value: string): number {
  return value.trim().normalize("NFC").length;
}

export function isValidPublicationTransition(
  from: PublicationStatus,
  to: PublicationStatus,
): boolean {
  return publicationTransitions[from].includes(to);
}

function approvalsSatisfied(entity: ContentEntity): boolean {
  return entity.requiredApprovals.every((requirement) => {
    if (!requirement.required) return true;
    return (
      entity.approvalEvidence.find(
        (evidence) => evidence.capability === requirement.capability,
      )?.status === "approved"
    );
  });
}

function approvalFindings(entity: ContentEntity): ContentHealthFinding[] {
  const findings: ContentHealthFinding[] = [];

  for (const requirement of entity.requiredApprovals) {
    if (!requirement.required) continue;
    const evidence = entity.approvalEvidence.find(
      (item) => item.capability === requirement.capability,
    );
    if (!evidence) {
      findings.push(
        finding(
          entity,
          "APP-001",
          "error",
          `Nedostaje ${requirement.capability} approval evidence.`,
          "Dodati obavezni approval evidence pre objave.",
          "approvalEvidence",
        ),
      );
      continue;
    }
    if (evidence.status !== "approved") {
      findings.push(
        finding(
          entity,
          "APP-002",
          "error",
          `${requirement.capability} approval nije odobren za objavu.`,
          "Završiti odgovarajući review ili vratiti sadržaj u draft.",
          "approvalEvidence",
        ),
      );
    }
  }

  return findings;
}

function validateCta(
  entity: ContentEntity,
  cta: CtaReference,
  context: ContentValidationContext,
): ContentHealthFinding[] {
  const findings: ContentHealthFinding[] = [];
  const target = cta.targetId
    ? context.provider.getEntityById(cta.targetId)
    : null;

  if (!ctaActions.has(cta.action)) {
    findings.push(
      finding(
        entity,
        "CTA-001",
        "error",
        `CTA action ${String(cta.action)} nije u registry-ju.`,
        "Koristiti odobrenu CtaAction vrednost.",
        "ctas",
      ),
    );
    return findings;
  }

  if (cta.targetId && !target) {
    findings.push(
      finding(
        entity,
        "CTA-002",
        "error",
        `CTA target ${cta.targetId} ne postoji.`,
        "Izabrati postojeći content target.",
        "ctas",
      ),
    );
  }

  const href = resolveCtaHref(cta, context.provider);
  if (!href || !context.isKnownPublicRoute(href.split("?")[0] ?? "")) {
    findings.push(
      finding(
        entity,
        "CTA-003",
        "error",
        "CTA ne može da generiše kanonsku internu putanju.",
        "Koristiti registry action i kompatibilan target.",
        "ctas",
      ),
    );
  }

  if (entity.publicationStatus === "published" && target) {
    if (target.publicationStatus !== "published") {
      findings.push(
        finding(
          entity,
          "CTA-002",
          "error",
          `Objavljen CTA vodi na neobjavljen target ${target.id}.`,
          "Objaviti target ili ukloniti CTA iz javnog sadržaja.",
          "ctas",
        ),
      );
    }
    if (
      (cta.action === "BOOK_SERVICE" || cta.action === "BOOK_THERAPIST") &&
      (target.availabilityStatus !== "active" ||
        target.bookingMode === "disabled")
    ) {
      findings.push(
        finding(
          entity,
          "BOOK-002",
          "error",
          "Booking CTA vodi na neaktivan ili booking-disabled target.",
          "Isključiti CTA ili uskladiti availability i BookingMode.",
          "ctas",
        ),
      );
    }
  }

  return findings;
}

export function validateEntity(
  entity: ContentEntity,
  context: ContentValidationContext,
): ContentHealthFinding[] {
  const findings: ContentHealthFinding[] = [];
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  if (!entity.id.trim()) {
    findings.push(
      finding(
        entity,
        "MODEL-001",
        "error",
        "Nedostaje stabilan content ID.",
        "Dodati stabilan ID.",
      ),
    );
  }
  if (
    !slugPattern.test(entity.canonicalSlug) ||
    normalizedLength(entity.canonicalSlug) > contentCharacterLimits.slug
  ) {
    findings.push(
      finding(
        entity,
        "MODEL-002",
        "error",
        "Canonical slug nije validan.",
        "Koristiti lowercase latinicu, brojeve i crtice unutar dozvoljenog limita.",
        "canonicalSlug",
      ),
    );
  }
  if (!context.isKnownPublicRoute(entity.route)) {
    findings.push(
      finding(
        entity,
        "ROUTE-001",
        "error",
        `Ruta ${entity.route} nije registrovana kao javna ruta.`,
        "Dodati postojeću public rutu ili ispraviti content route.",
        "route",
      ),
    );
  }
  if (!publicationStatuses.includes(entity.publicationStatus)) {
    findings.push(
      finding(
        entity,
        "LIFE-001",
        "error",
        "Publication status nije poznat.",
        "Koristiti lifecycle contract.",
      ),
    );
  }
  if (!indexingPolicies.includes(entity.indexingPolicy)) {
    findings.push(
      finding(
        entity,
        "DISC-003",
        "error",
        "Indexing policy nije poznat.",
        "Koristiti index ili noindex.",
      ),
    );
  }
  if (
    entity.availabilityStatus !== undefined &&
    !availabilityStatuses.includes(entity.availabilityStatus)
  ) {
    findings.push(
      finding(
        entity,
        "MODEL-001",
        "error",
        "Availability status nije poznat.",
        "Koristiti availability contract.",
      ),
    );
  }
  if (
    entity.bookingMode !== undefined &&
    !bookingModes.includes(entity.bookingMode)
  ) {
    findings.push(
      finding(
        entity,
        "BOOK-001",
        "error",
        "Booking mode nije dozvoljen.",
        "Koristiti request, slot_request ili disabled.",
      ),
    );
  }
  if (entity.bookingMode === "slot_request" && !entity.bookingDisclaimerKey) {
    findings.push(
      finding(
        entity,
        "BOOK-003",
        "warning",
        "slot_request nema ključ za obavezni request-first disclaimer.",
        "Prikazati da izbor slota nije potvrđena rezervacija.",
        "bookingDisclaimerKey",
      ),
    );
  }

  const template = templateRegistry[entity.template];
  const allowedSlots = new Set([
    ...template.requiredSlots,
    ...template.optionalSlots,
  ]);
  for (const requiredSlot of template.requiredSlots) {
    if (!entity.slots.includes(requiredSlot)) {
      findings.push(
        finding(
          entity,
          "MODEL-003",
          "error",
          `Nedostaje obavezni template slot ${requiredSlot}.`,
          "Vratiti obavezni slot u odobreni template.",
          "slots",
        ),
      );
    }
  }
  for (const slot of entity.slots) {
    if (!allowedSlots.has(slot)) {
      findings.push(
        finding(
          entity,
          "MODEL-003",
          "error",
          `Slot ${slot} nije dozvoljen za template ${entity.template}.`,
          "Koristiti samo odobrene template slotove.",
          "slots",
        ),
      );
    }
  }
  const optionalSlotCount = entity.slots.filter((slot) =>
    template.optionalSlots.includes(slot),
  ).length;
  if (optionalSlotCount > template.maxOptionalSections) {
    findings.push(
      finding(
        entity,
        "LIMIT-002",
        "error",
        "Broj opcionih sekcija prelazi ograničenje template-a.",
        "Ukloniti ili podeliti opcionu sekciju u odobrenom modelu.",
        "slots",
      ),
    );
  }

  for (const textField of entity.textFields) {
    if (
      normalizedLength(textField.value) >
      contentCharacterLimits[textField.limit]
    ) {
      findings.push(
        finding(
          entity,
          "LIMIT-001",
          "error",
          `${textField.field} prelazi limit od ${contentCharacterLimits[textField.limit]} karaktera.`,
          "Skratiti sadržaj bez promene fonta ili layouta.",
          textField.field,
        ),
      );
    }
  }
  if (!entity.seo.title.trim() || !entity.seo.description.trim()) {
    findings.push(
      finding(
        entity,
        "DISC-001",
        "error",
        "Indexabilan sadržaj nema title ili description.",
        "Popuniti SEO title i description.",
        "seo",
      ),
    );
  }
  if (!entity.seo.ogImageAssetId) {
    findings.push(
      finding(
        entity,
        "DISC-004",
        "warning",
        "Nije definisan poseban OG asset; koristi se sistemski fallback.",
        "Potvrditi fallback ili dodati odobreni OG asset.",
        "seo.ogImageAssetId",
      ),
    );
  }
  if (entity.asset && !entity.asset.decorative) {
    if (!entity.asset.alt.trim()) {
      findings.push(
        finding(
          entity,
          "ASSET-003",
          "error",
          "Smislena slika nema alt tekst.",
          "Dodati opisni alt tekst.",
          "asset.alt",
        ),
      );
    } else if (
      normalizedLength(entity.asset.alt) > contentCharacterLimits.imageAlt
    ) {
      findings.push(
        finding(
          entity,
          "LIMIT-001",
          "error",
          "Alt tekst prelazi dozvoljeni limit.",
          "Skratiti alt tekst.",
          "asset.alt",
        ),
      );
    }
  }
  for (const widget of entity.widgets) {
    if (!widgetPlacementRegistry[widget.id]?.includes(widget.placement)) {
      findings.push(
        finding(
          entity,
          "WIDGET-001",
          "error",
          `Widget ${widget.id} nije dozvoljen u placement-u ${widget.placement}.`,
          "Koristiti odobreni widget placement.",
          "widgets",
        ),
      );
    }
  }
  for (const cta of entity.ctas) {
    if (normalizedLength(cta.label) > contentCharacterLimits.ctaLabel) {
      findings.push(
        finding(
          entity,
          "LIMIT-001",
          "error",
          "CTA label prelazi dozvoljeni limit.",
          "Skratiti CTA labelu.",
          "ctas",
        ),
      );
    }
    findings.push(...validateCta(entity, cta, context));
  }

  if (entity.publicationStatus === "published") {
    findings.push(...approvalFindings(entity));
  }
  if (
    entity.publicationStatus === "archived" &&
    entity.ctas.some((cta) => resolveCtaHref(cta, context.provider) !== null)
  ) {
    findings.push(
      finding(
        entity,
        "LIFE-003",
        "error",
        "Archived sadržaj zadržava aktivan CTA.",
        "Ukloniti CTA iz arhiviranog sadržaja.",
        "ctas",
      ),
    );
  }

  return findings;
}

export function evaluatePublishGate(
  entity: ContentEntity,
  context: ContentValidationContext,
): PublishGateResult {
  const findings = validateEntity(entity, context);
  const errors = findings.filter((item) => item.severity === "error");
  const approvalIsReady = approvalsSatisfied(entity);
  const canApprove = errors.length === 0 && approvalIsReady;
  const canPublish = canApprove && entity.indexingPolicy !== undefined;
  const canActivate =
    entity.availabilityStatus !== "active" ||
    (canPublish && entity.bookingMode !== "disabled");

  return { canApprove, canPublish, canActivate, findings };
}

export function isSitemapEligible(
  entity: ContentEntity,
  context: ContentValidationContext,
): boolean {
  return (
    entity.publicationStatus === "published" &&
    entity.indexingPolicy === "index" &&
    context.isKnownPublicRoute(entity.route) &&
    !entity.route.includes("?")
  );
}

export function validateRedirectRegistry(
  redirects: readonly RedirectRecord[],
  context: ContentValidationContext,
): ContentHealthFinding[] {
  const findings: ContentHealthFinding[] = [];
  const bySource = new Map<string, RedirectRecord>();
  const internalPath = /^\/(?:[a-z0-9-]+\/)*[a-z0-9-]*$/;

  for (const redirect of redirects) {
    if (
      !internalPath.test(redirect.sourcePath) ||
      normalizedLength(redirect.sourcePath) >
        contentCharacterLimits.redirectPath
    ) {
      findings.push(
        redirectFinding(
          redirect,
          "REDIRECT-001",
          "Redirect source nije validna interna putanja.",
          "Koristiti normalizovanu internu putanju.",
        ),
      );
    }
    if (bySource.has(redirect.sourcePath)) {
      findings.push(
        redirectFinding(
          redirect,
          "REDIRECT-001",
          "Redirect source je dupliran.",
          "Zadržati jedan redirect zapis po izvoru.",
        ),
      );
    }
    bySource.set(redirect.sourcePath, redirect);

    if (redirect.status === 301 || redirect.status === 308) {
      if (!redirect.targetPath || !internalPath.test(redirect.targetPath)) {
        findings.push(
          redirectFinding(
            redirect,
            "REDIRECT-001",
            "Trajni redirect nema validan interni target.",
            "Dodati stvarnu internu zamenu sadržaja.",
          ),
        );
      } else if (!context.isKnownPublicRoute(redirect.targetPath)) {
        findings.push(
          redirectFinding(
            redirect,
            "ROUTE-001",
            "Redirect target nije javna kanonska ruta.",
            "Usmeriti redirect ka postojećoj public ruti.",
          ),
        );
      }
    }
  }

  for (const redirect of redirects) {
    const visited = new Set<string>([redirect.sourcePath]);
    let current = redirect.targetPath;
    while (current && bySource.has(current)) {
      if (visited.has(current)) {
        findings.push(
          redirectFinding(
            redirect,
            "REDIRECT-002",
            "Redirect registry sadrži petlju.",
            "Normalizovati redirect na jedan konačni target.",
          ),
        );
        break;
      }
      visited.add(current);
      current = bySource.get(current)?.targetPath;
      if (current) {
        findings.push(
          redirectFinding(
            redirect,
            "REDIRECT-002",
            "Redirect registry sadrži lanac.",
            "Usmeriti source direktno na konačni target.",
          ),
        );
        break;
      }
    }
  }

  return findings;
}

export function validateContentCollection(
  entities: readonly ContentEntity[],
  redirects: readonly RedirectRecord[],
  context: ContentValidationContext,
): ContentHealthFinding[] {
  const findings: ContentHealthFinding[] = [];
  const ids = new Set<string>();
  const canonicalKeys = new Set<string>();

  for (const entity of entities) {
    if (ids.has(entity.id)) {
      findings.push(
        finding(
          entity,
          "MODEL-002",
          "error",
          "Content ID je dupliran.",
          "Koristiti jedinstven stabilan ID.",
          "id",
        ),
      );
    }
    ids.add(entity.id);

    const canonicalKey = `${entity.type}:${entity.canonicalSlug}`;
    if (canonicalKeys.has(canonicalKey)) {
      findings.push(
        finding(
          entity,
          "MODEL-002",
          "error",
          "Canonical slug je dupliran za isti content type.",
          "Razdvojiti canonical slugove.",
          "canonicalSlug",
        ),
      );
    }
    canonicalKeys.add(canonicalKey);
    findings.push(...validateEntity(entity, context));
  }

  findings.push(...validateRedirectRegistry(redirects, context));
  return findings;
}
