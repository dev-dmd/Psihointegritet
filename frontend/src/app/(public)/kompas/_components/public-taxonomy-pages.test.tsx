import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// The areas hero carries the sheet launcher, which reads the app router. These
// tests render components in isolation, so the router is stubbed rather than a
// whole app shell mounted around them.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import type {
  PublicTaxonomyPageAggregate,
  RoutablePublicTaxonomyTerm,
} from "@/lib/compass/types";
import { getFallbackContentForLocale } from "@/content/registry";
import { withIntl } from "@/test-support/intl";

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
const therapists = getFallbackContentForLocale("sr-Latn").therapists;

describe("public Compass page renderers", () => {
  it("renders an aggregate through registry-controlled taxonomy and content links", () => {
    const { container } = render(
      withIntl(
        <PublicTaxonomyPage
          aggregate={aggregate}
          routeKind="oblast"
          therapists={therapists}
        />,
      ),
    );

    expect(
      screen.getByRole("heading", {
        name: "Stres i preopterećenost",
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Sagorevanje/ })).toHaveAttribute(
      "href",
      "/kompas/tema/sagorevanje",
    );
    expect(screen.getByRole("link", { name: /Otvori/ })).toHaveAttribute(
      "href",
      "/usluge/individualna-psihoterapija",
    );
    const supportLinks = screen.getAllByRole("link", {
      name: "Želim stručnu pomoć",
    });
    expect(supportLinks.length).toBeGreaterThan(0);
    for (const link of supportLinks) {
      expect(link).toHaveAttribute("href", "/pronadji-podrsku");
    }
    // The area's own meta line counts what is actually on the page.
    expect(
      screen.getByText("1 tema · 1 objavljen sadržaj"),
    ).toBeInTheDocument();
    expect(screen.getByText("Javno dostupno")).toBeInTheDocument();

    const jsonLd = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(jsonLd?.textContent).toContain('"@type":"BreadcrumbList"');
    expect(jsonLd?.textContent).not.toContain("CollectionPage");
  });

  it("renders the topic collection with local-search input and parent label", () => {
    render(
      withIntl(
        <PublicTaxonomyListPage
          routeKind="tema"
          terms={[topic]}
          areas={[area]}
        />,
      ),
    );

    expect(
      screen.getByRole("heading", { name: "Teme", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Pretraga tema")).toBeInTheDocument();
    // The parent area is a link, so a recognised area widens the search in one
    // click instead of a back navigation.
    expect(
      screen.getByRole("link", { name: "Stres i preopterećenost" }),
    ).toHaveAttribute("href", "/kompas/oblast/stres");
    expect(screen.getByRole("link", { name: "Sagorevanje" })).toHaveAttribute(
      "href",
      "/kompas/tema/sagorevanje",
    );
  });

  it("lists areas with an ordinal, their topics and a content-count meta line", () => {
    render(
      withIntl(
        <PublicTaxonomyListPage
          routeKind="oblast"
          terms={[area]}
          topics={[topic]}
        />,
      ),
    );

    expect(
      screen.getByRole("heading", { name: "Oblasti", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Otvori oblast Stres i preopterećenost",
      }),
    ).toHaveAttribute("href", "/kompas/oblast/stres");
    // The topic chip on the area card is its own route in.
    expect(screen.getByRole("link", { name: "Sagorevanje" })).toHaveAttribute(
      "href",
      "/kompas/tema/sagorevanje",
    );
    // No public endpoint returns per-term content counts yet, so the card says
    // so rather than claiming zero.
    expect(
      screen.getByText("1 tema · sadržaji u pripremi"),
    ).toBeInTheDocument();
  });

  it("renders English system copy and localized Compass routes", () => {
    render(
      withIntl(
        <PublicTaxonomyListPage
          routeKind="oblast"
          terms={[area]}
          topics={[topic]}
        />,
        "en",
      ),
    );

    expect(
      screen.getByRole("heading", { name: "Areas", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("1 topic · content in preparation"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Open area Stres i preopterećenost",
      }),
    ).toHaveAttribute("href", "/compass/area/stres");
    expect(screen.getByRole("link", { name: "Find support" })).toHaveAttribute(
      "href",
      "/find-support",
    );
  });
});
