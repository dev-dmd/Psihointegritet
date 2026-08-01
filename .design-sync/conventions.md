## Psihointegritet design system — build conventions

This is Tailwind v4 with a real brand token palette baked into `@theme` — style with the DS's own utility classes, never inline hex colors or generic Tailwind grays.

**Color family** (`bg-`/`text-`/`border-` all work on each): `forest` (primary dark green — CTAs, headings), `forest-soft`, `forest-hover`, `forest-lift` (hover states), `sage` (eyebrows, accents), `meadow` (light green accent), `warm` / `warm-shine` (secondary warm accent), `coffee` (primary text), `canvas` (page background), `surface` (card background), `danger` (destructive actions only). Panel/dashboard surfaces additionally use `panel-canvas` as their background (public site stays on `canvas`).

**Type**: `font-sans` (Instrument Sans — body/UI text) and `font-serif` (Newsreader — headings, quotes, editorial moments). Headings are consistently serif + `text-forest`; body copy is sans + `text-coffee` at varying opacity (`text-coffee/75`, `/60`, etc. — opacity-modified brand colors are the idiom for secondary text, not a separate gray scale).

**Radii**: `rounded-tile` (14px), `rounded-stat` (18px), `rounded-card` (20px), `rounded-panel` (22px), `rounded-modal` (24px) — pick by component weight (a stat tile vs. a full card vs. a modal), not by guessing a pixel value.

**Shadows**: `shadow-pill` (floating pills/badges), `shadow-hero-card` (large hero-level cards), `shadow-panel-modal` (dashboard modals/dialogs). Don't invent box-shadow values — these three cover the DS's actual elevation vocabulary in this sync's scope.

**No provider needed.** None of these components require a context/theme provider wrapper — just link `styles.css` and use the classes above. One deliberate exception: `LogoutAvatarMenu` is wired to a stand-in auth stub for this sync (real `@clerk/nextjs` pulls in server-only code that can't bundle standalone), so it always renders a signed-in user with initials only — never expect it to show a real avatar photo or perform a real sign-out.

**Where the truth lives**: `styles.css` (imports `fonts/fonts.css` then `_ds_bundle.css`, which carries every token and utility class above) and each component's own `.prompt.md` for real usage examples.

**Idiomatic composition** — a card built the way this DS's own components compose (real pattern from `TherapistCard`):

```tsx
<article className="bg-surface border-coffee/6 rounded-card flex flex-col gap-[22px] border px-8 py-8">
  <div className="flex items-start justify-between">
    <MonogramAvatar initials="AS" name="Anja Stamenković" />
    <Chip variant="label">Osnivačica</Chip>
  </div>
  <h3 className="text-forest font-serif text-[29px] font-normal">Anja Stamenković</h3>
  <p className="text-coffee/72 text-base leading-[1.7]">Kratak opis ili citat.</p>
  <ArrowLink href="/tim/anja-stamenkovic" circled>Upoznaj terapeuta</ArrowLink>
</article>
```
