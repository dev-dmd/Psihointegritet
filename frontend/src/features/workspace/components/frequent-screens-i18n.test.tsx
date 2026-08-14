import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import type { UiLocale } from "@/i18n/locales";
import { getPlatformMessages } from "@/messages";

import { WorkspaceProvider } from "../workspace-context";
import { ScreenKlijenti } from "./screen-klijenti";
import { ScreenKompanije } from "./screen-kompanije";
import { ScreenProfil } from "./screen-profil";
import { ScreenTerapeuti } from "./screen-terapeuti";
import { ScreenTermini } from "./screen-termini";
import { ScreenUsluge } from "./screen-usluge";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function frequentScreens(locale: UiLocale) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={getPlatformMessages(locale)}
      timeZone="Europe/Belgrade"
    >
      <QueryClientProvider client={queryClient}>
        <WorkspaceProvider
          isAdmin
          isTherapist={false}
          displayName="Admin"
          initialOrganization={{
            slug: "psihointegritet",
            uiLocale: locale,
            defaultContentLocale: "sr-Latn",
          }}
        >
          <ScreenTermini />
          <ScreenKlijenti />
          <ScreenKompanije />
          <ScreenUsluge />
          <ScreenTerapeuti />
          <ScreenProfil />
        </WorkspaceProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>
  );
}

describe("frequent workspace screen translations", () => {
  it("updates screen chrome en -> sr-Latn without a refresh", () => {
    const view = render(frequentScreens("en"));

    for (const heading of [
      "Appointments",
      "Clients",
      "Organizations",
      "Services and pricing",
      "Therapists",
      "My profile",
    ]) {
      expect(screen.getByRole("heading", { name: heading })).toBeVisible();
    }
    expect(screen.getByRole("tab", { name: "Public profile" })).toBeVisible();
    expect(screen.getByText("Areas of work — public")).toBeVisible();

    view.rerender(frequentScreens("sr-Latn"));

    for (const heading of [
      "Termini",
      "Klijenti",
      "Kompanije",
      "Usluge i cene",
      "Terapeuti",
      "Moj profil",
    ]) {
      expect(screen.getByRole("heading", { name: heading })).toBeVisible();
    }
    expect(screen.getByRole("tab", { name: "Javni profil" })).toBeVisible();
    expect(screen.getByText("Oblasti rada — javno")).toBeVisible();
  });

  it("keeps stable profile tab ids while translating their labels", async () => {
    const user = userEvent.setup();
    const view = render(frequentScreens("en"));

    await user.click(screen.getByRole("tab", { name: "Matching preferences" }));
    expect(screen.getByText("Who they accept")).toBeVisible();

    view.rerender(frequentScreens("sr-Latn"));
    expect(
      screen.getByRole("tab", { name: "Matching preferencije" }),
    ).toBeVisible();
    expect(screen.getByText("Koga prima")).toBeVisible();
  });
});
