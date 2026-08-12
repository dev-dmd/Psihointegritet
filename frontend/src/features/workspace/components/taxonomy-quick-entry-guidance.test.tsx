import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fillNewAreaIdentity,
  jsonResponse,
  makeTerm,
  openIdentity,
  renderWithClient,
} from "./taxonomy-quick-entry.harness";
import { TaxonomyQuickEntry } from "./taxonomy-quick-entry";

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * What the author is told, as opposed to what the wizard does with it (D-062).
 *
 * These assertions are about wording and about values the platform forms on
 * the author's behalf, so they fail for a different reason than the flow tests
 * next door and are kept apart from them.
 */
describe("TaxonomyQuickEntry guidance", () => {
  it("shows the visitor's card while it is still being written", async () => {
    // The form used to describe the result in prose and leave the author to
    // imagine it. The card is the answer to "where does this text show up".
    const user = userEvent.setup();
    renderWithClient(<TaxonomyQuickEntry terms={[]} onSaved={vi.fn()} />);
    await openIdentity(user);

    const preview = screen.getByRole("region", {
      name: "Kako će izgledati posetiocima",
    });
    expect(within(preview).getByText("Naziv još nije unet")).toBeVisible();
    await fillNewAreaIdentity(user);
    expect(within(preview).getByText("Nova oblast")).toBeVisible();
    expect(within(preview).getByText("Kratak javni opis.")).toBeVisible();
  });

  it("sends the integer the registry expects for a display order the author picked by name", async () => {
    const user = userEvent.setup();
    const saved = makeTerm({ sortOrder: 50 });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(saved));
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient(<TaxonomyQuickEntry terms={[]} onSaved={vi.fn()} />);
    await openIdentity(user);
    await fillNewAreaIdentity(user);
    await user.click(screen.getByRole("button", { name: "Sačuvaj i nastavi" }));
    expect(
      await screen.findByRole("heading", { name: "Organizacija" }),
    ).toBeVisible();

    // "Redosled prikaza" is three buttons now; 0–100000 never reaches the author.
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    const early = screen.getByRole("radio", { name: "Prikaži ranije" });
    await user.click(early);
    expect(early).toHaveAttribute("aria-checked", "true");

    await user.click(screen.getByRole("button", { name: "Sačuvaj i nastavi" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const request = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({ sortOrder: 10 });
  });

  it("warns about a search term broad enough to bury the results, without blocking the save", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(makeTerm()));
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient(<TaxonomyQuickEntry terms={[]} onSaved={vi.fn()} />);
    await openIdentity(user);
    await fillNewAreaIdentity(user);
    await user.click(screen.getByRole("button", { name: "Sačuvaj i nastavi" }));
    expect(
      await screen.findByRole("heading", { name: "Organizacija" }),
    ).toBeVisible();

    await user.type(
      screen.getByLabelText("Kako ljudi mogu da traže ovu oblast ili temu?"),
      "napetost u grudima\nemocije",
    );
    expect(screen.getByText(/veoma širok izraz/)).toBeVisible();

    // Advisory, not a rule: the step still saves and the term keeps the word.
    await user.click(screen.getByRole("button", { name: "Sačuvaj i nastavi" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const request = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      searchTerms: ["napetost u grudima", "emocije"],
    });
  });
});
