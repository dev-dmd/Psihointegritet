import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

/**
 * `next/font/google` is a build-time transform, not a runtime module: outside
 * `next build` the loaders are not functions and any import of a font module
 * throws before a single assertion runs.
 *
 * Mocked here rather than per test file because the failure is transitive — a
 * page importing a component importing a font is enough — so the next person
 * to hit it would be debugging a stack trace three modules from the cause.
 *
 * The shape matches what `next/font` returns: a class, a CSS variable name and
 * a style object. Faces are listed explicitly because Vitest validates that a
 * mocked module actually exports what importers ask for — add a line here when
 * a new face is introduced, and the failure will say which.
 */
vi.mock("next/font/google", () => {
  const face = () => ({
    className: "font-mock",
    variable: "--font-mock",
    style: { fontFamily: "mock" },
  });
  return {
    Instrument_Sans: face,
    Newsreader: face,
    Playfair_Display: face,
  };
});

afterEach(() => {
  cleanup();
});
