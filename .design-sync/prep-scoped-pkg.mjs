// Regenerates frontend/node_modules/psihointegritet-ds/ — a scratch "package"
// the design-sync converter reads as its --node-modules/<pkg> entry, since
// this repo is an app (no dist/ + .d.ts build for its component library).
// It mirrors ui/shared/panel/motion verbatim (cross-folder @/ imports still
// resolve to the real frontend/src via cfg.tsconfig's alias plugin) and
// compiles frontend/src/app/globals.css with the real Tailwind v4 engine so
// cfg.cssEntry ships real utility classes, not just @theme token declarations.
// Re-run this before every package-build.mjs (recorded as cfg.buildCmd).
import { cpSync, mkdirSync, readFileSync as readFileSyncFs, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const FRONTEND = join(REPO_ROOT, 'frontend');
const PKG_DIR = join(FRONTEND, 'node_modules', 'psihointegritet-ds');

rmSync(PKG_DIR, { recursive: true, force: true });
mkdirSync(join(PKG_DIR, 'src'), { recursive: true });
for (const dir of ['ui', 'shared', 'panel', 'motion']) {
  cpSync(join(FRONTEND, 'src/components', dir), join(PKG_DIR, 'src', dir), { recursive: true });
}
writeFileSync(join(PKG_DIR, 'package.json'), JSON.stringify({ name: 'psihointegritet-ds', version: '0.1.0', private: true }, null, 2) + '\n');

// esbuild's tsconfig-paths plugin (lib/bundle.mjs) strips /* */ comments with
// a naive regex before JSON.parse — it misfires on frontend/tsconfig.json's
// own "**/*.ts" include globs (the "/*" in "@/*" pairs with the "*/" inside
// "**/*.ts" and the regex eats everything between as a fake comment). Point
// cfg.tsconfig at this minimal, glob-free file instead — same @/* -> src/*
// mapping, nothing for the comment-stripper to trip on.
writeFileSync(
  join(PKG_DIR, 'tsconfig.alias.json'),
  JSON.stringify({ compilerOptions: { baseUrl: '../../src', paths: { '@/*': ['./*'] } } }, null, 2) + '\n',
);

// next/image and next/link pull in Next's server-side image optimizer
// (fs/stream/zlib) and app-router context when bundled standalone outside a
// real Next build. Swap them for tiny browser-safe stand-ins so previews
// render a plain <img>/<a> instead of failing to bundle.
mkdirSync(join(PKG_DIR, 'src/_shims'), { recursive: true });
writeFileSync(
  join(PKG_DIR, 'src/_shims/next-image.tsx'),
  `import * as React from 'react';
type Props = { src: string | { src: string }; alt: string; fill?: boolean; sizes?: string; priority?: boolean; className?: string; style?: React.CSSProperties };
export default function Image({ src, alt, fill, priority, sizes, style, ...rest }: Props) {
  const resolvedSrc = typeof src === 'string' ? src : src?.src ?? '';
  const mergedStyle = fill ? { position: 'absolute' as const, inset: 0, width: '100%', height: '100%', objectFit: 'cover' as const, ...style } : style;
  return <img src={resolvedSrc} alt={alt} style={mergedStyle} {...rest} />;
}
`,
);
writeFileSync(
  join(PKG_DIR, 'src/_shims/next-link.tsx'),
  `import * as React from 'react';
type Props = { href: string | { pathname?: string }; children?: React.ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>;
export default function Link({ href, children, ...rest }: Props) {
  const resolvedHref = typeof href === 'string' ? href : href?.pathname ?? '#';
  return <a href={resolvedHref} {...rest}>{children}</a>;
}
`,
);
// @clerk/nextjs's root barrel re-exports server + app-router internals
// alongside the client hooks — importing even just useClerk/useUser from it
// drags in next/headers-adjacent server code (bloom-filter/gzip-size, fs/
// stream/zlib) that platform:'browser' esbuild can't resolve. Stand in a
// signed-in-with-no-photo session so LogoutAvatarMenu renders deterministically.
writeFileSync(
  join(PKG_DIR, 'src/_shims/clerk.tsx'),
  `export function useClerk() { return { signOut: () => {} }; }
export function useUser() { return { user: { hasImage: false, imageUrl: '' } }; }
`,
);
for (const dir of ['ui', 'shared', 'panel', 'motion']) {
  const dirPath = join(PKG_DIR, 'src', dir);
  for (const file of readdirSync(dirPath)) {
    const filePath = join(dirPath, file);
    if (!statSync(filePath).isFile() || !/\.(tsx|jsx)$/.test(file)) continue;
    const text = readFileSyncFs(filePath, 'utf8');
    const patched = text
      .replace(/(["'])next\/image\1/g, '$1../_shims/next-image$1')
      .replace(/(["'])next\/link\1/g, '$1../_shims/next-link$1')
      .replace(/(["'])@clerk\/nextjs\1/g, '$1../_shims/clerk$1')
      // @/components/<dir>/X cross-references must hit OUR copy, not the
      // real frontend/src (which still imports the unpatched next/image and
      // next/link and would reintroduce the fs/stream/zlib bundling errors).
      .replace(/@\/components\/(ui|shared|panel|motion)\//g, '../$1/');
    if (patched !== text) writeFileSync(filePath, patched);
  }
}

// Real .d.ts declaration emit: package-build's ts-morph prop extractor only
// ever reads **/*.d.ts under the package's "types root" — it never parses
// .tsx source directly. Without this, every component's props stub to
// `[key: string]: unknown` (confirmed: propsBodyFor's project has zero
// source files to search). tsc emits real declarations from our 25/27
// components that already name a `<Name>Props` interface/type by
// convention; the other 2 fall back to propsBodyFor's call-signature scan.
// noEmitOnError defaults to false, so partial output survives type errors.
//
// rootDir MUST cover both our copied `src/` AND the real frontend/src (the
// `@/*` path-aliased cross-references like `@/helpers/cn` pull those files
// into the same compile graph) — "../.." from PKG_DIR is their common
// ancestor (frontend/). Narrower than that (e.g. just "src") makes tsc
// throw TS6059 for every cross-referenced file and, because noEmitOnError
// is off, still emit its .d.ts — landing it NEXT TO THE REAL SOURCE FILE
// instead of under outDir, since there's no valid rootDir-relative path to
// compute. Confirmed the hard way: an earlier version of this rootDir
// leaked 17 stray .d.ts files into frontend/src/** on every rebuild. With
// the wider rootDir, cross-referenced files land at a harmless
// types/src/... path instead, and our own copied files nest one level
// deeper (types/node_modules/psihointegritet-ds/src/...) — ugly, but
// package-build's prop extractor walks the whole types/ tree recursively
// and matches by interface NAME, so the extra nesting is inert.
writeFileSync(
  join(PKG_DIR, 'tsconfig.emit.json'),
  JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      lib: ['dom', 'dom.iterable', 'esnext'],
      module: 'esnext',
      moduleResolution: 'bundler',
      jsx: 'react-jsx',
      declaration: true,
      emitDeclarationOnly: true,
      skipLibCheck: true,
      allowJs: true,
      esModuleInterop: true,
      resolveJsonModule: true,
      rootDir: '../..',
      outDir: 'types',
      baseUrl: '../../src',
      paths: { '@/*': ['./*'] },
    },
    include: ['src/**/*.ts', 'src/**/*.tsx'],
    exclude: ['src/**/*.test.tsx', 'src/**/*.test.ts'],
  }, null, 2) + '\n',
);
try {
  execFileSync(join(FRONTEND, 'node_modules/.bin/tsc'), ['-p', 'tsconfig.emit.json'], { cwd: PKG_DIR, stdio: 'pipe' });
} catch (e) {
  // tsc exits non-zero on type errors even though declarations still emit
  // (noEmitOnError is off by default) — that's expected for a handful of
  // components; log for visibility, don't fail the prep step.
  console.log(`  tsc declaration emit: ${(e.stdout?.toString().match(/error TS/g) ?? []).length} type error(s) (non-blocking, declarations still emitted)`);
}

const postcss = (await import(join(FRONTEND, 'node_modules/postcss/lib/postcss.js'))).default;
const tailwind = (await import(join(FRONTEND, 'node_modules/@tailwindcss/postcss/dist/index.mjs'))).default;
const { readFileSync } = await import('node:fs');
const cssSrcPath = join(FRONTEND, 'src/app/globals.css');
const css = readFileSync(cssSrcPath, 'utf8');
const result = await postcss([tailwind()]).process(css, { from: cssSrcPath, to: join(PKG_DIR, 'styles.css') });
// next/font/google (Instrument Sans, Newsreader) sets these as CSS vars via a
// generated .variable class on <html> at runtime — there's no static rule for
// them in globals.css itself. Define them here so var(--font-instrument-sans)
// resolves; cfg.extraFonts (.design-sync/fonts-src/*.css) ships the matching
// @font-face + woff2 files (harvested once from a `next dev` build — see
// .design-sync/NOTES.md for how to regenerate if the .next cache is gone).
const fontVars = `:root{--font-instrument-sans:"Instrument Sans";--font-newsreader:"Newsreader";}\n`;
writeFileSync(join(PKG_DIR, 'styles.css'), fontVars + result.css);

console.log(`prepped ${PKG_DIR} (${result.css.length} bytes of compiled CSS)`);
