import { withIntl } from "@/test-support/intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApiContentRevision } from "../../content-api";
import { KompasContentList } from "./kompas-content-list";
import { KompasContentNew } from "./kompas-content-new";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const registryTerms = [
  {
    termId: "area",
    axis: "topic_group",
    stableId: "gubitak",
    publicLabel: "Gubitak i životne promene",
  },
  {
    termId: "topic",
    axis: "topic",
    stableId: "tugovanje",
    publicLabel: "Tugovanje",
    primaryParentTermId: "area",
  },
];

function entry(overrides: Partial<ApiContentRevision> = {}) {
  return {
    entryId: "entry-article",
    revisionId: "revision-1",
    contentType: "article",
    management: "system",
    slug: "tugovanje",
    locale: "sr-Latn",
    template: "article_detail",
    slotData: {
      hero: { mode: "override", fields: { title: "Tugovanje" } },
    },
    seo: { title: "", description: "" },
    discovery: {
      topicGroupTermId: "area",
      topicTermIds: ["topic"],
      audienceTermIds: [],
      contentGoalTermIds: [],
      journeyIntentTermId: null,
      contentFormatTermId: null,
      accessLevelTermId: null,
      relatedContentEntryIds: [],
    },
    status: "draft",
    versionLabel: "v1",
    lockVersion: 1,
    decisions: [],
    createdBy: null,
    updatedBy: null,
    updatedAt: "2026-08-04T10:00:00Z",
    ...overrides,
  } as ApiContentRevision;
}

function stubApi(entries: ApiContentRevision[]) {
  const fetchMock = vi.fn(async (input: unknown, init?: RequestInit) => {
    void init;
    const url = String(input);
    const body = url.startsWith("/api/content/taxonomy/terms")
      ? registryTerms
      : url.startsWith("/api/content/entries")
        ? entries
        : [];
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderScreen(node: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    withIntl(<QueryClientProvider client={client}>{node}</QueryClientProvider>),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  push.mockClear();
});

describe("Kompas sadržaj — lista", () => {
  it("shows the team's own texts and none of the site's pages", async () => {
    stubApi([
      entry(),
      entry({ entryId: "page", contentType: "static_page", slug: "o-nama" }),
      entry({ entryId: "usluga", contentType: "service", slug: "usluge" }),
    ]);
    renderScreen(<KompasContentList />);

    expect(await screen.findByText("Tugovanje")).toBeVisible();
    // The six system types are edited in „Sadržaj"; listing one here would
    // offer an action that means nothing for a Kompas author.
    expect(screen.queryByText("Usluge")).not.toBeInTheDocument();
    expect(screen.queryByText("O nama")).not.toBeInTheDocument();
  });

  it("opens the text on its own page rather than under a catalogue", async () => {
    stubApi([entry()]);
    renderScreen(<KompasContentList />);

    const link = await screen.findByRole("link", { name: "Tugovanje" });
    expect(link).toHaveAttribute(
      "href",
      "/radni-prostor/kompas/sadrzaj/entry-article",
    );
  });

  it("invites the first text instead of showing an empty table", async () => {
    stubApi([]);
    renderScreen(<KompasContentList />);

    expect(await screen.findByText("Još nema nijednog teksta")).toBeVisible();
    expect(screen.getByRole("link", { name: "Novi sadržaj" })).toHaveAttribute(
      "href",
      "/radni-prostor/kompas/sadrzaj/novo",
    );
  });

  it("says what is still missing before Kompas can recommend the text", async () => {
    stubApi([entry()]);
    renderScreen(<KompasContentList />);

    await screen.findByText("Tugovanje");
    expect(screen.getByText(/Pre nego što ga Kompas može/)).toBeVisible();
  });
});

describe("Kompas sadržaj — novi tekst", () => {
  it("creates the article and opens its own page", async () => {
    const fetchMock = stubApi([]);
    const user = userEvent.setup();
    renderScreen(<KompasContentNew />);

    await user.type(
      screen.getByLabelText("Naslov članka"),
      "Tugovanje nije nešto što treba preboljeti",
    );
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify(
          entry({
            entryId: "entry-new",
            slug: "tugovanje-nije-nesto-sto-treba-preboljeti",
          }),
        ),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    await user.click(
      screen.getByRole("button", { name: "Napravi tekst i nastavi" }),
    );

    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    const request = fetchMock.mock.calls.find(
      (call) => call[1]?.method === "POST",
    );
    expect(JSON.parse(String(request?.[1]?.body))).toEqual({
      contentType: "article",
      slug: "tugovanje-nije-nesto-sto-treba-preboljeti",
      template: "article_detail",
    });
    expect(push).toHaveBeenCalledWith(
      "/radni-prostor/kompas/sadrzaj/entry-new",
    );
  });

  it("shows the formats that are planned without offering them", async () => {
    stubApi([]);
    renderScreen(<KompasContentNew />);

    expect(screen.getByText(/Tekst \/ članak/)).toBeVisible();
    expect(screen.getByText(/Video · u pripremi/)).toBeVisible();
    expect(screen.queryByRole("button", { name: /Video/ })).toBeNull();
  });
});
