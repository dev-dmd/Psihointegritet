import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { withIntl } from "@/test-support/intl";
import type { AppointmentRequest } from "@/lib/api/booking";

import { ScreenTermini } from "./screen-termini";

const useMyAppointmentRequests = vi.hoisted(() => vi.fn());

vi.mock("../hooks/use-my-appointment-requests", () => ({
  useMyAppointmentRequests,
}));

function request(overrides: Partial<AppointmentRequest>): AppointmentRequest {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    organization_id: "22222222-2222-4222-8222-222222222222",
    therapist_profile_id: "33333333-3333-4333-8333-333333333333",
    service_id: "44444444-4444-4444-8444-444444444444",
    request_type: "initial",
    status: "submitted",
    preferred_start: null,
    preferred_end: null,
    existing_appointment_id: null,
    format: "online",
    location_id: null,
    client_name: "Ana Marković",
    client_email: "ana@example.com",
    client_timezone: "Europe/Belgrade",
    client_note: "Željeni datum: 20.08.2026 | Telefon: 060",
    expires_at: null,
    created_at: "2026-08-01T10:00:00.000Z",
    updated_at: "2026-08-01T10:00:00.000Z",
    ...overrides,
  };
}

function renderScreen(state: {
  data?: AppointmentRequest[];
  isPending?: boolean;
  isError?: boolean;
}) {
  useMyAppointmentRequests.mockReturnValue({
    data: state.data,
    isPending: state.isPending ?? false,
    isError: state.isError ?? false,
  });
  render(withIntl(<ScreenTermini />));
}

describe("ScreenTermini", () => {
  it("renders every string from the catalogue", () => {
    // MISSING_MESSAGE throws at render, so reaching an assertion at all is the
    // check — the superadmin panel shipped broken exactly this way once.
    renderScreen({ data: [] });

    expect(
      screen.getByRole("heading", { name: "Moji termini" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Nemate otvorenih zahteva za termin."),
    ).toBeInTheDocument();
  });

  it("shows a submitted request as a request, with no invented appointment time", () => {
    renderScreen({ data: [request({})] });

    expect(screen.getByText("Zahtev za termin")).toBeInTheDocument();
    expect(screen.getByText("Čeka potvrdu terapeuta")).toBeInTheDocument();
    expect(
      screen.getByText(/Online · Poslato: 1\. avgust/),
    ).toBeInTheDocument();
    // The wanted date lives in the free-text note the public form writes. It is
    // not parsed and must never surface as if it were a confirmed term.
    expect(screen.queryByText(/20\.08\.2026/)).not.toBeInTheDocument();
  });

  it("renders the requested instant when the request carries one", () => {
    renderScreen({
      data: [request({ preferred_start: "2026-08-20T15:00:00.000Z" })],
    });

    expect(
      screen.getByText(/Četvrtak, 20\. avgust · 17:00/),
    ).toBeInTheDocument();
  });

  it("says so when the list cannot be loaded", () => {
    renderScreen({ isError: true });

    expect(
      screen.getByText("Vaši termini trenutno ne mogu da se učitaju."),
    ).toBeInTheDocument();
  });
});
