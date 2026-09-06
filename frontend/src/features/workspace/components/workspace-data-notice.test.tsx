import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import type { UiLocale } from "@/i18n/locales";
import { getPlatformMessages } from "@/messages";

import { WorkspaceDataNotice } from "./workspace-data-notice";

function notice(locale: UiLocale) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={getPlatformMessages(locale)}
      timeZone="Europe/Belgrade"
    >
      <WorkspaceDataNotice />
    </NextIntlClientProvider>
  );
}

describe("WorkspaceDataNotice", () => {
  it("labels showcase data in both UI locales without a refresh", () => {
    const view = render(notice("en"));
    expect(screen.getByText("Showcase data")).toBeVisible();
    expect(
      screen.getByText(/separate from organization records/),
    ).toBeVisible();

    view.rerender(notice("sr-Latn"));
    expect(screen.getByText("Showcase podaci")).toBeVisible();
    expect(
      screen.getByText(/odvojeni su od zapisa organizacije/),
    ).toBeVisible();
  });
});
