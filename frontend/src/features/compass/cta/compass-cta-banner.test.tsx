import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { withIntl } from "@/test-support/intl";

import { CompassCtaBanner } from "./compass-cta-banner";
import { compassCtaSchemes } from "./cta-schemes";

describe("Compass CTA banner locale", () => {
  it("renders the English banner catalog", () => {
    render(
      withIntl(
        <CompassCtaBanner
          variant="B"
          scheme={compassCtaSchemes.cream}
          onStart={vi.fn()}
        />,
        "en",
      ),
    );

    expect(
      screen.getByRole("heading", { name: "Kompas for mental health" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Start Compass" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Questions can be skipped")).toBeInTheDocument();
  });

  it("renders the Serbian banner catalog", () => {
    render(
      withIntl(
        <CompassCtaBanner
          variant="C"
          scheme={compassCtaSchemes.cream}
          onStart={vi.fn()}
        />,
      ),
    );

    expect(
      screen.getByRole("button", { name: "Pokreni Kompas" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Pitanja možete preskočiti/)).toBeInTheDocument();
  });
});
