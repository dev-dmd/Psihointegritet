import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  TAXONOMY_REGISTRY_QUERY_KEY,
  type TaxonomyRegistrySnapshot,
  type TaxonomyTerm,
} from "../taxonomy-api";
import { useTaxonomyRegistryCache } from "../hooks/use-taxonomy-registry";
import { suggestTaxonomyStableId } from "./taxonomy-term-form/model";
import { TaxonomyQuickEntry } from "./taxonomy-quick-entry";
import { TaxonomyTermEditor } from "./taxonomy-term-editor";
import { QuickEntryReview } from "./taxonomy-term-form/quick-entry-review";

function makeTerm(overrides: Partial<TaxonomyTerm> = {}): TaxonomyTerm {
  return {
    axis: "topic_group",
    canonicalPath: null,
    compassEnabled: true,
    createdAt: "2026-08-01T10:00:00Z",
    decisions: [],
    events: [],
    locale: "sr-Latn",
    lockVersion: 1,
    organizationId: null,
    publicLabel: "Nova oblast",
    publicVisible: true,
    relations: [],
    revisionId: "revision-1",
    searchTerms: [],
    shortDescription: "Kratak javni opis.",
    sortOrder: 0,
    stableId: "nova-oblast",
    status: "draft",
    systemDefined: false,
    termId: "term-1",
    updatedAt: "2026-08-01T10:00:00Z",
    versionLabel: "v1",
    ...overrides,
  };
}

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderWithClient(element: ReactNode, client = createQueryClient()) {
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>{element}</QueryClientProvider>,
    ),
  };
}

async function openIdentity(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Novi brzi unos" }));
  await user.click(
    screen.getByRole("button", { name: /Nastavi na identitet/ }),
  );
}

async function fillNewAreaIdentity(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Naziv oblasti"), "Nova oblast");
  await user.type(
    screen.getByLabelText("Kratak javni opis"),
    "Kratak javni opis.",
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TaxonomyQuickEntry", () => {
  it("derives the internal id from the name without ever asking for it", async () => {
    const user = userEvent.setup();
    const saved = makeTerm({
      axis: "topic",
      publicLabel: "Sagorevanje na poslu",
      stableId: "sagorevanje-na-poslu",
      shortDescription: "Početni opis teme.",
      termId: "term-topic",
      primaryParentTermId: null,
      journeyIntentTermId: null,
    });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(saved));
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient(<TaxonomyQuickEntry terms={[]} onSaved={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Novi brzi unos" }));
    await user.click(screen.getByRole("button", { name: /Nova tema/ }));
    await user.click(
      screen.getByRole("button", { name: /Nastavi na identitet/ }),
    );
    await user.type(
      screen.getByLabelText("Naziv teme"),
      "Sagorevanje na poslu",
    );
    // D-062: the therapist never meets this field. It still has to be right,
    // because the server locks it on the first save — so the assertion moved
    // from the input to the request body below.
    expect(screen.queryByLabelText("Stabilni ID")).not.toBeInTheDocument();
    await user.type(
      screen.getByLabelText("Kratak javni opis"),
      "Početni opis teme.",
    );
    await user.click(screen.getByRole("button", { name: "Sačuvaj i nastavi" }));

    expect(
      await screen.findByRole("heading", { name: "Organizacija" }),
    ).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/content/taxonomy/terms");
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      axis: "topic",
      stableId: "sagorevanje-na-poslu",
      primaryParentTermId: null,
      journeyIntentTermId: null,
    });

    await user.click(screen.getByRole("button", { name: "Nazad" }));
    // Still reachable for a platform admin, but folded away under
    // "Tehnički detalji" rather than presented as something to fill in.
    expect(screen.getByText("sagorevanje-na-poslu")).toBeInTheDocument();
  });

  it("reports a name collision next to the name, in the author's words", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          type: "about:blank",
          title: "Konflikt stabilnog ID-ja",
          status: 409,
          code: "taxonomy_stable_id_conflict",
          detail: "Stabilni ID već postoji.",
          correlationId: "corr-409",
        },
        409,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient(<TaxonomyQuickEntry terms={[]} onSaved={vi.fn()} />);
    await openIdentity(user);
    await fillNewAreaIdentity(user);
    await user.click(screen.getByRole("button", { name: "Sačuvaj i nastavi" }));

    // The server answers about `stableId`, a field the author never sees.
    // The panel translates that into the name they can actually change.
    expect(await screen.findByText(/već postoji u registru/)).toBeVisible();
    expect(screen.getByLabelText("Naziv oblasti")).toHaveValue("Nova oblast");
    expect(screen.getByLabelText("Naziv oblasti")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("saves and exits, then resumes at the next step with locked identity", async () => {
    const user = userEvent.setup();
    const saved = makeTerm();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(saved)));

    renderWithClient(<TaxonomyQuickEntry terms={[]} onSaved={vi.fn()} />);
    await openIdentity(user);
    await fillNewAreaIdentity(user);
    await user.click(screen.getByRole("button", { name: "Sačuvaj i izađi" }));

    expect(
      await screen.findByRole("button", { name: "Nastavi: Nova oblast" }),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Nastavi: Nova oblast" }),
    );
    expect(screen.getByRole("heading", { name: "Organizacija" })).toBeVisible();
  });

  it("merges a confirmed canonicalPath into the registry cache", async () => {
    const user = userEvent.setup();
    const term = makeTerm();
    const route = {
      canonicalPath: "/kompas/oblast/nova-oblast",
      createdAt: "2026-08-01T10:00:00Z",
      isCanonical: true,
      locale: "sr-Latn",
      lockVersion: 1,
      routeId: "route-1",
      routeKind: "oblast",
      slug: "nova-oblast",
      termId: term.termId,
      updatedAt: "2026-08-01T10:00:00Z",
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/routes/suggestion")) {
        return jsonResponse({
          available: true,
          canonicalPath: route.canonicalPath,
          slug: route.slug,
        });
      }
      if (url.endsWith("/routes/canonical")) return jsonResponse(route);
      return jsonResponse(term);
    });
    vi.stubGlobal("fetch", fetchMock);
    const client = createQueryClient();
    client.setQueryData<TaxonomyRegistrySnapshot>(TAXONOMY_REGISTRY_QUERY_KEY, {
      terms: [term],
      intakeLinks: [],
    });

    function CacheHarness() {
      const { upsertTerm } = useTaxonomyRegistryCache();
      return <TaxonomyQuickEntry terms={[term]} onSaved={upsertTerm} />;
    }
    renderWithClient(<CacheHarness />, client);
    await user.selectOptions(
      screen.getByLabelText("Nastavi postojeću radnu verziju"),
      term.termId,
    );
    await user.click(screen.getByRole("button", { name: "Otvori draft" }));
    await user.click(screen.getByRole("button", { name: "Sačuvaj i nastavi" }));
    expect(
      await screen.findByRole("heading", { name: "Organizacija" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Sačuvaj i nastavi" }));
    expect(
      await screen.findByRole("heading", {
        name: "Početni sadržaj i povezivanje",
      }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Sačuvaj i nastavi" }));
    expect(
      await screen.findByRole("heading", { name: "Javna ruta" }),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Predloži javnu putanju" }),
    );
    expect(await screen.findByLabelText("Slug putanje")).toHaveValue(
      "nova-oblast",
    );
    await user.click(screen.getByRole("button", { name: "Potvrdi putanju" }));

    await waitFor(() => {
      const snapshot = client.getQueryData<TaxonomyRegistrySnapshot>(
        TAXONOMY_REGISTRY_QUERY_KEY,
      );
      expect(snapshot?.terms[0]?.canonicalPath).toBe(route.canonicalPath);
    });
  });

  it("shows the same non-blocking SEO warnings in identity and review", async () => {
    const user = userEvent.setup();
    const publicLabel = "N".repeat(66);
    const shortDescription = "O".repeat(171);
    const identity = renderWithClient(
      <TaxonomyQuickEntry terms={[]} onSaved={vi.fn()} />,
    );
    await openIdentity(user);
    await user.type(screen.getByLabelText("Naziv oblasti"), publicLabel);
    await user.type(
      screen.getByLabelText("Kratak javni opis"),
      shortDescription,
    );
    expect(screen.getByText(/naziv prelazi preporučenih 65/)).toBeVisible();
    expect(screen.getByText(/opis prelazi preporučenih 170/)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Sačuvaj i nastavi" }),
    ).toBeEnabled();
    identity.unmount();

    renderWithClient(
      <QuickEntryReview
        axis="topic_group"
        term={makeTerm({ publicLabel, shortDescription })}
        registryTerms={[]}
        busy={false}
        onChanged={vi.fn()}
        onSaveDraft={vi.fn()}
        onBack={vi.fn()}
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByText(/naziv prelazi preporučenih 65/)).toBeVisible();
    expect(screen.getByText(/opis prelazi preporučenih 170/)).toBeVisible();
  });
});

describe("TaxonomyTermEditor shared form layer", () => {
  it("uses shared normalization and renders non-blocking SEO warnings", async () => {
    const user = userEvent.setup();
    const publicLabel = "N".repeat(66);
    const shortDescription = "O".repeat(171);
    const saved = makeTerm({ publicLabel, shortDescription });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(saved));
    vi.stubGlobal("fetch", fetchMock);
    const onSaved = vi.fn();

    renderWithClient(
      <TaxonomyTermEditor
        axis="topic_group"
        term={null}
        registryTerms={[]}
        onSaved={onSaved}
        onCancel={vi.fn()}
      />,
    );
    await user.type(screen.getByLabelText("Naziv oblasti"), publicLabel);
    await user.type(
      screen.getByLabelText("Kratak javni opis"),
      shortDescription,
    );
    await user.type(
      screen.getByLabelText("Sinonimi i pojmovi za pretragu"),
      "Stres, stres{enter}Opterećenje",
    );

    expect(screen.getByText(/naziv prelazi preporučenih 65/)).toBeVisible();
    expect(screen.getByText(/opis prelazi preporučenih 170/)).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Sačuvaj radnu verziju" }),
    );

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(onSaved.mock.calls[0]?.[0]).toEqual(saved);
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      axis: "topic_group",
      // Derived from the name by the form, in both surfaces, with no input.
      stableId: suggestTaxonomyStableId(publicLabel),
      publicLabel,
      shortDescription,
      searchTerms: ["Stres", "Opterećenje"],
    });
  });
});
