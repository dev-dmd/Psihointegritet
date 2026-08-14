import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { systemContentCatalog } from "@/lib/content-governance/system-content-catalog";
import { getPlatformMessages } from "@/messages";

import { ContentEntryList } from "./content-entry-list";

describe("ContentEntryList progressive loading", () => {
  it("shows all 12 page definitions while revision status is pending", () => {
    const messages = getPlatformMessages("sr-Latn");

    render(
      <NextIntlClientProvider
        locale="sr-Latn"
        messages={messages}
        timeZone="Europe/Belgrade"
      >
        <ContentEntryList
          entries={[]}
          catalogue={systemContentCatalog}
          activeType="static_page"
          onTypeChange={vi.fn()}
          selectedEntryId={null}
          onSelect={vi.fn()}
          onOpen={vi.fn()}
          openingIdentity={null}
          openError={null}
          isInitialSync
        />
      </NextIntlClientProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Stranice (12)" }),
    ).toBeVisible();
    expect(screen.getAllByRole("status")).toHaveLength(12);
    expect(screen.getAllByText("Proveravam status…")).toHaveLength(12);
    expect(screen.queryByText("Fallback iz koda")).not.toBeInTheDocument();
    for (const row of screen.getAllByRole("button").slice(6)) {
      expect(row).toBeDisabled();
    }
  });
});
