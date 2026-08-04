import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApiContentRevision } from "../../content-api";
import { CompassContentWorkspace } from "./compass-content-workspace";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const registryTerms = [
  {
    termId: "area",
    axis: "topic_group",
    stableId: "strah",
    publicLabel: "Strah i brige",
  },
  {
    termId: "topic",
    axis: "topic",
    stableId: "anksioznost",
    publicLabel: "Anksioznost",
    primaryParentTermId: "area",
  },
  {
    termId: "audience",
    axis: "audience",
    stableId: "odrasli",
    publicLabel: "Odrasli",
  },
  {
    termId: "goal",
    axis: "content_goal",
    stableId: "razumevanje",
    publicLabel: "Razumevanje",
  },
  {
    termId: "journey",
    axis: "journey_intent",
    stableId: "istrazivanje",
    publicLabel: "Istraživanje",
  },
  {
    termId: "format",
    axis: "content_format",
    stableId: "article",
    publicLabel: "Članak",
  },
  {
    termId: "public",
    axis: "access_level",
    stableId: "public",
    publicLabel: "Javno",
  },
];

function entry(overrides: Partial<ApiContentRevision> = {}) {
  return {
    entryId: "entry-linked",
    revisionId: "revision-1",
    contentType: "static_page",
    management: "system",
    slug: "o-nama",
    locale: "sr-Latn",
    template: "text_page",
    slotData: {},
    seo: { title: "O nama", description: "" },
    discovery: {
      topicGroupTermId: "area",
      topicTermIds: ["topic"],
      audienceTermIds: ["audience"],
      contentGoalTermIds: ["goal"],
      journeyIntentTermId: "journey",
      contentFormatTermId: "format",
      accessLevelTermId: "public",
      relatedContentEntryIds: [],
    },
    status: "published",
    versionLabel: "v1",
    lockVersion: 1,
    decisions: [],
    createdBy: null,
    updatedBy: null,
    updatedAt: "2026-08-01T10:00:00Z",
    ...overrides,
  } as ApiContentRevision;
}

const halfLinked = entry({
  entryId: "entry-half",
  slug: "usluge",
  seo: { title: "Usluge", description: "" },
  discovery: {
    topicGroupTermId: "area",
    topicTermIds: ["topic"],
    audienceTermIds: [],
    contentGoalTermIds: [],
    journeyIntentTermId: null,
    contentFormatTermId: "format",
    accessLevelTermId: "public",
    relatedContentEntryIds: [],
  },
});

function stubApi(entries: ApiContentRevision[]) {
  // The second parameter is unread here but must exist: the request-body
  // assertions below read `mock.calls[n][1]`.
  const fetchMock = vi.fn(async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    void init;
    if (url.startsWith("/api/content/entries") && url.includes("?") === false) {
      return new Response(JSON.stringify(entries), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.startsWith("/api/content/taxonomy/terms")) {
      return new Response(JSON.stringify(registryTerms), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderWorkspace() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <CompassContentWorkspace />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  push.mockClear();
});

describe("Kompas „Sadržaj” workspace", () => {
  it("lists the CMS entries the tenant already has, without copying them", async () => {
    stubApi([entry(), halfLinked]);
    renderWorkspace();

    // A system page is named by the catalogue that also feeds the public
    // renderer, not by the CMS seo title — one name, one source.
    expect(
      await screen.findByText("Digitalni centar za mentalno zdravlje"),
    ).toBeVisible();
    expect(screen.queryByText("O nama")).not.toBeInTheDocument();
    expect(screen.getByText("Usluge")).toBeVisible();
    // The linked one shows what it is linked to, in the registry's words.
    expect(screen.getByText(/Strah i brige/)).toBeVisible();
  });

  it("names what is missing instead of only saying that something is", async () => {
    stubApi([halfLinked]);
    renderWorkspace();

    // Wait for the row, not for the phrase: "Nedostaju podaci" is also a
    // filter button, so matching it proves nothing about the list.
    const row = (await screen.findByText("Usluge")).closest("article");
    expect(row).not.toBeNull();
    expect(within(row!).getByText("Nedostaju podaci")).toBeVisible();
    expect(screen.getByText(/bar jedna publika/)).toBeVisible();
    expect(screen.getByText(/bar jedan cilj sadržaja/)).toBeVisible();
    expect(screen.getByText(/gde ovaj sadržaj vodi korisnika/i)).toBeVisible();
  });

  it("narrows the list to the entries an author came to fix", async () => {
    stubApi([entry(), halfLinked]);
    const user = userEvent.setup();
    renderWorkspace();

    await screen.findByText("Digitalni centar za mentalno zdravlje");
    await user.click(screen.getByRole("button", { name: "Nedostaju podaci" }));
    expect(screen.getByText("Usluge")).toBeVisible();
    expect(
      screen.queryByText("Digitalni centar za mentalno zdravlje"),
    ).not.toBeInTheDocument();
  });

  it("creates an article over the existing endpoint and opens its editor", async () => {
    const fetchMock = stubApi([entry()]);
    const user = userEvent.setup();
    renderWorkspace();

    await screen.findByText("Digitalni centar za mentalno zdravlje");
    await user.click(
      screen.getByRole("button", { name: "Dodaj novi sadržaj" }),
    );
    await user.type(
      screen.getByLabelText("Naslov članka"),
      "Anksioznost nije vaš neprijatelj",
    );

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify(
          entry({
            entryId: "entry-new",
            contentType: "article",
            slug: "anksioznost-nije-vas-neprijatelj",
          }),
        ),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    await user.click(
      screen.getByRole("button", { name: "Napravi članak i otvori editor" }),
    );

    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    const request = fetchMock.mock.calls.find(
      (call) => call[1]?.method === "POST",
    );
    expect(JSON.parse(String(request?.[1]?.body))).toEqual({
      contentType: "article",
      slug: "anksioznost-nije-vas-neprijatelj",
      template: "article_detail",
    });
    expect(push).toHaveBeenCalledWith(
      "/radni-prostor/sadrzaj?entryId=entry-new&izvor=kompas",
    );
  });

  it("refuses a title that cannot become an address, before any request", async () => {
    const fetchMock = stubApi([entry()]);
    const user = userEvent.setup();
    renderWorkspace();

    await screen.findByText("Digitalni centar za mentalno zdravlje");
    await user.click(
      screen.getByRole("button", { name: "Dodaj novi sadržaj" }),
    );
    await user.type(screen.getByLabelText("Naslov članka"), "Анксиозност");
    await user.click(
      screen.getByRole("button", { name: "Napravi članak i otvori editor" }),
    );

    expect(screen.getByText(/latinicom/)).toBeVisible();
    expect(
      fetchMock.mock.calls.some((call) => call[1]?.method === "POST"),
    ).toBe(false);
  });

  it("shows the formats that are not built yet without offering them", async () => {
    stubApi([entry()]);
    const user = userEvent.setup();
    renderWorkspace();

    await screen.findByText("Digitalni centar za mentalno zdravlje");
    await user.click(
      screen.getByRole("button", { name: "Dodaj novi sadržaj" }),
    );

    expect(screen.getByText(/Video · u pripremi/)).toBeVisible();
    // Visible as a plan, never as a control that would fail on save.
    expect(screen.queryByRole("button", { name: /Video/ })).toBeNull();
  });
});
