import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BookingRequestForm } from "./booking-request-form";
import { storeBookingSummary } from "./booking-summary-storage";

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderForm() {
  render(
    <BookingRequestForm
      initialContext={{
        serviceSlug: "individualna-psihoterapija",
        therapistSlug: "anja-stamenkovic",
        format: "online",
        source: "service",
        messages: [],
      }}
    />,
  );
}

describe("BookingRequestForm", () => {
  it("states that the request is not a confirmed appointment", () => {
    renderForm();

    expect(screen.getByText(/Ovo je zahtev za termin/)).toBeVisible();
    expect(screen.getByText(/proveri dostupnost/)).toBeVisible();
  });

  it("requires acknowledgement before sending and then shows the success state", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const matchingSummary = {
      answers: [{ question: "Razlog", answer: "Burnout" }],
      recommendedService: "Individualna psihoterapija",
      recommendedTherapist: "Anja Stamenković",
      reasons: ["Radi sa temama burnouta i stresa."],
    };
    storeBookingSummary(matchingSummary);
    renderForm();

    await user.click(screen.getByRole("button", { name: "Nastavi" }));
    await user.click(screen.getByRole("button", { name: "Nastavi" }));

    fireEvent.change(screen.getByLabelText("Željeni datum"), {
      target: { value: "2026-08-10" },
    });
    await user.selectOptions(screen.getByLabelText("Period dana"), "Popodne");
    await user.click(screen.getByRole("button", { name: "Nastavi" }));

    await user.type(screen.getByLabelText("Ime i prezime"), "Petar Petrović");
    await user.type(screen.getByLabelText("Email"), "petar@example.com");
    await user.click(screen.getByRole("button", { name: "Nastavi" }));

    const submit = screen.getByRole("button", { name: "Pošaljite zahtev" });
    expect(submit).toBeDisabled();

    await user.click(
      screen.getByLabelText(/Razumem da je ovo zahtev za termin/),
    );
    expect(submit).toBeEnabled();

    await user.click(submit);

    await waitFor(() =>
      expect(screen.getByText("Vaš zahtev je uspešno poslat")).toBeVisible(),
    );
    expect(
      screen.getByText(/Ovo još nije konačna potvrda termina/),
    ).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/booking-request",
      expect.objectContaining({ method: "POST" }),
    );
    const requestOptions = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const payload = JSON.parse(String(requestOptions.body)) as {
      summary?: unknown;
    };
    expect(payload.summary).toEqual(matchingSummary);
    expect(JSON.stringify(payload.summary)).not.toContain("scoreBreakdown");
  });
});
