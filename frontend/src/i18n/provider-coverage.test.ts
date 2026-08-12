import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..");

/**
 * Every namespace a subtree asks for must be handed to that subtree's provider.
 *
 * This exists because it already failed in production: the `superadmin`
 * namespace was added to the catalogue and to `gates-table.tsx`, but not to the
 * superadmin layout's `NextIntlClientProvider`, and the panel died with
 * `MISSING_MESSAGE: Could not resolve 'superadmin'`.
 *
 * Nothing caught it. Types cannot — `messages` is a plain object, and the
 * namespace argument is checked against the *catalogue*, not against what the
 * provider was given. Unit tests did not either, because they render components
 * through `withIntl()`, which hands over the whole catalogue and so is exactly
 * the wrong shape to catch a provider that under-supplies.
 *
 * A static check is the honest tool here: the mistake is a mismatch between two
 * files, and it costs one line in each to keep them in step.
 */

interface Subtree {
  /** Layout that mounts the provider. */
  layout: string;
  /** Directories whose components render under it. */
  roots: string[];
}

/**
 * Shared chrome lives outside every feature directory but renders inside all of
 * them. Leaving it out was a blind spot: `LogoutAvatarMenu` asked for a
 * namespace the client panel did not provide, and the test still passed.
 */
const SHARED_ROOTS = ["components/shared", "components/panel"];

const SUBTREES: Subtree[] = [
  {
    layout: "app/(staff)/workspace/layout.tsx",
    roots: ["app/(staff)/workspace", "features/workspace", ...SHARED_ROOTS],
  },
  {
    layout: "app/(superadmin)/superadmin/layout.tsx",
    roots: [
      "app/(superadmin)/superadmin",
      "features/superadmin",
      ...SHARED_ROOTS,
    ],
  },
  {
    layout: "app/(client)/layout.tsx",
    roots: ["app/(client)", "features/account", ...SHARED_ROOTS],
  },
];

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const absolute = join(directory, entry);
    return statSync(absolute).isDirectory()
      ? walk(absolute)
      : [absolute].filter((f) => /\.tsx?$/.test(f) && !f.includes(".test."));
  });
}

function namespacesUsedIn(roots: string[]): Set<string> {
  const used = new Set<string>();
  for (const root of roots) {
    for (const file of walk(join(SRC, root))) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(
        /use(?:Translations|Formatter)\(\s*["'`]([\w.]+)["'`]/g,
      )) {
        // Only the top-level namespace crosses the provider boundary.
        used.add((match[1] ?? "").split(".")[0] ?? "");
      }
    }
  }
  used.delete("");
  return used;
}

function namespacesProvidedBy(layout: string): Set<string> {
  const source = readFileSync(join(SRC, layout), "utf8");
  const match = source.match(/messages=\{\{([^}]*)\}\}/);
  if (!match) return new Set();
  return new Set(
    (match[1] ?? "")
      .split(",")
      .map((part) => part.trim().split(":")[0]?.trim() ?? "")
      .filter(Boolean),
  );
}

describe("panel locale", () => {
  /**
   * Two mistakes that produced one symptom: the panel kept rendering in the
   * previous language while the URL and the settings screen had already moved.
   *
   * The layouts called `getUiLocale()`, which reports what next-intl rendered
   * with — and `i18n/request.ts` deliberately resolves the *public*
   * `default_content_locale`, so the public site can stay static. Authenticated
   * surfaces belong to `ui_locale` (D-077), which is what
   * `resolveWorkspaceLocale()` returns.
   *
   * And the provider was mounted without an explicit `locale`, so it inherited
   * the root one — the public locale again — while its messages came from the
   * variable above. Two values for the language of one subtree.
   */
  it.each(SUBTREES)(
    "$layout resolves ui_locale, not the public one",
    ({ layout }) => {
      const source = readFileSync(join(SRC, layout), "utf8");
      expect(source, `${layout} must use resolveWorkspaceLocale()`).toContain(
        "resolveWorkspaceLocale()",
      );
      expect(source, `${layout} must not use getUiLocale()`).not.toContain(
        "getUiLocale()",
      );
    },
  );

  it.each(SUBTREES)(
    "$layout hands its provider an explicit locale",
    ({ layout }) => {
      const source = readFileSync(join(SRC, layout), "utf8");
      const provider = source.slice(source.indexOf("<NextIntlClientProvider"));
      expect(
        provider.slice(0, provider.indexOf(">")),
        `${layout} lets the provider inherit the root locale`,
      ).toContain("locale={locale}");
    },
  );
});

describe("intl provider coverage", () => {
  it.each(SUBTREES)(
    "$layout provides every namespace its subtree uses",
    ({ layout, roots }) => {
      const used = namespacesUsedIn(roots);
      const provided = namespacesProvidedBy(layout);
      const missing = [...used].filter((ns) => !provided.has(ns)).sort();

      expect(
        missing,
        `${layout} does not hand these namespaces to its provider — the ` +
          `components asking for them will throw MISSING_MESSAGE at runtime`,
      ).toEqual([]);
    },
  );

  it.each(SUBTREES)(
    "$layout ships nothing its subtree never asks for",
    ({ layout, roots }) => {
      // The other direction. A namespace nobody reads is dead weight serialised
      // to every client in that subtree — and usually the residue of a component
      // that moved elsewhere.
      const used = namespacesUsedIn(roots);
      const provided = namespacesProvidedBy(layout);
      // `common` is shared chrome that any screen may reach for; it is exempt.
      const unused = [...provided].filter(
        (ns) => ns !== "common" && !used.has(ns),
      );

      expect(unused, `${layout} provides namespaces nothing reads`).toEqual([]);
    },
  );
});
