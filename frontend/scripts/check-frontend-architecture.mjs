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
 * longer exist as single files; `content-revision-editor.tsx` 643 -> 592 and
 * `taxonomy-term-editor.tsx` 1004 -> 983 after their network lifecycle moved
 * into feature hooks. The remaining entries are the outstanding debt.
 */
const largeFileBaseline = new Map([
  ["src/features/booking/booking-request-form.tsx", 659],
  ["src/features/company/company-configurator-drawer.tsx", 517],
  ["src/features/guidance/guidance-flow.tsx", 963],
  ["src/features/workspace/components/content-revision-editor.tsx", 593],
  ["src/features/workspace/components/taxonomy-term-editor.tsx", 983],
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
