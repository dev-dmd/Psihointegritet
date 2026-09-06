import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { JsonRequestError } from "@/lib/api/request-json";

import { presentUserSafeError } from "./user-safe-error";

const fixture = JSON.parse(
  readFileSync(
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../../../../contracts/fixtures/public-api-error-codes.v1.json",
    ),
    "utf-8",
  ),
) as { codes: string[] };

describe("central user-safe error presentation", () => {
  it("ignores backend prose and technical identifiers", () => {
    const presentation = presentUserSafeError(
      Object.assign(new Error("Contact support with correlation ID secret-1"), {
        status: 500,
        code: "internal_error",
        title: "Internal server error",
        detail: "Database password leaked",
        correlationId: "secret-1",
        digest: "secret-2",
      }),
      { locale: "en", surface: "content", operation: "change" },
    );
    const rendered = JSON.stringify(presentation);

    expect(presentation).toEqual({
      message: "The content change was not completed.",
      nextAction: "Check your connection and try again.",
      fieldErrors: {},
    });
    expect(rendered).not.toMatch(
      /Internal|Database|correlation|digest|secret|Contact support/,
    );
  });

  it("uses surface-specific copy for the same stable code", () => {
    const error = new JsonRequestError(409, "raw backend text", "http_error");
    expect(
      presentUserSafeError(error, {
        locale: "sr-Latn",
        surface: "legal",
        operation: "publish",
      }).message,
    ).toBe("Dokument nije objavljen.");
    expect(
      presentUserSafeError(error, {
        locale: "sr-Latn",
        surface: "compass",
        operation: "publish",
      }).message,
    ).toBe("Kompas tok nije objavljen.");
  });

  it("localizes field error codes without rendering validator prose", () => {
    const error = new JsonRequestError(
      422,
      "Value error from Pydantic",
      "validation_error",
      undefined,
      undefined,
      { "body.sort_order": [{ code: "int_parsing" }] },
    );
    expect(
      presentUserSafeError(error, {
        locale: "sr-Latn",
        surface: "taxonomy",
        operation: "change",
      }).fieldErrors,
    ).toEqual({ sortOrder: "Unesite ceo broj." });
  });

  it("does not claim that unsaved input remains on screen", () => {
    for (const locale of ["en", "sr-Latn"] as const) {
      const presentation = presentUserSafeError(new TypeError("fetch failed"), {
        locale,
        surface: "content",
        operation: "change",
      });
      expect(JSON.stringify(presentation)).not.toMatch(
        /still on screen|ostao na ekranu/i,
      );
    }
  });

  it.each(fixture.codes)(
    "gives backend code %s controlled copy or a localized safe fallback",
    (code) => {
      for (const locale of ["en", "sr-Latn"] as const) {
        const presentation = presentUserSafeError(
          new JsonRequestError(422, `raw ${code}`, code),
          { locale, surface: "generic", operation: "request" },
        );
        const rendered = `${presentation.message} ${presentation.nextAction}`;
        expect(rendered.trim()).not.toBe("");
        expect(rendered).not.toContain(code);
        expect(rendered).not.toContain("undefined");
        expect(rendered).not.toContain("null");
      }
    },
  );
});
