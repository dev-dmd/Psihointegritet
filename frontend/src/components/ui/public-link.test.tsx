import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { withIntl } from "@/test-support/intl";

import { PublicLink } from "./public-link";

describe("PublicLink", () => {
  it("localizes a registered dynamic route and preserves its query", () => {
    render(
      withIntl(
        <PublicLink href="/tim/maria-bullock?source=card">
          Meet Maria
        </PublicLink>,
        "en",
      ),
    );

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/team/maria-bullock?source=card",
    );
  });

  it("leaves an external URL unchanged", () => {
    render(
      withIntl(
        <PublicLink href="https://example.com/tim/maria">Help</PublicLink>,
        "en",
      ),
    );

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "https://example.com/tim/maria",
    );
  });
});
