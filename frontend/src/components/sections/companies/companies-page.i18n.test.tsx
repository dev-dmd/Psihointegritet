import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CompanyProvider } from "@/features/company/company-context";
import { withIntl } from "@/test-support/intl";

import { CompaniesPage } from "./companies-page";

vi.mock("@/components/motion/reveal", () => ({
  Reveal: ({ children }: { children: React.ReactNode }) => children,
}));

function renderPage(locale: "en" | "sr-Latn") {
  return render(
    withIntl(
      <CompanyProvider>
        <CompaniesPage />
      </CompanyProvider>,
      locale,
    ),
  );
}

describe("companies page localization", () => {
  it("renders the B2B page and configurator in English", async () => {
    const user = userEvent.setup();
    renderPage("en");

    expect(
      screen.getByRole("heading", { name: "Support for organizations" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Employee privacy")).toBeInTheDocument();

    await user.click(
      screen.getAllByRole("button", { name: "Configure a program" })[0]!,
    );
    const dialog = screen.getByRole("dialog", {
      name: "Programs for organizations",
    });
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "How can we support your organization?",
      }),
    ).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole("button", { name: "Configure a program" }),
    );
    expect(
      screen.getByRole("heading", { name: "How many employees do you have?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Up to 20" }),
    ).toBeInTheDocument();
  });

  it("keeps the approved Serbian presentation", () => {
    renderPage("sr-Latn");
    expect(
      screen.getByRole("heading", { name: "Rad sa kompanijama" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Privatnost zaposlenih")).toBeInTheDocument();
  });
});
