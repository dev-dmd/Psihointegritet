import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { RichDoc } from "@/lib/content-governance/rich-doc";

import { importRichDocDocx } from "../../content-api";
import { KompasDocxImport } from "./kompas-docx-import";

const converted: RichDoc = {
  schemaVersion: 1,
  blocks: [
    {
      type: "paragraph",
      id: "b1",
      spans: [{ text: "Gubitak je dio života.", marks: [] }],
    },
  ],
};

function stubImport(body: unknown, findings: unknown[] = [], status = 200) {
  const fetchMock = vi.fn(async (input: unknown, init?: RequestInit) => {
    void init;
    void input;
    return new Response(JSON.stringify({ body, findings }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderImport(props: {
  hasExistingText: boolean;
  onImported: (body: RichDoc) => void;
}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <KompasDocxImport {...props} />
    </QueryClientProvider>,
  );
}

function docx(name = "tugovanje.docx") {
  return new File(["PK"], name, {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("Uvoz Word dokumenta u telo članka", () => {
  it("converts the file and hands the text to the editor, storing nothing", async () => {
    const fetchMock = stubImport(converted);
    const onImported = vi.fn();
    const user = userEvent.setup();
    renderImport({ hasExistingText: false, onImported });

    await user.upload(
      screen.getByLabelText("Word dokument sa tekstom članka"),
      docx(),
    );

    await waitFor(() => expect(onImported).toHaveBeenCalledWith(converted));
    // Preview only: one POST to the import endpoint, no revision write.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "/api/content/rich-doc/import-docx",
    );
  });

  it("asks before replacing text that is already there", async () => {
    stubImport(converted);
    const onImported = vi.fn();
    const user = userEvent.setup();
    renderImport({ hasExistingText: true, onImported });

    await user.upload(
      screen.getByLabelText("Word dokument sa tekstom članka"),
      docx(),
    );

    expect(await screen.findByText("Ovde već postoji tekst.")).toBeVisible();
    expect(onImported).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Zadrži postojeći" }));
    expect(onImported).not.toHaveBeenCalled();
  });

  it("replaces only when the author says so", async () => {
    stubImport(converted);
    const onImported = vi.fn();
    const user = userEvent.setup();
    renderImport({ hasExistingText: true, onImported });

    await user.upload(
      screen.getByLabelText("Word dokument sa tekstom članka"),
      docx(),
    );
    await user.click(
      await screen.findByRole("button", { name: "Zameni tekst" }),
    );
    expect(onImported).toHaveBeenCalledWith(converted);
  });

  it("tells the author what the conversion changed", async () => {
    stubImport(converted, [
      {
        ruleId: "DOCX-004",
        ruleVersion: "1",
        severity: "warning",
        message: "Tabela je uklonjena jer nije podržana.",
        remediation: "Prepišite sadržaj tabele kao pasuse.",
        fieldPath: null,
      },
    ]);
    const user = userEvent.setup();
    renderImport({ hasExistingText: false, onImported: vi.fn() });

    await user.upload(
      screen.getByLabelText("Word dokument sa tekstom članka"),
      docx(),
    );

    expect(
      await screen.findByText("Tabela je uklonjena jer nije podržana."),
    ).toBeVisible();
  });

  it("refuses a file that is not a .docx without calling the server", async () => {
    // The input carries `accept=".docx"`, so the browser (and Testing
    // Library's `upload`) already filters. The client guard is the second line
    // of defence for a drag-drop or a programmatic call, and is asserted
    // directly because the input will not let the bad file through.
    const fetchMock = stubImport(converted);
    await expect(importRichDocDocx(docx("tekst.pdf"))).rejects.toThrow(
      /nije \.docx/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
