import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { withIntl } from "@/test-support/intl";

import { ScreenPocetna } from "./screen-pocetna";
import { ScreenProfil } from "./screen-profil";
import { ScreenProgrami } from "./screen-programi";

/**
 * Every panel screen renders with the real catalogue.
 *
 * `useTranslations` throws `MISSING_MESSAGE` on a key that is not in the
 * namespace a provider was handed — which is how the superadmin panel once
 * shipped a blank screen. These four assertions are the cheapest possible
 * guard against the same mistake in the client panel.
 */

const useMyAppointmentRequests = vi.hoisted(() => vi.fn());

vi.mock("../hooks/use-my-appointment-requests", () => ({
  useMyAppointmentRequests,
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: null }),
  useClerk: () => ({ signOut: vi.fn() }),
}));

describe("client panel screens", () => {
  it("renders „Početna“ with no booking requests", () => {
    useMyAppointmentRequests.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
    });

    render(withIntl(<ScreenPocetna firstName="Ana" />));

    expect(screen.getByText(/, Ana\./)).toBeInTheDocument();
    expect(screen.getByText("Još nemate zakazan termin")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zakaži termin" })).toHaveAttribute(
      "href",
      "/zakazi",
    );
  });

  it("greets an account with no name at all", () => {
    useMyAppointmentRequests.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
    });

    render(withIntl(<ScreenPocetna firstName={null} />));

    // No dangling comma where the name would have been.
    expect(screen.queryByText(/,\s*\./)).not.toBeInTheDocument();
  });

  it("renders „Programi“ as an empty module, not as demo content", () => {
    render(withIntl(<ScreenProgrami />));

    expect(
      screen.getByText("Nemate aktivnih programa ni paketa"),
    ).toBeInTheDocument();
  });

  it("renders „Profil“ with the identity resolved on the server", () => {
    render(
      withIntl(
        <ScreenProfil
          displayName="Ana Marković"
          email="ana@example.com"
          initials="AM"
        />,
      ),
    );

    expect(
      screen.getByRole("heading", { name: "Ana Marković" }),
    ).toBeInTheDocument();
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    // The notification switches are a preview of a module that does not exist.
    for (const toggle of screen.getAllByRole("switch")) {
      expect(toggle).toBeDisabled();
    }
    expect(
      screen.getByRole("link", { name: "Politika privatnosti" }),
    ).toHaveAttribute("href", "/privatnost");
  });
});
