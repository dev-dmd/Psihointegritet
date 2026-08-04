import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

import type { TaxonomyTerm } from "../taxonomy-api";

/**
 * Shared setup for the quick-entry suites.
 *
 * Extracted when the single suite crossed the 400-line cap: the wizard's flow
 * and the wording the author reads are separate concerns and fail for separate
 * reasons, but they need the same registry fixture and the same provider.
 */

export function makeTerm(overrides: Partial<TaxonomyTerm> = {}): TaxonomyTerm {
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

export function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export function renderWithClient(
  element: ReactNode,
  client = createQueryClient(),
) {
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>{element}</QueryClientProvider>,
    ),
  };
}

type User = ReturnType<typeof userEvent.setup>;

export async function openIdentity(user: User) {
  await user.click(screen.getByRole("button", { name: "Novi brzi unos" }));
  // The launcher asks what you want to add; picking a card is the whole step.
  await user.click(screen.getByRole("button", { name: /^Oblast/ }));
}

export async function fillNewAreaIdentity(user: User) {
  await user.type(screen.getByLabelText("Naziv oblasti"), "Nova oblast");
  await user.type(
    screen.getByLabelText("Opis koji vide posetioci"),
    "Kratak javni opis.",
  );
}
