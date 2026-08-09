import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  editable,
  locked,
  offeringsGroup,
  renderWidget,
  selectFirstSlot,
} from "./booking-widget.fixtures";

// ── Changing therapist ──────────────────────────────────────────────────────

describe("changing therapist", () => {
  it("keeps a compatible service and resets the slot", async () => {
    const user = userEvent.setup();
    renderWidget(editable, {
      initialTherapistId: "anja",
      initialServiceId: "bracno",
    });
    await selectFirstSlot(user);

    await user.click(screen.getByRole("button", { name: /Marjan Janković/ }));

    expect(screen.getByText("Usluge kod Marjana")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Bračno savetovanje" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "09:00" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("never leaves an invalid pair when the service is not provided", async () => {
    const user = userEvent.setup();
    renderWidget(editable, {
      initialTherapistId: "anja",
      initialServiceId: "individualna",
    });
    await selectFirstSlot(user);

    await user.click(screen.getByRole("button", { name: /Marjan Janković/ }));

    // Marjan does not provide „Individualna psihoterapija".
    expect(
      screen.queryByRole("heading", { name: "Individualna psihoterapija" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Bračno savetovanje" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "09:00" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});

// ── Changing offering ───────────────────────────────────────────────────────

describe("changing offering", () => {
  it("keeps the therapist, swaps the offering and resets the slot", async () => {
    const user = userEvent.setup();
    renderWidget(editable, { initialTherapistId: "anja" });
    await selectFirstSlot(user);

    const bracno = within(offeringsGroup()).getByRole("radio", {
      name: /Bračno savetovanje/,
    });
    await user.click(bracno);

    expect(screen.getByText("Usluge kod Anje")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Bračno savetovanje" }),
    ).toBeInTheDocument();
    expect(bracno).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", { name: "09:00" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("updates duration and price immediately", async () => {
    const user = userEvent.setup();
    renderWidget(editable, { initialTherapistId: "anja" });

    expect(screen.getByText(/60 minuta/)).toBeInTheDocument();
    await user.click(
      within(offeringsGroup()).getByRole("radio", {
        name: /Bračno savetovanje/,
      }),
    );
    expect(screen.getByText(/90 minuta/)).toBeInTheDocument();
  });
});

// ── Arrow affordances ───────────────────────────────────────────────────────

describe("offering arrows", () => {
  it("are absent when the therapist has a single offering", () => {
    renderWidget(editable, { initialTherapistId: "marjan" });
    expect(
      screen.queryByRole("button", { name: "Sledeća usluga" }),
    ).not.toBeInTheDocument();
  });

  it("are keyboard reachable buttons when there is more than one", async () => {
    const user = userEvent.setup();
    renderWidget(editable, { initialTherapistId: "anja" });

    const next = screen.getByRole("button", { name: "Sledeća usluga" });
    expect(next.tagName).toBe("BUTTON");
    // jsdom has no layout, so assert reachability rather than scroll offset.
    await user.tab();
    expect(document.activeElement).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Prethodna usluga" }),
    ).toBeInTheDocument();
  });
});

// ── Policy independence ─────────────────────────────────────────────────────

describe("policy is the only authority", () => {
  it("renders identically for any entry as long as the policy matches", () => {
    const first = renderWidget(editable, { initialTherapistId: "anja" });
    const withPolicyOnly = first.container.innerHTML;
    first.unmount();

    // No `source` is passed to the widget at all — it cannot branch on it.
    const second = renderWidget(editable, { initialTherapistId: "anja" });
    expect(second.container.innerHTML).toBe(withPolicyOnly);
  });
});

// ── Format carried from the entry point ─────────────────────────────────────

describe("initial format from the query", () => {
  it("preselects the in-person switch when the entry asked for it", () => {
    renderWidget(editable, {
      initialTherapistId: "anja",
      initialServiceId: "individualna",
      initialFormat: "uzivo",
    });

    const formatSwitch = screen.getByRole("radiogroup", {
      name: "Način rada",
    });
    expect(
      within(formatSwitch).getByRole("radio", { name: "Uživo" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      within(formatSwitch).getByRole("radio", { name: "Online" }),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("reflects the chosen format in the locked Intake entry", () => {
    renderWidget(locked, {
      initialTherapistId: "anja",
      initialServiceId: "individualna",
      initialFormat: "uzivo",
    });

    const formatSwitch = screen.getByRole("radiogroup", {
      name: "Način rada",
    });
    expect(
      within(formatSwitch).getByRole("radio", { name: "Uživo" }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("lists only the offerings available in the chosen format", () => {
    renderWidget(editable, {
      initialTherapistId: "anja",
      initialFormat: "uzivo",
    });

    const cards = within(offeringsGroup()).getAllByRole("radio");
    expect(cards).toHaveLength(2);
    for (const card of cards) {
      expect(card).toHaveTextContent("Uživo");
    }
  });
});

describe("tapping a partly visible offering", () => {
  it("selects it and scrolls it into focus", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    // jsdom implements no scrolling, so the call itself is the observable.
    Element.prototype.scrollIntoView = scrollIntoView;

    renderWidget(editable, { initialTherapistId: "anja" });

    const bracno = within(offeringsGroup()).getByRole("radio", {
      name: /Bračno savetovanje/,
    });
    await user.click(bracno);

    expect(bracno).toHaveAttribute("aria-checked", "true");
    expect(scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ inline: "center" }),
    );
  });
});
