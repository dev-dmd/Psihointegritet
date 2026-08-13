import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import type { UiLocale } from "@/i18n/locales";
import { getPlatformMessages } from "@/messages";

import { useFallbackContent } from "./use-content";

function WorkspaceDemoProbe() {
  const demo = useFallbackContent().workspaceDemo;
  return (
    <div>
      <span data-testid="card">{demo.priorityCards[0]?.title}</span>
      <span data-testid="appointment">
        {demo.appointmentRequests[0]?.service}
      </span>
      <span data-testid="client">{demo.clients[0]?.service}</span>
      <span data-testid="company">{demo.companies[0]?.model}</span>
      <span data-testid="service">{demo.serviceCatalog[0]?.name}</span>
      <span data-testid="therapist">{demo.therapistCards[0]?.title}</span>
    </div>
  );
}

function localizedProbe(locale: UiLocale) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={getPlatformMessages(locale)}
      timeZone="Europe/Belgrade"
    >
      <WorkspaceDemoProbe />
    </NextIntlClientProvider>
  );
}

describe("live workspace fallback content", () => {
  it("switches every demo catalogue en -> sr-Latn -> en without a refresh", () => {
    const view = render(localizedProbe("en"));

    expect(screen.getByTestId("card")).toHaveTextContent(
      "Requests awaiting confirmation",
    );
    expect(screen.getByTestId("appointment")).toHaveTextContent(
      "Individual psychotherapy",
    );
    expect(screen.getByTestId("client")).toHaveTextContent(
      "Individual psychotherapy",
    );
    expect(screen.getByTestId("company")).toHaveTextContent(
      "Flexible fund of individual appointments",
    );
    expect(screen.getByTestId("service")).toHaveTextContent(
      "Individual psychotherapy",
    );
    expect(screen.getByTestId("therapist")).toHaveTextContent(
      "Founder of Psihointegritet",
    );

    view.rerender(localizedProbe("sr-Latn"));
    expect(screen.getByTestId("card")).toHaveTextContent(
      "Zahteva čeka potvrdu",
    );
    expect(screen.getByTestId("appointment")).toHaveTextContent(
      "Individualna psihoterapija",
    );
    expect(screen.getByTestId("client")).toHaveTextContent(
      "Individualna psihoterapija",
    );
    expect(screen.getByTestId("company")).toHaveTextContent(
      "Fleksibilni fond individualnih termina",
    );
    expect(screen.getByTestId("service")).toHaveTextContent(
      "Individualna psihoterapija",
    );
    expect(screen.getByTestId("therapist")).toHaveTextContent(
      "Osnivačica Psihointegriteta",
    );

    view.rerender(localizedProbe("en"));
    expect(screen.getByTestId("card")).toHaveTextContent(
      "Requests awaiting confirmation",
    );
    expect(screen.getByTestId("service")).toHaveTextContent(
      "Individual psychotherapy",
    );
  });
});
