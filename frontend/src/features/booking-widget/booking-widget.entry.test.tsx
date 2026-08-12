import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { editable, locked, renderWidget } from "./booking-widget.fixtures";

// ── Direct booking ──────────────────────────────────────────────────────────

describe("direct booking", () => {
  it("offers other therapists and the selected therapist's services", () => {
    renderWidget(editable);

    expect(screen.getByText("Ostali terapeuti")).toBeInTheDocument();
    expect(screen.getByText("Usluge kod Marije")).toBeInTheDocument();
    // The active therapist never reappears as a choice.
    expect(
      within(
        screen.getByRole("region", { name: "Ostali terapeuti" }),
      ).queryByText("Maria Bullock"),
    ).not.toBeInTheDocument();
  });

  it("opens on a valid therapist + offering pair with no initial params", () => {
    renderWidget(editable);
    expect(
      screen.getByRole("heading", { name: "Individualna psihoterapija" }),
    ).toBeInTheDocument();
  });
});

// ── Therapist profile entry ─────────────────────────────────────────────────

describe("therapist profile entry", () => {
  it("preselects the therapist yet keeps them changeable", () => {
    renderWidget(editable, { initialTherapistId: "john" });

    expect(screen.getByText("Usluge kod Johna")).toBeInTheDocument();
    expect(screen.getByText("Ostali terapeuti")).toBeInTheDocument();
  });

  it("honours an initial service", () => {
    renderWidget(editable, {
      initialTherapistId: "maria",
      initialServiceId: "bracno",
    });
    expect(
      screen.getByRole("heading", { name: "Bračno savetovanje" }),
    ).toBeInTheDocument();
  });
});

// ── Intake & Matching ───────────────────────────────────────────────────────

describe("intake matching entry", () => {
  it("locks both choices and hides every selector", () => {
    renderWidget(locked, {
      initialTherapistId: "maria",
      initialServiceId: "bracno",
    });

    expect(screen.getByText("Vaš izbor")).toBeInTheDocument();
    expect(screen.queryByText("Ostali terapeuti")).not.toBeInTheDocument();
    expect(screen.queryByText(/Usluge kod/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Sledeća usluga" }),
    ).not.toBeInTheDocument();
    // The format switch deliberately stays: it shows the choice the person
    // made in the guided flow and never reopens therapist or service.
    expect(
      screen.getByRole("radiogroup", { name: "Način rada" }),
    ).toBeInTheDocument();
  });

  it("offers a labelled back button beside Otkaži, not a bare arrow", async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    renderWidget(locked, { initialTherapistId: "maria", onBack });

    const back = screen.getByRole("button", { name: "Nazad na preporuke" });
    // Visible word, because an icon on its own read as nothing to clients.
    expect(back).toHaveTextContent("Nazad");
    // Same row as „Otkaži", same visual treatment…
    const cancel = screen.getByRole("button", { name: "Otkaži" });
    expect(back.parentElement).toBe(cancel.parentElement);
    for (const shared of [
      "rounded-lg",
      "border",
      "px-5",
      "py-2.5",
      "min-h-10",
    ]) {
      expect(back.className).toContain(shared);
      expect(cancel.className).toContain(shared);
    }
    // …but deliberately not the same width: on mobile „Otkaži" takes the
    // remaining space while „Nazad" stays at its content width.
    expect(back.className).toContain("shrink-0");
    expect(back.className).not.toContain("grow");
    expect(cancel.className).toContain("grow");

    await user.click(back);
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("shows no back button when the host did not provide one", () => {
    renderWidget(locked, { initialTherapistId: "maria" });
    expect(
      screen.queryByRole("button", { name: "Nazad na preporuke" }),
    ).not.toBeInTheDocument();
  });
});
