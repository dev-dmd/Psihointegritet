import {
  companyFaqItems,
  companyPlanCards,
  type CompanyPlanCard,
} from "@/content/company";
import { faqItems } from "@/content/homepage";
import { groupPrograms } from "@/content/programs";
import { serviceCatalog, sessionPackages } from "@/content/services";
import { siteSettings } from "@/content/site-settings";
import { therapists } from "@/content/therapists";

import type {
  ApprovalCapability,
  ApprovalEvidence,
  ApprovalRequirement,
  ContentEntity,
  ContentEntityBase,
  ContentEntityOfType,
  ContentProvider,
  CtaReference,
  JsonLdKind,
  PublicationStatus,
  RedirectRecord,
  StaticPageEntity,
  WidgetPlacement,
} from "./types";

/**
 * The existing website is a staging/pre-launch surface. R1.5 turns these
 * records into `published` only after the relevant human approvals exist.
 */
const prelaunchStatus: PublicationStatus = "in_review";

const publicRoutePatterns = [
  "/",
  "/o-nama",
  "/tim",
  "/tim/[slug]",
  "/usluge",
  "/usluge/[slug]",
  "/radionice",
  "/radionice/[slug]",
  "/podrska-roditeljima",
  "/cene",
  "/znanje",
  "/rad-sa-kompanijama",
  "/kontakt",
  "/pronadji-podrsku",
  "/zakazi",
] as const;

export type PublicRoutePattern = (typeof publicRoutePatterns)[number];

export function isKnownPublicRoute(path: string): boolean {
  if (publicRoutePatterns.includes(path as PublicRoutePattern)) return true;

  return publicRoutePatterns.some((pattern) => {
    if (!pattern.includes("[slug]")) return false;
    const prefix = pattern.slice(0, pattern.indexOf("[slug]"));
    const suffix = path.slice(prefix.length);
    return (
      path.startsWith(prefix) && suffix.length > 0 && !suffix.includes("/")
    );
  });
}

function requirements(
  ...capabilities: ApprovalCapability[]
): readonly ApprovalRequirement[] {
  return capabilities.map((capability) => ({ capability, required: true }));
}

function pendingEvidence(
  required: readonly ApprovalRequirement[],
): readonly ApprovalEvidence[] {
  return required.map(({ capability }) => ({ capability, status: "pending" }));
}

type BaseInput = Pick<
  ContentEntityBase,
  | "id"
  | "type"
  | "route"
  | "canonicalSlug"
  | "indexingPolicy"
  | "template"
  | "slots"
  | "seo"
  | "textFields"
  | "ctas"
  | "widgets"
  | "jsonLdKinds"
> & {
  requiredApprovals?: readonly ApprovalRequirement[];
  breadcrumbs?: ContentEntityBase["breadcrumbs"];
  availabilityStatus?: ContentEntityBase["availabilityStatus"];
  asset?: ContentEntityBase["asset"];
  bookingMode?: ContentEntityBase["bookingMode"];
  bookingDisclaimerKey?: string;
};

function base(input: BaseInput): ContentEntityBase {
  const {
    requiredApprovals = [],
    breadcrumbs,
    availabilityStatus,
    asset,
    bookingMode,
    bookingDisclaimerKey,
    ...requiredFields
  } = input;

  return {
    ...requiredFields,
    publicationStatus: prelaunchStatus,
    requiredApprovals,
    approvalEvidence: pendingEvidence(requiredApprovals),
    ...(breadcrumbs ? { breadcrumbs } : {}),
    ...(availabilityStatus ? { availabilityStatus } : {}),
    ...(asset ? { asset } : {}),
    ...(bookingMode ? { bookingMode } : {}),
    ...(bookingDisclaimerKey ? { bookingDisclaimerKey } : {}),
  };
}

type StaticPageInput = Omit<BaseInput, "type"> & {
  h1: string;
  faq?: StaticPageEntity["faq"];
};

function staticPage(input: StaticPageInput): StaticPageEntity {
  const { h1, faq, ...baseInput } = input;
  const entity = base({ ...baseInput, type: "static_page" });

  return { ...entity, type: "static_page", h1, ...(faq ? { faq } : {}) };
}

const matchingWidget: readonly WidgetPlacement[] = [
  { id: "matching", placement: "guide_cta", enabled: true },
];

const bookingWidget: readonly WidgetPlacement[] = [
  { id: "booking", placement: "booking", enabled: true },
];

const noWidgets: readonly WidgetPlacement[] = [];
const noCtas: readonly CtaReference[] = [];
const noJsonLd: readonly JsonLdKind[] = [];

function serviceSeoDescription(
  service: (typeof serviceCatalog)[number],
): string {
  return `${service.name} - ${service.format}, ${service.duration}.`;
}

const staticPages: readonly StaticPageEntity[] = [
  staticPage({
    id: "page:home",
    route: "/",
    canonicalSlug: "pocetna",
    indexingPolicy: "index",
    template: "static_information",
    slots: ["hero", "intro", "prose", "cta", "faq"],
    h1: siteSettings.name,
    seo: {
      title: "Psihointegritet",
      description:
        "Psihoterapija, savetovanje i programi podrške online i uživo u Nišu i Leskovcu.",
    },
    textFields: [
      { field: "h1", value: siteSettings.name, limit: "pageH1" },
      {
        field: "heroLead",
        value:
          "Psihoterapija, savetovanje i programi podrške online i uživo u Nišu i Leskovcu.",
        limit: "heroLead",
      },
      ...faqItems.flatMap((item) => [
        {
          field: `faq.${item.id}.question`,
          value: item.question,
          limit: "faqQuestion" as const,
        },
        {
          field: `faq.${item.id}.answer`,
          value: item.answer,
          limit: "faqAnswer" as const,
        },
      ]),
    ],
    ctas: [
      { label: "Pronađite podršku", action: "START_MATCHING" },
      { label: "Rad sa kompanijama", action: "OPEN_COMPANY_CONFIGURATOR" },
    ],
    widgets: matchingWidget,
    jsonLdKinds: ["organization", "website", "faq"],
    faq: faqItems.map(({ question, answer }) => ({ question, answer })),
  }),
  staticPage({
    id: "page:o-nama",
    route: "/o-nama",
    canonicalSlug: "o-nama",
    indexingPolicy: "index",
    template: "static_information",
    slots: ["hero", "intro", "prose", "cta"],
    h1: "Digitalni centar za mentalno zdravlje",
    seo: {
      title: "O nama",
      description:
        "Psihointegritet pruža podršku online i uživo u Nišu i Leskovcu.",
    },
    textFields: [
      {
        field: "h1",
        value: "Digitalni centar za mentalno zdravlje",
        limit: "pageH1",
      },
    ],
    ctas: [
      {
        label: "Upoznajte tim",
        action: "VIEW_THERAPIST",
        targetId: "therapist:anja-stamenkovic",
      },
    ],
    widgets: noWidgets,
    jsonLdKinds: noJsonLd,
  }),
  staticPage({
    id: "page:tim",
    route: "/tim",
    canonicalSlug: "tim",
    indexingPolicy: "index",
    template: "static_information",
    slots: ["hero", "intro", "prose", "cta"],
    h1: "Naš tim",
    seo: {
      title: "Naš tim",
      description:
        "Upoznajte terapeute Psihointegriteta, oblasti rada i dostupne formate.",
    },
    textFields: [{ field: "h1", value: "Naš tim", limit: "pageH1" }],
    ctas: [{ label: "Pronađite podršku", action: "START_MATCHING" }],
    widgets: matchingWidget,
    jsonLdKinds: noJsonLd,
  }),
  staticPage({
    id: "page:usluge",
    route: "/usluge",
    canonicalSlug: "usluge",
    indexingPolicy: "index",
    template: "static_information",
    slots: ["hero", "intro", "prose", "cta"],
    h1: "Usluge",
    seo: {
      title: "Usluge",
      description:
        "Individualna psihoterapija, bračno i roditeljsko savetovanje online i uživo.",
    },
    textFields: [{ field: "h1", value: "Usluge", limit: "pageH1" }],
    ctas: [{ label: "Pogledajte cene", action: "VIEW_PRICING" }],
    widgets: noWidgets,
    jsonLdKinds: noJsonLd,
  }),
  staticPage({
    id: "page:radionice",
    route: "/radionice",
    canonicalSlug: "radionice",
    indexingPolicy: "index",
    template: "static_information",
    slots: ["hero", "intro", "prose"],
    h1: "Radionice i programi",
    seo: {
      title: "Radionice i programi",
      description: "Najavljeni grupni programi i radionice Psihointegriteta.",
    },
    textFields: [
      { field: "h1", value: "Radionice i programi", limit: "pageH1" },
    ],
    ctas: noCtas,
    widgets: noWidgets,
    jsonLdKinds: noJsonLd,
  }),
  staticPage({
    id: "page:podrska-roditeljima",
    route: "/podrska-roditeljima",
    canonicalSlug: "podrska-roditeljima",
    indexingPolicy: "index",
    template: "audience_page",
    slots: [
      "hero",
      "audience",
      "first_step",
      "related",
      "cta",
      "program_cards",
    ],
    h1: "Roditeljsko savetovanje i programi",
    seo: {
      title: "Podrška roditeljima",
      description:
        "Roditeljsko savetovanje i najavljeni programi podrške online i uživo.",
    },
    textFields: [
      {
        field: "h1",
        value: "Roditeljsko savetovanje i programi",
        limit: "pageH1",
      },
    ],
    ctas: [
      {
        label: "Zakaži termin",
        action: "BOOK_SERVICE",
        targetId: "service:roditeljsko-savetovanje",
      },
    ],
    widgets: [{ id: "booking", placement: "service", enabled: true }],
    jsonLdKinds: noJsonLd,
    requiredApprovals: requirements("clinical", "legal", "business"),
  }),
  staticPage({
    id: "page:cene",
    route: "/cene",
    canonicalSlug: "cene",
    indexingPolicy: "index",
    template: "pricing_page",
    slots: [
      "service_prices",
      "packages",
      "notice",
      "cta",
      "program_references",
    ],
    h1: "Cene usluga i programa",
    seo: {
      title: "Cene",
      description:
        "Okvirne cene usluga, paketa i najavljenih programa Psihointegriteta.",
    },
    textFields: [
      { field: "h1", value: "Cene usluga i programa", limit: "pageH1" },
    ],
    ctas: [
      {
        label: "Pošaljite zahtev",
        action: "BOOK_SERVICE",
        targetId: "service:individualna-psihoterapija",
      },
    ],
    widgets: noWidgets,
    jsonLdKinds: noJsonLd,
    requiredApprovals: requirements("business"),
  }),
  staticPage({
    id: "page:znanje",
    route: "/znanje",
    canonicalSlug: "znanje",
    indexingPolicy: "index",
    template: "static_information",
    slots: ["hero", "intro", "prose"],
    h1: "Znanje i resursi",
    seo: {
      title: "Znanje i resursi",
      description:
        "Stručni tekstovi, vodiči i edukativni materijali u pripremi.",
    },
    textFields: [{ field: "h1", value: "Znanje i resursi", limit: "pageH1" }],
    ctas: noCtas,
    widgets: noWidgets,
    jsonLdKinds: noJsonLd,
  }),
  staticPage({
    id: "page:rad-sa-kompanijama",
    route: "/rad-sa-kompanijama",
    canonicalSlug: "rad-sa-kompanijama",
    indexingPolicy: "index",
    template: "company_page",
    slots: [
      "hero",
      "support_types",
      "plans",
      "privacy",
      "configurator_cta",
      "faq",
    ],
    h1: "Rad sa kompanijama",
    seo: {
      title: "Rad sa kompanijama",
      description:
        "Radionice, edukacije i programi podrške za timove i zaposlene.",
    },
    textFields: [
      { field: "h1", value: "Rad sa kompanijama", limit: "pageH1" },
      ...companyFaqItems.flatMap((item, index) => [
        {
          field: `faq.${index}.question`,
          value: item.question,
          limit: "faqQuestion" as const,
        },
        {
          field: `faq.${index}.answer`,
          value: item.answer,
          limit: "faqAnswer" as const,
        },
      ]),
    ],
    ctas: [
      { label: "Konfigurišite program", action: "OPEN_COMPANY_CONFIGURATOR" },
    ],
    widgets: [
      { id: "company_configurator", placement: "company", enabled: true },
    ],
    jsonLdKinds: noJsonLd,
    requiredApprovals: requirements("business"),
  }),
  staticPage({
    id: "page:kontakt",
    route: "/kontakt",
    canonicalSlug: "kontakt",
    indexingPolicy: "index",
    template: "static_information",
    slots: ["hero", "intro", "prose", "cta"],
    h1: "Kako možemo pomoći?",
    seo: {
      title: "Kontakt",
      description:
        "Kontakt Psihointegriteta i jasni putevi za termin ili programe za kompanije.",
    },
    textFields: [
      { field: "h1", value: "Kako možemo pomoći?", limit: "pageH1" },
    ],
    ctas: [
      {
        label: "Pošaljite zahtev",
        action: "BOOK_SERVICE",
        targetId: "service:individualna-psihoterapija",
      },
    ],
    widgets: noWidgets,
    jsonLdKinds: noJsonLd,
  }),
  staticPage({
    id: "page:pronadji-podrsku",
    route: "/pronadji-podrsku",
    canonicalSlug: "pronadji-podrsku",
    indexingPolicy: "noindex",
    template: "static_information",
    slots: ["hero", "intro", "cta"],
    h1: "Pronađi podršku",
    seo: {
      title: "Pronađi podršku",
      description:
        "Kroz kratka pitanja dobijte objašnjiv predlog podrške i terapeuta.",
    },
    textFields: [{ field: "h1", value: "Pronađi podršku", limit: "pageH1" }],
    ctas: noCtas,
    widgets: matchingWidget,
    jsonLdKinds: noJsonLd,
  }),
  staticPage({
    id: "page:zakazi",
    route: "/zakazi",
    canonicalSlug: "zakazi",
    indexingPolicy: "noindex",
    template: "static_information",
    slots: ["hero", "intro", "cta"],
    h1: "Pošaljite zahtev za termin",
    seo: {
      title: "Zakaži termin",
      description:
        "Pošaljite zahtev za termin; dostupnost proverava terapeut ili član tima.",
    },
    textFields: [
      { field: "h1", value: "Pošaljite zahtev za termin", limit: "pageH1" },
    ],
    ctas: noCtas,
    widgets: bookingWidget,
    jsonLdKinds: noJsonLd,
    requiredApprovals: requirements("legal", "business"),
  }),
];

const serviceEntities: readonly ContentEntity[] = serviceCatalog.map(
  (service) => {
    const therapistIds = therapists
      .filter((therapist) =>
        therapist.bookingServiceSlugs.includes(service.slug),
      )
      .map((therapist) => `therapist:${therapist.slug}`);
    const entity = base({
      id: `service:${service.slug}`,
      type: "service",
      route: `/usluge/${service.slug}`,
      canonicalSlug: service.slug,
      indexingPolicy: "index",
      availabilityStatus: "active",
      template: "service_detail",
      slots: [
        "hero",
        "facts",
        "description",
        "first_step",
        "related",
        "cta",
        "packages",
        "faq",
      ],
      requiredApprovals: requirements("clinical", "business"),
      seo: {
        title: service.name,
        description: serviceSeoDescription(service),
      },
      textFields: [
        { field: "name", value: service.name, limit: "cardTitle" },
        {
          field: "description",
          value: service.description,
          limit: "serviceDescription",
        },
        { field: "seo.title", value: service.name, limit: "seoTitle" },
        {
          field: "seo.description",
          value: serviceSeoDescription(service),
          limit: "seoDescription",
        },
      ],
      ctas: [
        {
          label: "Zakaži termin",
          action: "BOOK_SERVICE",
          targetId: `service:${service.slug}`,
        },
      ],
      widgets: [{ id: "booking", placement: "service", enabled: true }],
      jsonLdKinds: ["service", "breadcrumb"],
      breadcrumbs: [
        { label: "Početna", path: "/" },
        { label: "Usluge", path: "/usluge" },
        { label: service.name, path: `/usluge/${service.slug}` },
      ],
      bookingMode: "request",
    });

    return { ...entity, type: "service", source: service, therapistIds };
  },
);

const therapistEntities: readonly ContentEntity[] = therapists.map(
  (therapist) => {
    const fullBio = therapist.bio.join(" ");
    const entity = base({
      id: `therapist:${therapist.slug}`,
      type: "therapist",
      route: `/tim/${therapist.slug}`,
      canonicalSlug: therapist.slug,
      indexingPolicy: "index",
      availabilityStatus: "active",
      template: "therapist_profile",
      slots: ["hero", "approach", "areas", "services", "bio", "cta"],
      requiredApprovals: requirements("clinical", "business"),
      seo: {
        title: therapist.name,
        description: therapist.cardExcerpt,
      },
      textFields: [
        { field: "name", value: therapist.name, limit: "cardTitle" },
        {
          field: "title",
          value: therapist.title,
          limit: "therapistPublicTitle",
        },
        {
          field: "cardExcerpt",
          value: therapist.cardExcerpt,
          limit: "therapistCardExcerpt",
        },
        { field: "quote", value: therapist.quote, limit: "therapistQuote" },
        ...therapist.bio.map((paragraph, index) => ({
          field: `bio.${index}`,
          value: paragraph,
          limit: "therapistBioParagraph" as const,
        })),
        { field: "bio", value: fullBio, limit: "therapistFullBio" },
        { field: "seo.title", value: therapist.name, limit: "seoTitle" },
        {
          field: "seo.description",
          value: therapist.cardExcerpt,
          limit: "seoDescription",
        },
      ],
      ctas: [
        {
          label: "Zakaži termin",
          action: "BOOK_THERAPIST",
          targetId: `therapist:${therapist.slug}`,
        },
      ],
      widgets: [{ id: "booking", placement: "therapist", enabled: true }],
      jsonLdKinds: ["person"],
      asset: {
        assetId: therapist.image,
        alt: `Portret terapeuta ${therapist.name}`,
      },
      bookingMode: "request",
    });

    return { ...entity, type: "therapist", source: therapist };
  },
);

const programEntities: readonly ContentEntity[] = groupPrograms.map(
  (program) => {
    const entity = base({
      id: `program:${program.slug}`,
      type: "program",
      route: `/radionice/${program.slug}`,
      canonicalSlug: program.slug,
      indexingPolicy: "index",
      availabilityStatus: "coming_soon",
      template: "program_detail",
      slots: ["hero", "facts", "audience", "format", "status"],
      requiredApprovals: requirements("business", "clinical"),
      seo: {
        title: program.title,
        description: `${program.audience} ${program.sessions}`,
      },
      textFields: [
        { field: "title", value: program.title, limit: "cardTitle" },
        {
          field: "audience",
          value: program.audience,
          limit: "cardDescription",
        },
        { field: "seo.title", value: program.title, limit: "seoTitle" },
        {
          field: "seo.description",
          value: `${program.audience} ${program.sessions}`,
          limit: "seoDescription",
        },
      ],
      ctas: [{ label: "Postavite pitanje", action: "GENERAL_CONTACT" }],
      widgets: [
        { id: "program_interest", placement: "program", enabled: false },
      ],
      jsonLdKinds: ["breadcrumb"],
      breadcrumbs: [
        { label: "Početna", path: "/" },
        { label: "Radionice", path: "/radionice" },
        { label: program.title, path: `/radionice/${program.slug}` },
      ],
      bookingMode: "disabled",
    });

    return { ...entity, type: "program", source: program };
  },
);

const companyPlanEntities: readonly ContentEntity[] = companyPlanCards.map(
  (plan: CompanyPlanCard) => {
    const entity = base({
      id: `company_plan:${plan.slug}`,
      type: "company_plan",
      route: "/rad-sa-kompanijama",
      canonicalSlug: plan.slug,
      indexingPolicy: "noindex",
      availabilityStatus: "coming_soon",
      template: "company_page",
      slots: ["hero", "support_types", "plans", "privacy", "configurator_cta"],
      requiredApprovals: requirements("business"),
      seo: { title: plan.title, description: plan.description },
      textFields: [
        { field: "title", value: plan.title, limit: "cardTitle" },
        {
          field: "description",
          value: plan.description,
          limit: "cardDescription",
        },
      ],
      ctas: [
        {
          label: "Konfigurišite program",
          action: "OPEN_COMPANY_CONFIGURATOR",
          targetId: `company_plan:${plan.slug}`,
        },
      ],
      widgets: [
        { id: "company_configurator", placement: "company", enabled: true },
      ],
      jsonLdKinds: noJsonLd,
    });

    return { ...entity, type: "company_plan", source: plan };
  },
);

const packageEntities: readonly ContentEntity[] = sessionPackages.map(
  (pack) => {
    const entity = base({
      id: `package_offer:${pack.sessions}`,
      type: "package_offer",
      route: "/cene",
      canonicalSlug: `paket-${pack.sessions}`,
      indexingPolicy: "noindex",
      availabilityStatus: "coming_soon",
      template: "pricing_page",
      slots: ["service_prices", "packages", "notice", "cta"],
      requiredApprovals: requirements("business"),
      seo: {
        title: `${pack.sessions} individualnih seansi`,
        description: `Informativni paket od ${pack.sessions} individualnih seansi.`,
      },
      textFields: [
        {
          field: "title",
          value: `${pack.sessions} individualnih seansi`,
          limit: "cardTitle",
        },
        { field: "deadline", value: pack.deadline, limit: "cardDescription" },
      ],
      ctas: [{ label: "Pogledajte cene", action: "VIEW_PRICING" }],
      widgets: noWidgets,
      jsonLdKinds: noJsonLd,
      bookingMode: "disabled",
    });

    return { ...entity, type: "package_offer", source: pack };
  },
);

export const redirectRegistry: readonly RedirectRecord[] = [
  {
    sourcePath: "/zakazivanje",
    targetPath: "/zakazi",
    status: 308,
    reason: "Kanonska booking ruta je /zakazi.",
  },
];

export const staticContentEntities: readonly ContentEntity[] = [
  ...staticPages,
  ...serviceEntities,
  ...therapistEntities,
  ...programEntities,
  ...companyPlanEntities,
  ...packageEntities,
];

class StaticContentProvider implements ContentProvider {
  private readonly entitiesById = new Map(
    staticContentEntities.map((entity) => [entity.id, entity]),
  );

  private readonly redirectsBySource = new Map(
    redirectRegistry.map((redirect) => [redirect.sourcePath, redirect]),
  );

  getPageByRoute(route: string): ContentEntity | null {
    const staticPage = staticPages.find((page) => page.route === route);
    if (staticPage) return staticPage;

    return (
      staticContentEntities.find((entity) => entity.route === route) ?? null
    );
  }

  getEntity<T extends ContentEntity["type"]>(
    type: T,
    id: string,
  ): ContentEntityOfType<T> | null {
    const entity = this.entitiesById.get(id);
    return entity?.type === type ? (entity as ContentEntityOfType<T>) : null;
  }

  getEntityById(id: string): ContentEntity | null {
    return this.entitiesById.get(id) ?? null;
  }

  listPublished(input: { type?: ContentEntity["type"] } = {}): ContentEntity[] {
    return staticContentEntities.filter(
      (entity) =>
        entity.publicationStatus === "published" &&
        (input.type === undefined || entity.type === input.type),
    );
  }

  listAll(): ContentEntity[] {
    return [...staticContentEntities];
  }

  getRedirect(sourcePath: string): RedirectRecord | null {
    return this.redirectsBySource.get(sourcePath) ?? null;
  }
}

export const staticContentProvider: ContentProvider =
  new StaticContentProvider();

export { publicRoutePatterns };
