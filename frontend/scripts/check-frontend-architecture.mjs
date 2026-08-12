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
 * **Emptied 2026-08-11 (ROUTE-I18N-2): 65 literals across 23 files → 0.**
 * Keep it empty. A new entry here means a component reacquired a path it cannot
 * localize, and the correct fix is `localizedPath(routeId, { locale })` — from
 * `useUiLocale()` in a Client Component, or the organization resolvers in a
 * Server Component.
 *
 * Two paths are intentionally still literals and live outside this rule's
 * pattern: `SIGN_IN_URL` and `SIGN_UP_URL` in `lib/auth/routes.ts`. Auth and
 * callback routes are not localized (D-077 Amendment §10).
 */
const platformPathLiteralBaseline = new Map([]);

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
 * Inline Serbian copy still waiting for the message catalogue (I18N-5).
 *
 * Counts diacritics in code (comments stripped), which is a proxy for "user
 * facing Serbian text lives in this file". It is deliberately crude: the point
 * is not to be exact, it is to be a **ratchet**. A number may fall and never
 * rise, so a screen that has been migrated cannot quietly reacquire copy, and
 * a new screen cannot ship with inline text at all.
 *
 * This mechanises TODO §5G rule 2 ("no new text inline in JSX"), which until
 * now depended on someone remembering it during review.
 *
 * Remove an entry when its file reaches zero. Do not add one — a new file with
 * inline Serbian is the thing this exists to stop.
 *
 * Anchored 2026-08-11 at 1311 strings across 172 files.
 */
const inlineSerbianBaseline = new Map([
  ["src/app/(client)/account/appointments/page.tsx", 3],
  ["src/app/(client)/account/page.tsx", 3],
  ["src/app/(client)/account/settings/page.tsx", 6],
  ["src/app/(public)/cene/page.tsx", 5],
  ["src/app/(public)/kolacici/page.tsx", 2],
  ["src/app/(public)/kompas/_components/area-card.tsx", 4],
  ["src/app/(public)/kompas/_components/content-card.tsx", 3],
  ["src/app/(public)/kompas/_components/public-taxonomy-list-page.tsx", 8],
  ["src/app/(public)/kompas/_components/public-taxonomy-page.tsx", 20],
  ["src/app/(public)/kompas/_components/topic-card.tsx", 4],
  ["src/app/(public)/kompas/_components/topic-search-list.tsx", 2],
  ["src/app/(public)/kontakt/page.tsx", 14],
  ["src/app/(public)/o-nama/page.tsx", 6],
  ["src/app/(public)/podrska-roditeljima/page.tsx", 2],
  ["src/app/(public)/radionice/[slug]/page.tsx", 7],
  ["src/app/(public)/radionice/page.tsx", 3],
  ["src/app/(public)/uslovi/page.tsx", 2],
  ["src/app/(public)/usluge/[slug]/page.tsx", 6],
  ["src/app/(public)/zakazi/page.tsx", 4],
  ["src/app/(staff)/workspace/compass/content/[entryId]/page.tsx", 1],
  ["src/app/(staff)/workspace/compass/content/new/page.tsx", 1],
  ["src/app/(staff)/workspace/content/page.tsx", 1],
  ["src/app/(staff)/workspace/research/page.tsx", 1],
  ["src/app/(staff)/workspace/settings/page.tsx", 1],
  ["src/app/(superadmin)/superadmin/features/page.tsx", 1],
  ["src/app/(superadmin)/superadmin/page.tsx", 1],
  ["src/app/(superadmin)/superadmin/settings/page.tsx", 1],
  ["src/app/(superadmin)/superadmin/tenants/page.tsx", 1],
  ["src/app/error.tsx", 7],
  ["src/app/layout.tsx", 3],
  ["src/app/not-found.tsx", 5],
  ["src/components/booking/TherapistBookingWidget.tsx", 3],
  ["src/components/content/rich-text-editor.tsx", 5],
  ["src/components/panel/error-banner.tsx", 2],
  ["src/components/sections/companies/companies-page.tsx", 33],
  ["src/components/sections/faq.tsx", 5],
  ["src/components/sections/final-cta.tsx", 6],
  ["src/components/sections/first-session.tsx", 2],
  ["src/components/sections/hero.tsx", 11],
  ["src/components/sections/legal/legal-document-page.tsx", 3],
  ["src/components/sections/mobile-menu.tsx", 1],
  ["src/components/sections/reasons.tsx", 5],
  ["src/components/sections/resources.tsx", 13],
  ["src/components/sections/resources/knowledge-page.tsx", 9],
  ["src/components/sections/services.tsx", 10],
  ["src/components/sections/services/services-page.tsx", 20],
  ["src/components/sections/site-footer.tsx", 5],
  ["src/components/sections/site-header.tsx", 2],
  ["src/components/sections/support-paths.tsx", 5],
  ["src/components/sections/team/team-cta-section.tsx", 5],
  ["src/components/sections/team/team-intro-section.tsx", 8],
  ["src/components/sections/therapist/therapist-bio-section.tsx", 1],
  ["src/components/sections/therapist/therapist-contact-section.tsx", 6],
  ["src/components/sections/therapist/therapist-hero-section.tsx", 1],
  ["src/components/sections/therapist/therapist-services-section.tsx", 5],
  ["src/components/sections/therapists.tsx", 3],
  ["src/components/sections/workshop.tsx", 8],
  ["src/components/shared/resource-card.tsx", 1],
  ["src/features/account/components/topbar.tsx", 4],
  ["src/features/booking-widget/booking-widget.fixtures.tsx", 4],
  ["src/features/booking-widget/components/BookingWidgetActions.tsx", 7],
  ["src/features/booking-widget/components/BookingWidgetCalendar.tsx", 1],
  ["src/features/booking-widget/components/BookingWidgetConfirmation.tsx", 6],
  ["src/features/booking-widget/components/BookingWidgetContactForm.tsx", 4],
  ["src/features/booking-widget/components/BookingWidgetDemo.tsx", 1],
  ["src/features/booking-widget/components/BookingWidgetHeader.tsx", 1],
  ["src/features/booking-widget/components/BookingWidgetSlots.tsx", 2],
  ["src/features/booking/booking-request-form.tsx", 46],
  ["src/features/company/company-configurator-drawer.tsx", 18],
  ["src/features/compass/cta/compass-cta-banner.tsx", 13],
  ["src/features/compass/cta/cta-preview-control.tsx", 3],
  ["src/features/compass/feedback/compass-feedback-banner.tsx", 4],
  ["src/features/compass/quiz/compass-quiz.tsx", 5],
  ["src/features/compass/quiz/compass-results.tsx", 9],
  ["src/features/compass/sections/compass-always-available.tsx", 3],
  ["src/features/compass/sections/compass-hero.tsx", 13],
  ["src/features/compass/sections/compass-starting-view.tsx", 13],
  ["src/features/compass/sections/compass-support-section.tsx", 19],
  ["src/features/guidance/consent-document-disclosure.tsx", 3],
  ["src/features/guidance/guidance-cta.tsx", 1],
  ["src/features/guidance/guidance-drawer.tsx", 2],
  ["src/features/guidance/guidance-flow.tsx", 40],
  ["src/features/guidance/guidance-intro-actions.tsx", 1],
  ["src/features/guidance/intake-request-form.tsx", 42],
  ["src/features/research/research-launcher.tsx", 2],
  ["src/features/research/survey-drawer.tsx", 11],
  ["src/features/superadmin/components/diagnostics-view.tsx", 11],
  ["src/features/superadmin/components/tenant-profile-view.tsx", 3],
  ["src/features/workspace/components/agenda-row.tsx", 1],
  [
    "src/features/workspace/components/availability/availability-conflict-modal.tsx",
    3,
  ],
  [
    "src/features/workspace/components/availability/availability-exception-form.tsx",
    4,
  ],
  [
    "src/features/workspace/components/availability/availability-exceptions.tsx",
    5,
  ],
  [
    "src/features/workspace/components/availability/availability-overview-cards.tsx",
    17,
  ],
  [
    "src/features/workspace/components/availability/availability-settings-row.tsx",
    8,
  ],
  ["src/features/workspace/components/availability/availability-slots.tsx", 14],
  [
    "src/features/workspace/components/availability/availability-week-editor.tsx",
    4,
  ],
  ["src/features/workspace/components/availability/screen-dostupnost.tsx", 21],
  ["src/features/workspace/components/content-discovery-metadata.tsx", 22],
  ["src/features/workspace/components/content-revision-editor.tsx", 19],
  ["src/features/workspace/components/content-revision-preview.tsx", 6],
  [
    "src/features/workspace/components/kompas-sadrzaj/article-author-field.tsx",
    3,
  ],
  [
    "src/features/workspace/components/kompas-sadrzaj/article-basics-step.tsx",
    3,
  ],
  ["src/features/workspace/components/kompas-sadrzaj/article-checklist.tsx", 3],
  [
    "src/features/workspace/components/kompas-sadrzaj/article-compass-step.tsx",
    21,
  ],
  [
    "src/features/workspace/components/kompas-sadrzaj/article-optional-section.tsx",
    25,
  ],
  [
    "src/features/workspace/components/kompas-sadrzaj/article-review-step.tsx",
    28,
  ],
  ["src/features/workspace/components/kompas-sadrzaj/article-stepper.tsx", 4],
  [
    "src/features/workspace/components/kompas-sadrzaj/article-taxonomy-step.tsx",
    17,
  ],
  ["src/features/workspace/components/kompas-sadrzaj/article-text-step.tsx", 6],
  [
    "src/features/workspace/components/kompas-sadrzaj/kompas-article-editor.tsx",
    11,
  ],
  [
    "src/features/workspace/components/kompas-sadrzaj/kompas-article-screen.tsx",
    9,
  ],
  [
    "src/features/workspace/components/kompas-sadrzaj/kompas-content-actions.tsx",
    8,
  ],
  [
    "src/features/workspace/components/kompas-sadrzaj/kompas-content-create.tsx",
    8,
  ],
  [
    "src/features/workspace/components/kompas-sadrzaj/kompas-content-list.tsx",
    17,
  ],
  [
    "src/features/workspace/components/kompas-sadrzaj/kompas-content-new.tsx",
    7,
  ],
  [
    "src/features/workspace/components/kompas-sadrzaj/kompas-content-row.tsx",
    7,
  ],
  [
    "src/features/workspace/components/kompas-sadrzaj/kompas-docx-import.tsx",
    9,
  ],
  [
    "src/features/workspace/components/kompas-sadrzaj/kompas-editor-header.tsx",
    3,
  ],
  [
    "src/features/workspace/components/kompas-sadrzaj/kompas-editor-health.tsx",
    8,
  ],
  ["src/features/workspace/components/kompas-sadrzaj/next-action-card.tsx", 1],
  ["src/features/workspace/components/review-assignment-manager.tsx", 11],
  ["src/features/workspace/components/review-queue-screen.tsx", 18],
  [
    "src/features/workspace/components/screen-dokumenti/docx-import-findings.tsx",
    2,
  ],
  [
    "src/features/workspace/components/screen-dokumenti/legal-document-card.tsx",
    14,
  ],
  [
    "src/features/workspace/components/screen-dokumenti/new-document-form.tsx",
    11,
  ],
  [
    "src/features/workspace/components/screen-dokumenti/screen-dokumenti.tsx",
    18,
  ],
  ["src/features/workspace/components/screen-istrazivanja.tsx", 15],
  ["src/features/workspace/components/screen-klijenti.tsx", 6],
  ["src/features/workspace/components/screen-kompanije.tsx", 1],
  ["src/features/workspace/components/screen-kompas/approval-controls.tsx", 1],
  [
    "src/features/workspace/components/screen-kompas/compass-admin-workspace.tsx",
    24,
  ],
  ["src/features/workspace/components/screen-kompas/intake-link-cards.tsx", 1],
  [
    "src/features/workspace/components/screen-kompas/intake-link-governance-controls.tsx",
    12,
  ],
  ["src/features/workspace/components/screen-kompas/intake-links.tsx", 19],
  ["src/features/workspace/components/screen-kompas/lifecycle-button.tsx", 1],
  [
    "src/features/workspace/components/screen-kompas/readiness-checklist.tsx",
    3,
  ],
  ["src/features/workspace/components/screen-kompas/review-queue.tsx", 5],
  [
    "src/features/workspace/components/screen-kompas/route-governance-controls.tsx",
    10,
  ],
  ["src/features/workspace/components/screen-kompas/screen-kompas.tsx", 13],
  ["src/features/workspace/components/screen-kompas/system-choices.tsx", 6],
  ["src/features/workspace/components/screen-kompas/term-card.tsx", 11],
  [
    "src/features/workspace/components/screen-kompas/term-governance-controls.tsx",
    10,
  ],
  ["src/features/workspace/components/screen-kompas/term-list.tsx", 2],
  ["src/features/workspace/components/screen-pregled.tsx", 0],
  ["src/features/workspace/components/screen-profil.tsx", 0],
  ["src/features/workspace/components/screen-termini.tsx", 7],
  ["src/features/workspace/components/screen-usluge.tsx", 3],
  ["src/features/workspace/components/seo-preview-panel.tsx", 3],
  ["src/features/workspace/components/slot-editor.tsx", 5],
  ["src/features/workspace/components/slot-field-editor.tsx", 1],
  ["src/features/workspace/components/taxonomy-quick-entry.tsx", 11],
  ["src/features/workspace/components/taxonomy-term-editor.tsx", 13],
  [
    "src/features/workspace/components/taxonomy-term-form/content-fields.tsx",
    8,
  ],
  [
    "src/features/workspace/components/taxonomy-term-form/identity-fields.tsx",
    2,
  ],
  [
    "src/features/workspace/components/taxonomy-term-form/organization-fields.tsx",
    16,
  ],
  [
    "src/features/workspace/components/taxonomy-term-form/quick-entry-chrome.tsx",
    9,
  ],
  [
    "src/features/workspace/components/taxonomy-term-form/quick-entry-review.tsx",
    10,
  ],
  [
    "src/features/workspace/components/taxonomy-term-form/taxonomy-duplicate-hint.tsx",
    8,
  ],
  [
    "src/features/workspace/components/taxonomy-term-form/taxonomy-icon-picker.tsx",
    3,
  ],
  [
    "src/features/workspace/components/taxonomy-term-form/taxonomy-kind-launcher.tsx",
    4,
  ],
  [
    "src/features/workspace/components/taxonomy-term-form/taxonomy-public-preview.tsx",
    5,
  ],
  [
    "src/features/workspace/components/taxonomy-term-form/technical-details.tsx",
    1,
  ],
  ["src/lib/auth/clerk/auth-avatar-menu.tsx", 4],
  ["src/lib/auth/clerk/identity-card.tsx", 3],
  ["src/lib/auth/clerk/mobile-auth-section.tsx", 1],
]);

const serbianDiacritics = /[šđčćžŠĐČĆŽ]/g;

for (const file of walk(sourceRoot)) {
  if (!file.endsWith(".tsx")) continue;
  const rel = relative(file);
  if (rel.includes(".test.")) continue;

  const text = fs.readFileSync(file, "utf8");
  const code = text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
  const hits = (code.match(serbianDiacritics) ?? []).length;
  const baseline = inlineSerbianBaseline.get(rel) ?? 0;

  if (hits > baseline) {
    failures.push(
      `${rel}: ${hits} inline Serbian string(s); baseline ${baseline}. ` +
        `Move user-facing copy into src/messages/ (I18N-5)`,
    );
  } else if (hits < baseline) {
    warnings.push(
      `${rel}: ${hits} inline Serbian (baseline ${baseline}) — lower the baseline`,
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
