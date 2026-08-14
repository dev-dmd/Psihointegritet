import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { content as enContent } from "@/messages/en/content";
import { content as srContent } from "@/messages/sr-Latn/content";

import { ContentFieldOverrideEditor } from "./content-field-override-editor";

function renderEditor(locale: "en" | "sr-Latn", onChange = vi.fn()) {
  const content = locale === "en" ? enContent : srContent;
  render(
    <NextIntlClientProvider
      locale={locale}
      messages={{ content } as AbstractIntlMessages}
    >
      <ContentFieldOverrideEditor
        template="service_detail"
        slotName="hero"
        fieldName="lead"
        spec={{ kind: "text", limit: "heroLead" }}
        value="Legacy tenant text"
        onChange={onChange}
      />
    </NextIntlClientProvider>,
  );
  return onChange;
}

describe("ContentFieldOverrideEditor", () => {
  it("shows an old primitive as Customized and writes the explicit wrapper", () => {
    const onChange = renderEditor("en");

    expect(screen.getByRole("button", { name: "Customized" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Lead" }), {
      target: { value: "New lead" },
    });

    expect(onChange).toHaveBeenLastCalledWith({
      mode: "custom",
      value: "New lead",
    });
  });

  it("renders and applies the Serbian hidden status for a whitelisted field", async () => {
    const user = userEvent.setup();
    const onChange = renderEditor("sr-Latn");

    await user.click(screen.getByRole("button", { name: "Sakriveno" }));
    expect(onChange).toHaveBeenLastCalledWith({ mode: "hidden" });
    expect(screen.getByRole("button", { name: "Početni tekst" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Prilagođeno" })).toBeVisible();
  });

  it("does not offer Hidden for required H1 fields", () => {
    render(
      <NextIntlClientProvider locale="en" messages={{ content: enContent }}>
        <ContentFieldOverrideEditor
          template="service_detail"
          slotName="hero"
          fieldName="title"
          spec={{ kind: "text", limit: "pageH1", required: true }}
          value={{ mode: "inherit" }}
          onChange={vi.fn()}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.queryByRole("button", { name: "Hidden" })).toBeNull();
  });
});
