import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type {
  PublicTaxonomyPageAggregate,
  RoutablePublicTaxonomyTerm,
} from "@/lib/compass/types";

import { PublicTaxonomyListPage } from "./public-taxonomy-list-page";
import { PublicTaxonomyPage } from "./public-taxonomy-page";

const area: RoutablePublicTaxonomyTerm = {
  termId: "00000000-0000-4000-8000-000000000001",
  axis: "topic_group",
  stableId: "area-stress",
  canonicalPath: "/kompas/oblast/stres",
  publicLabel: "Stres i preopterećenost",
  shortDescription: "Opis objavljene oblasti.",
  sortOrder: 1,
  searchTerms: ["pritisak"],
  relatedStableIds: [],
};

const topic: RoutablePublicTaxonomyTerm = {
  termId: "00000000-0000-4000-8000-000000000002",
  axis: "topic",
  stableId: "topic-burnout",
  canonicalPath: "/kompas/tema/sagorevanje",
  publicLabel: "Sagorevanje",
  shortDescription: "Opis objavljene teme.",
  parentStableId: area.stableId,
  sortOrder: 1,
  searchTerms: ["burnout"],
  relatedStableIds: [],
};

const aggregate: PublicTaxonomyPageAggregate = {
  taxonomyVersion: "kompas-taxonomy-v1",
  locale: "sr-Latn",
  term: area,
  parent: null,
  children: [topic],
  relatedTerms: [],
  contentCards: [
    {
      itemKey: "service:individualna-psihoterapija",
      contentType: "service",
      slug: "individualna-psihoterapija",
      locale: "sr-Latn",
      template: "service_detail",
      seo: {
        title: "Individualna psihoterapija",
        description: "Objavljen i anonimno dostupan sadržaj.",
      },
      contentFormat: "article",
      accessLevel: "public",
      publishedAt: "2026-08-01T12:00:00+00:00",
    },
  ],
};

describe("public Compass page renderers", () => {
  it("renders an aggregate through registry-controlled taxonomy and content links", () => {
    const { container } = render(
      <PublicTaxonomyPage aggregate={aggregate} routeKind="oblast" />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Stres i preopterećenost",
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Istražite temu/ }),
    ).toHaveAttribute("href", "/kompas/tema/sagorevanje");
    expect(
      screen.getByRole("link", { name: /Pogledajte sadržaj/ }),
    ).toHaveAttribute("href", "/usluge/individualna-psihoterapija");
    expect(
      screen.getByRole("link", { name: "Pronađite podršku" }),
    ).toHaveAttribute("href", "/pronadji-podrsku");

    const jsonLd = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(jsonLd?.textContent).toContain('"@type":"BreadcrumbList"');
    expect(jsonLd?.textContent).not.toContain("CollectionPage");
  });

  it("renders the topic collection with local-search input and parent label", () => {
    render(
      <PublicTaxonomyListPage
        routeKind="tema"
        terms={[topic]}
        areas={[area]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Teme", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Pretražite teme")).toBeInTheDocument();
    expect(screen.getByText("Stres i preopterećenost")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Istražite temu/ }),
    ).toHaveAttribute("href", "/kompas/tema/sagorevanje");
  });
});
