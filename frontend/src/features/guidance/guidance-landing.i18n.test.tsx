import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { withIntl } from "@/test-support/intl";

import { GuidanceFlow } from "./guidance-flow";

vi.mock("./hooks/use-public-intake-queries", () => ({
  usePublicIntakeCapabilities: () => ({ data: null }),
  useAuthoritativeIntakeMatch: () => ({ data: null, isError: false }),
}));

describe("find-support landing", () => {
  it("renders English copy and localized CTA routes", () => {
    render(withIntl(<GuidanceFlow entry="page" surface="page" />, "en"));

    expect(
      screen.getByRole("heading", { name: "Find support that suits you" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Start the questionnaire" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Explore therapists yourself" }),
    ).toHaveAttribute("href", "/team");
    expect(
      screen.getByRole("link", { name: "Book an appointment" }),
    ).toHaveAttribute("href", "/book?source=therapist");
  });

  it("keeps the Serbian landing and routes", () => {
    render(withIntl(<GuidanceFlow entry="page" surface="page" />, "sr-Latn"));

    expect(
      screen.getByRole("heading", {
        name: "Pronađite podršku koja vam odgovara",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Samostalno upoznajte terapeute" }),
    ).toHaveAttribute("href", "/tim");
    expect(screen.getByRole("link", { name: "Zakaži termin" })).toHaveAttribute(
      "href",
      "/zakazi?source=therapist",
    );
  });
});
