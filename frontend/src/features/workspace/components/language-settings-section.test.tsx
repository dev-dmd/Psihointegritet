import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { getPlatformMessages } from "@/messages";

import { WorkspaceProvider } from "../workspace-context";
import { LanguageSettingsSection } from "./language-settings-section";

vi.mock("next/navigation", () => ({
  usePathname: () => "/workspace/settings",
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("../organization-api", () => ({
  updateOrganizationLocales: vi.fn(),
}));

describe("LanguageSettingsSection initial render", () => {
  it("renders bootstrap locale values immediately without a client GET loader", () => {
    const messages = getPlatformMessages("en");
    const queryClient = new QueryClient();

    render(
      <NextIntlClientProvider
        locale="en"
        messages={messages}
        timeZone="Europe/Belgrade"
      >
        <QueryClientProvider client={queryClient}>
          <WorkspaceProvider
            isAdmin
            isTherapist={false}
            displayName="Admin"
            initialOrganization={{
              slug: "psihointegritet",
              uiLocale: "en",
              defaultContentLocale: "sr-Latn",
            }}
          >
            <LanguageSettingsSection />
          </WorkspaceProvider>
        </QueryClientProvider>
      </NextIntlClientProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Language and regional settings" }),
    ).toBeVisible();
    expect(screen.getByRole("combobox")).toHaveValue("en");
    expect(screen.getAllByText("Srpski — latinica")).toHaveLength(2);
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
  });
});
