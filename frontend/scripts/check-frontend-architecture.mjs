import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const sourceRoot = path.join(projectRoot, "src");

/**
 * Existing debt is explicit and bounded. A baseline file may shrink, but it
 * may not grow beyond the reviewed line count. Remove entries as files are
 * decomposed; do not add entries for new code without an ADR/review note.
 *
 * Counts re-anchored 2026-08-01 against Prettier-formatted sources. The
 * original numbers were recorded while `.prettierrc.json`/`.prettierignore`
 * were missing from the repo, so they measured unformatted line breaks:
 * `guidance-flow.tsx` 967 -> 963, `company-configurator-drawer.tsx` 515 -> 517.
 * No responsibility moved in or out of either file.
 *
 * Reduced 2026-08-01 by the workspace refactor: `screen-kompas.tsx` (1843) and
 * `screen-dokumenti.tsx` (1128) were decomposed into component families and no
 * longer exist as single files; `content-revision-editor.tsx` 643 -> 592 after
 * its network lifecycle moved into a feature hook. `taxonomy-term-editor.tsx`
 * was decomposed for F4 Quick Entry and is no longer baseline debt.
 *
 * Re-anchored 2026-08-06: `content-revision-editor.tsx` 593 -> 595, pure
 * Prettier reflow (the committed file had drifted from `prettier --write`'s
 * canonical output). No responsibility moved in or out of the file.
 *
 * Reduced 2026-08-09: `guidance-flow.tsx` 963 -> 950 after the intro CTA row
 * moved into `guidance-intro-actions.tsx`. The baseline is lowered so the
 * decomposition cannot be silently undone.
 *
 * Added 2026-08-11 (ROUTE-I18N-2): `kompas-article-editor.tsx` 393 -> 408.
 * This is NEW debt and is recorded rather than hidden. The file sat 7 lines
 * under the limit and the route migration pushed it over: two
 * `window.location.href` escapes (Rules §35) became router navigations that
 * must resolve the organization locale, which no one-liner can do. The
 * duplicate was already extracted into one `openEntry` helper and the shared
 * `useUiLocale()` hook removed three lines of narrowing — 419 -> 408 — so the
 * cheap reductions are spent. Decomposing the mutation wiring into a feature
 * hook, the way `content-revision-editor.tsx` was, is the real fix and is its
 * own change. Lower this number then; do not raise it again.
 *
 * Re-anchored 2026-08-11 (ROUTE-I18N-2): `content-revision-editor.tsx`
 * 595 -> 596. One import line — the file swapped a hardcoded
 * `const HREF = "/radni-prostor/sadrzaj"` for a `PlatformRouteId`, which needs
 * a type import the string literal did not. No responsibility moved in or out,
 * and the file lost a path literal in the exchange.
 */
const largeFileBaseline = new Map([
  ["src/features/booking/booking-request-form.tsx", 659],
  ["src/features/company/company-configurator-drawer.tsx", 517],
  ["src/features/guidance/guidance-flow.tsx", 950],
  ["src/features/workspace/components/content-revision-editor.tsx", 596],
  [
    "src/features/workspace/components/kompas-sadrzaj/kompas-article-editor.tsx",
    408,
  ],
]);

/**
 * UI files allowed to declare TanStack queries/mutations directly.
 *
 * Emptied 2026-08-01: every workspace surface now goes through a feature hook
 * under `features/workspace/hooks/`. Keep it empty — a new entry here means a
 * component reacquired transport lifecycle that belongs in a hook (Part E §28).
 */
const directQueryBaseline = new Set([]);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function relative(file) {
  return path.relative(projectRoot, file).split(path.sep).join("/");
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

const failures = [];
const warnings = [];
const tsxFiles = walk(sourceRoot).filter((file) => file.endsWith(".tsx"));

for (const file of tsxFiles) {
  const rel = relative(file);
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split("\n").length - (text.endsWith("\n") ? 1 : 0);

  for (const match of text.matchAll(/\bfetch\s*\(/g)) {
    failures.push(
      `${rel}:${lineOf(text, match.index ?? 0)} direct fetch in TSX`,
    );
  }

  for (const match of text.matchAll(/<img\b/g)) {
    failures.push(
      `${rel}:${lineOf(text, match.index ?? 0)} native <img> element`,
    );
  }

  for (const match of text.matchAll(/<Image\b[\s\S]*?\/>/g)) {
    const image = match[0];
    const line = lineOf(text, match.index ?? 0);
    if (/\bpriority(?:\s|=)/.test(image)) {
      failures.push(
        `${rel}:${line} next/image priority prop; use reviewed preload`,
      );
    }
    if (/\bfill(?:\s|=)/.test(image) && !/\bsizes=/.test(image)) {
      failures.push(`${rel}:${line} next/image fill without sizes`);
    }
  }

  if (lines > 400) {
    const baseline = largeFileBaseline.get(rel);
    if (baseline === undefined) {
      failures.push(
        `${rel}:1 ${lines} lines; new TSX file exceeds 400-line limit`,
      );
    } else if (lines > baseline) {
      failures.push(
        `${rel}:1 ${lines} lines; exceeds architecture baseline ${baseline}`,
      );
    } else {
      warnings.push(`${rel}: ${lines} lines (known decomposition debt)`);
    }
  }

  const declaresQuery =
    /\buseQuery\s*\(/.test(text) || /\buseMutation\s*\(/.test(text);
  if (declaresQuery && !directQueryBaseline.has(rel)) {
    failures.push(
      `${rel}: direct useQuery/useMutation in UI; create a feature hook`,
    );
  }

  if (
    /^["']use client["'];/m.test(text) &&
    /from\s+["']server-only["']/.test(text)
  ) {
    failures.push(`${rel}: Client Component imports server-only`);
  }
}

/**
 * Platform paths and `as Route` casts live only in the route registry
 * (D-077 Amendment, ROUTE-I18N-1).
 *
 * A route id is the only stable identity of a screen; the English and Serbian
 * pathnames are presentation values. A literal `/radni-prostor/...` in a
 * component is a path that cannot follow the organization's locale — it keeps
 * working for the Serbian tenant and silently 404s for an English one, which is
 * the failure mode this whole registry exists to remove.
 *
 * The baseline shrinks as ROUTE-I18N-2 migrates call sites; it may never grow.
 * Remove an entry when its file is migrated. Do not add one.
 */
const platformPathLiteralBaseline = new Map([
  ["src/app/(superadmin)/superadmin/tenants/[tenantId]/page.tsx", 1],
  ["src/features/workspace/components/screen-pregled.tsx", 2],
  ["src/lib/auth/routes.ts", 4],
]);

const platformPathPattern =
  /["'`](?:\/radni-prostor|\/workspace|\/superadmin|\/nalog|\/account)(?:\/[^"'`$]*)?["'`]/g;

const routeRegistryDir = "src/lib/routes/";

for (const file of walk(sourceRoot)) {
  if (!file.endsWith(".ts") && !file.endsWith(".tsx")) continue;
  const rel = relative(file);
  if (rel.startsWith(`src/${routeRegistryDir.slice(4)}`)) continue;
  if (rel.endsWith(".test.ts") || rel.endsWith(".test.tsx")) continue;

  const text = fs.readFileSync(file, "utf8");
  const code = text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
  const hits = [...code.matchAll(platformPathPattern)].length;
  const baseline = platformPathLiteralBaseline.get(rel) ?? 0;

  if (hits > baseline) {
    failures.push(
      `${rel}: ${hits} platform path literal(s); baseline ${baseline}. ` +
        `Use localizedPath() from src/lib/routes/ — a literal cannot follow the organization locale`,
    );
  } else if (hits < baseline) {
    warnings.push(
      `${rel}: ${hits} platform path literal(s), baseline ${baseline} — lower the baseline`,
    );
  }
}

/**
 * The public rendering contract (D-077, C2(a)).
 *
 * Public routes are SSG/ISR. Next.js treats `headers()`, `cookies()` and
 * `draftMode()` as request-time APIs, and any one of them anywhere in a route's
 * render tree opts that route out of static rendering. These modules are
 * reached from `i18n/request.ts`, which runs inside every translated render
 * including the root layout — so a single request-API call in any of them
 * silently converts the entire public site to per-request SSR.
 *
 * "Silently" is why this is a static check and not a test: nothing throws, no
 * assertion fails, and the only symptom is a `○`/`●` turning into `ƒ` in build
 * output nobody reads on a green PR.
 *
 * Tenant identity for the public surface may come from deployment config,
 * build-time env, a cached organization config under a statically known
 * organization id, a static/ISR route param, or an explicit locale argument.
 * It may never come from the `Host` header, an `X-Organization-*` header, a
 * browser cookie, or `Accept-Language`.
 */
const ssgSafeModules = [
  // The one that matters most: `getRequestConfig` runs inside every translated
  // render, including the root layout, so a request-time API here converts the
  // whole public site to SSR in a single commit.
  "src/i18n/request.ts",
  "src/i18n/locales.ts",
  "src/lib/tenant/organizations.ts",
  "src/lib/tenant/org-context.ts",
  "src/lib/tenant/public-locale.ts",
];

const requestTimeApiPattern =
  /from\s+["']next\/headers["']|\b(?:headers|cookies|draftMode)\s*\(\s*\)/;

for (const rel of ssgSafeModules) {
  const absolute = path.join(projectRoot, rel);
  if (!fs.existsSync(absolute)) {
    warnings.push(`${rel}: remove stale SSG-safe module entry`);
    continue;
  }
  const text = fs.readFileSync(absolute, "utf8");
  // Comments legitimately name the forbidden APIs while explaining the rule.
  const code = text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
  const match = code.match(requestTimeApiPattern);
  if (match) {
    failures.push(
      `${rel}:${lineOf(code, match.index ?? 0)} request-time API "${match[0]}" ` +
        `in an SSG-safe module; this drops the public site to per-request SSR`,
    );
  }
}

for (const baselinePath of largeFileBaseline.keys()) {
  if (!fs.existsSync(path.join(projectRoot, baselinePath))) {
    warnings.push(`${baselinePath}: remove stale large-file baseline entry`);
  }
}

for (const baselinePath of directQueryBaseline) {
  if (!fs.existsSync(path.join(projectRoot, baselinePath))) {
    warnings.push(`${baselinePath}: remove stale direct-query baseline entry`);
  }
}

if (warnings.length > 0) {
  console.warn("Architecture baseline warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (failures.length > 0) {
  console.error("Architecture check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Architecture check passed for ${tsxFiles.length} TSX files.`);
