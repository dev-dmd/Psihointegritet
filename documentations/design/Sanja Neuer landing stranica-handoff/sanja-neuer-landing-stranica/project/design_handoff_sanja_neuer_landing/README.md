# Handoff: Sanja Neuer — Landing (tenant on P. Digital Centar)

## Overview
Single-page marketing + booking landing for **Sanja Neuer** (psychologist, psychotherapist, consultant), running as a **second tenant** on the P. Digital Centar (ex. Psihointegritet) platform. Goal of the page: explain her offer (consultations + mentoring built on psychotherapy, family constellations and neuroplastic future-creation), and funnel visitors into a **booking intake modal**. Content language: Serbian (Latin script).

Sections in order: sticky header → hero → stats banner → biography → three theoretical frameworks → three methodologies → services → 4-step funnel → video blog (YouTube-style) → FAQ → CTA block → footer. Plus: booking modal, mobile drawer, animated bottom sticky CTA bar.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes that show the intended look, copy and behavior. They are **not production code to copy**. The task is to **recreate these designs in the target codebase**, per the stack notes below.

### Target stack (as specified by the client)
- **Next.js 16+** (App Router) + **React 19+** + **TailwindCSS**.
- **UI components carry no logic.** Every component under `components/` is presentational: props in, markup out. No fetching, no business rules, no derived state inside them.
- **All logic lives in hooks** (`hooks/useBookingForm.ts`, `hooks/useStickyCta.ts`, `hooks/useVideoLibrary.ts`, …) **and in `lib/`** (`lib/booking.ts`, `lib/videos.ts`, `lib/seo.ts`, `lib/validation.ts`). Hooks orchestrate; `lib/` holds pure functions, schemas and the fetch clients.
- **`lib/` talks to API routes implemented as serverless functions** (`app/api/booking/route.ts`, `app/api/videos/route.ts`). Client components never call third-party services directly.
- Design tokens go into the Tailwind theme (`@theme` in `app/globals.css`, Tailwind v4 style) — see Design Tokens below. No inline hex in components.
- The prototype uses inline styles only because of its authoring environment. **In the real app, use Tailwind utility classes.**

Suggested shape:

```
app/
  layout.tsx                  # fonts, metadata, JSON-LD
  page.tsx                    # composes the sections (server component)
  api/booking/route.ts        # POST intake  (serverless)
  api/videos/route.ts         # GET video library (serverless)
components/
  layout/{SiteHeader,MobileDrawer,SiteFooter,StickyCtaBar}.tsx
  sections/{Hero,StatsBanner,Bio,Frameworks,Methodology,Services,Process,VideoBlog,Faq,CtaBand}.tsx
  ui/{Button,Chip,Eyebrow,SectionHeading,Card,Accordion,ImagePlaceholder}.tsx
  booking/{BookingModal,BookingForm,BookingSuccess}.tsx
hooks/
  useBookingForm.ts  useStickyCta.ts  useScrollSpy.ts  useDrawer.ts  useVideoLibrary.ts
lib/
  booking.ts  videos.ts  validation.ts  seo.ts  content.ts
```

## Fidelity
**High-fidelity.** Colors, type, spacing, radii, copy and interactions are final. Recreate pixel-close. Only the photography is missing — the prototype uses drop-in placeholders (see Assets).

## Design Tokens

### Color (brand palette — this tenant only)
| Token | Hex | Use |
|---|---|---|
| `ivory` | `#f7f4ef` | page background (whole site) |
| `surface` | `#fffdfa` | white-ivory cards/tiles |
| `burgundy` | `#5b1e2d` | primary button, filled cards, CTA band, headings on light cards, borders |
| `burgundy-hover` | `#1a1a1f` | primary button hover (goes to ink) |
| `lilac` | `#cbb7d6` | secondary button border, ornaments, numerals, tags, eyebrow rule |
| `lilac-deep` | `#7c5a90` | eyebrow text, tag text (readable lilac) |
| `ink` | `#1a1a1f` | body text, dark banners, footer, nav active link, Login |
| ink alphas | `rgba(26,26,31,.75 / .72 / .70 / .62 / .55)` | body copy, secondary copy, nav idle |
| ink hairlines | `rgba(26,26,31,.18 / .12 / .10 / .07)` | borders, dividers |
| ivory on dark | `#f7f4ef`, `rgba(247,244,239,.82 / .62)` | text on burgundy/ink blocks |

Odd/even rhythm: odd sections use **lilac** details + lilac-outlined secondary buttons; even sections use **burgundy** details. Primary button is always burgundy.

### Typography
- Display/serif: **Playfair Display** (400/500) — all headings, wordmark, stat numerals, quotes, video titles.
  (Original brand board used a lighter Cormorant-style serif; it was rejected because its Latin-Extended carons on `ž/č/ć` detach at display sizes. If a lighter serif is preferred, verify Serbian diacritics first.)
- Body/UI sans: **Instrument Sans** (400/500).
- Scale: H1 `clamp(38px,5.4vw,68px)/1.16`; section H2 `clamp(30px,3.6vw,44px)/1.2`; CTA H2 `clamp(32px,4.4vw,56px)/1.18`; card H3 `27–31px/1.24–1.28`; method H3 `26px/1.28`; video title `clamp(24px,2.6vw,32px)/1.26`; lead `17px/1.75`; body `15–16px/1.75–1.8`; meta `13px`; eyebrow/label `11–12px`, `letter-spacing .12–.24em`, uppercase.
- Wordmark: 19px, `letter-spacing .3em`, uppercase (15px / `.2em` ≤620px).
- Serif headings need line-height ≥1.16 for diacritic clearance — do not tighten.

### Radius
`999px` pills/buttons · `9–14px` thumbnails, tiles, icon buttons · `18px` funnel tiles · `20px` cards, image frames · `22px` stats banner · `24px` modal · `28px` CTA block · hero portrait `200px 8px 200px 8px` (asymmetric arch).

### Shadow
- primary CTA: `0 14px 34px rgba(91,30,45,.18)`
- modal: `0 40px 90px rgba(26,26,31,.28)`
- drawer: `-30px 0 70px rgba(26,26,31,.25)`
- sticky-bar button ring: `0 0 0 1px #5b1e2d, 0 0 0 5px rgba(91,30,45,.28)`

### Spacing
Section padding `88px 24px` (FAQ side padding drops to 14px ≤620px). Content max-width `1180px`. Two-column sections gap `56px`; card grids gap `20–22px`; funnel gap `16px`. All grids: `repeat(auto-fit, minmax(min(100%, Npx), 1fr))` — the `min(100%,…)` floor is required, otherwise tracks overflow at 360px.

## Screens / Views

### 1. Sticky header (`SiteHeader`)
Sticky, `z-index 70`, `background rgba(247,244,239,.9)` + `backdrop-filter blur(14px)`, no bottom border. Row: `max-width 1180px`, padding `16px 24px`, flex.
- Left: wordmark `SANJA NEUER` → `#top`.
- Center/right (>900px): nav links `O meni · Metod · Usluge · Video blog · Kontakt` — 12px, `.14em`, uppercase, idle `rgba(26,26,31,.62)`, hover/active ink + 1px ink underline (active driven by scroll-spy).
- Right: `Login` (ink outline pill, hover fills ink) + `Zakaži` (burgundy pill, hover ink).
- ≤900px: nav + Login hidden; shows `Zakaži` + hamburger (46×46, 14px radius, ink outline; three bars where the third is short and **burgundy**).

### 2. Mobile drawer (`MobileDrawer`)
Trigger: hamburger. Scrim `rgba(26,26,31,.5)` + `blur(4px)`, `z-index 90`. Panel: right-aligned, **75% width, max 420px**, full height, ivory, slides in from `translateX(100%)` over 280ms ease. Inside: wordmark + × (44×44), nav links stacked (Playfair 26px, 16px vertical padding, 1px ink/10% divider, hover burgundy), then pinned to bottom: `Zakaži konsultaciju` (burgundy pill, min-height 48px) and `Login` (outline pill, 48px), micro-line "Online · Odgovor u 24h". Closes on ×, scrim, any link, Escape. Locks page scroll on `<html>` **and** `<body>` (documentElement is the scroller — locking body alone does nothing).

### 3. Hero (`#top`)
Two columns (`minmax(min(100%,330px),1fr)`), gap 56px, padding `72px 24px 40px`, fades up 700ms on load.
- Eyebrow: 38×1px lilac rule + `Psiholog · Psihoterapeut · Konsultant` (11px, `.24em`, `#7c5a90`).
- H1: "Stvorite život koji želite — i postanite osoba kakva želite da budete."
- Lead (max 520px): "Konsultacije i mentorstvo koji spajaju psihoterapiju, porodične konstelacije i neuroplastično kreiranje budućnosti. Radimo na transgeneracijskim uzrocima i na blokadama koje vam ne dozvoljavaju da zamislite svoju budućnost."
- Buttons: `Zakaži konsultaciju` (burgundy, 16px/32px, CTA shadow → opens modal) + `Upoznaj metod` (lilac outline → `#metod`).
- Micro: "Online, 60 minuta · Odgovor na prijavu u roku od 24 sata".
- Right: portrait 4:5 in ivory frame with arch radius, 1px ink/10% border, 10px padding; behind it a lilac block (68%×70%, same arch radius, opacity .5) offset bottom-right — must not overflow the container.

### 4. Stats banner (ink)
Ink block, radius 22px, inside the 1180px container, padding `30px 32px`, 4 cells (`minmax(min(100%,190px),1fr)`): `20+ / godina prakse`, `TEDx / govornica`, `3 / metodologije u jednom procesu`, `∞ / nacionalni kongresi psihoterapeuta`. Numerals Playfair 32px lilac; labels 12px `.12em` uppercase `rgba(247,244,239,.62)`.
**Ornament (top-right):** three stacked strips peeking above the banner, aligned `right:24px`, painted *behind* the banner (banner `z-index 1`, strips `0`): lilac 268px peeking 12px → burgundy 196px peeking 23px → lilac 132px peeking 34px; plus one lilac 196px strip peeking 14px **below** the banner. Radius 16–20px on the exposed corners.

### 5. Bio (`#o-meni`)
Two columns. Left: 1:1 photo, radius `20px 20px 0 0`, directly under it a **burgundy** plate (radius `0 0 20px 20px`, padding `24px 26px`) with the ivory serif quote „Sama psihoterapija nekada nije dovoljna.". Right: burgundy eyebrow `Ko sam ja`, H2 "Psiholog koja radi na uzrocima — transgeneracijskim, telesnim i onim u vašoj slici budućnosti.", three body paragraphs (basic profession + additional trainings; 20 years, projects, innovations, TEDx, national congresses; transgenerational causes + future blocks → today's focus), 5 chips (`Psihoterapija`, `Porodične konstelacije`, `Trening i obuka`, `Duhovnost`, `Neuroplastičnost`; 12px uppercase, ink 18% outline pill), then a text button "Zakaži konsultaciju sa mnom →" (1px ink underline, hover burgundy) that opens the modal.

### 6. Frameworks (odd section)
Lilac eyebrow `Teorijski okviri`, H2 "Tri okvira iz kojih gledam vašu situaciju", lead. Three cards (`minmax(min(100%,270px),1fr)`, radius 20px, padding `32px 28px`, gap 14px) with deliberately different fills:
1. **01 — Ljubav prema sebi** — surface `#fffdfa`, transparent border → burgundy on hover, burgundy title, ink/72 body.
2. **02 — Identity Invention** — filled **burgundy**, lilac index, ivory title, `rgba(247,244,239,.82)` body, hover border ink.
3. **03 — Kreiranje ex nihilo** — filled **ink**, lilac index, ivory title, hover border burgundy.
Copy per card: self-love as relationship not affirmation; identity as invention rather than inherited roles; future not extrapolated from the past.

### 7. Methodology (`#metod`, even section)
Left: burgundy eyebrow `Metodologija`, H2 "Sinteza tri metode u jednom procesu", lead, then a 4:3 texture image (radius 20px). Right: three rows separated by 1px ink/14% rules, each `Roman numeral (burgundy serif 22px, 34px min-width) + H3 + body`: I Porodične konstelacije (transgenerational causes, loyalties, excluded members), II Psihoterapijska metoda (inner blocks, attachment patterns), III Neuroplastično kreiranje budućnosti (concrete future image + consistent behavior → new map). Below: burgundy `Zakaži konsultaciju` + text link "Vidi usluge i cene" → `#usluge`.

### 8. Services (`#usluge`, odd section)
Lilac eyebrow `Usluge`, H2 "Dva načina da radimo zajedno", lead. Two cards (radius 20px, padding `36px 32px`):
- **Konsultacija 1:1** — filled **burgundy**, ivory title, lilac badge `Najčešće` (ink text), body "Pojedinačna sesija od 60 minuta…", 3 bullets with lilac em-dashes (mapping causes not symptoms / constellation work as needed / written recap and next steps), CTA `Zakaži termin` = full-width **ivory** pill with burgundy text (hover lilac).
- **Mentorstvo** — surface `#fffdfa`, 1px lilac border, burgundy title, lilac-tinted badge `3 meseca`, body "Vođen proces za one koji prave veliki prelaz…", 3 bullets with `#7c5a90` dashes, CTA `Zakaži uvodni razgovor` = lilac-outline pill.
Both card header rows must wrap at narrow widths (title `min-width:0`, row `flex-wrap:wrap`).

### 9. Process / funnel (even section)
Burgundy eyebrow `Kako počinjemo`, H2 "Četiri koraka od prijave do promene". Four separate `#fffdfa` tiles (gap 16px, radius 18px, transparent border → burgundy on hover), each: lilac Playfair numeral `01–04`, 15px uppercase title, body. Steps: Prijava (2 min form) · Uvodni razgovor (20 min, no charge) · Plan rada (frame + success criterion) · Proces i integracija.

### 10. Video blog (`#blog`, odd section)
Header row: lilac eyebrow `Video blog` + H2 "Stručni sadržaj — bez skraćivanja", right-aligned ink-outline pill `Ceo YouTube kanal`.
Two columns (`minmax(min(100%,320px),1fr)`, gap 36px):
- **Left = player column** (YouTube watch-page hierarchy): 16:9 thumbnail (radius 16px, ink background) with a centered 72px burgundy play circle (ivory triangle, `pointer-events:none`) and a duration chip bottom-right (`rgba(26,26,31,.85)`, 12px, radius 6px); then title (serif), meta line ("12.400 pregleda · pre 3 nedelje"), lead paragraph, longer description, tag pills (`#tag`, lilac 28% background, `#7c5a90` text), then **Poglavlja** — a chapter list where each row is `timestamp (burgundy serif, 48px min-width) + label`, hover `rgba(203,183,214,.22)`, radius 8px. Below the article: a lilac-bordered CTA strip "Tema vam je poznata iz sopstvenog života? …" + burgundy `Zakaži`.
- **Right = episode list**: label `Sve epizode`, then 4 rows, each a button: `minmax(96px,140px)` 16:9 thumbnail + duration chip, and title/meta/short. Idle `#fffdfa` with ink/12% border; **selected** row `rgba(203,183,214,.4)` + burgundy border; hover burgundy border. Clicking a row swaps the player column.
Four episodes (title / duration / meta / tags / chapters) are in `lib/videos.ts` — content is in the prototype's logic block, copy it verbatim:
1. "Zašto psihoterapija nekada nije dovoljna" — 24:18 — 5 chapters.
2. "Porodične konstelacije: nasleđe koje ne vidimo" — 31:05 — 5 chapters.
3. "Identity Invention: kako se identitet osmišljava" — 19:47 — 4 chapters.
4. "Neuroplastično kreiranje budućnosti" — 27:32 — 5 chapters.
When wired to YouTube, replace the placeholder with an embed (`youtube-nocookie`), and have chapter clicks seek (`?start=` / IFrame API). Editors for title/description/tags/chapters already exist on the platform — the page only renders them.

### 11. FAQ (even section)
Left: burgundy eyebrow `Pitanja`, H2 "Ono što se najčešće pita pre prve sesije", lead, ink-outline pill `Postavi pitanje u prijavi` (opens modal). Right: single-open accordion, 5 items, serif burgundy questions ~19–24px, rotating plus icon, answer `ink/72, 16px/1.7`, 1px ink/12% dividers. Questions: consultation vs psychotherapy · single-topic session · constellation work without a group · online + languages (sr/en/de) · what happens after the intake.

### 12. CTA block (`#kontakt`)
Inset **burgundy** block (max 1180px, radius 28px, padding `80px 40px`), centered: lilac eyebrow `Prvi korak`, ivory H2 "Zakažite konsultaciju i počnimo od uzroka.", lead, ivory pill `Zakaži konsultaciju` (hover lilac + ink text).

### 13. Footer
Ink background, 4 columns (`minmax(min(100%,200px),1fr)`): wordmark + one-liner · Stranice (O meni, Metod, Usluge, Video blog) · Teme (4 blog topics) · Zakazivanje (ivory-outline pill + "Online · Odgovor u 24h"). Bottom bar above a 1px ivory/14% rule: `© 2026 Sanja Neuer. Sva prava zadržana.` and `Deo P. Digital Centar platforme` (lilac link to psihointegritet.com).

### 14. Booking modal (`BookingModal`)
Opened by every CTA (header, hero, bio, methodology, both service cards, FAQ, footer, sticky bar, drawer). Scrim `rgba(26,26,31,.55)` + `blur(6px)`, `z-index 100`, scrollable; panel ivory, max 620px, radius 24px, rises 300ms.
- Head: lilac eyebrow `Prijava za konsultaciju`, serif H3 "Zakažite termin", lead "Dva minuta. Javljam se u roku od 24 sata sa predlogom termina.", 36px round × button.
- Form grid (`minmax(min(100%,220px),1fr)`, gap 16px), inputs `#fffdfa`, 1px ink/18%, radius 10px, padding `13px 14px`, focus border burgundy: **Ime i prezime*** · **Email*** · Telefon · **Usluga** (Konsultacija 1:1 (60 min) / Mentorstvo (3 meseca) / Nisam sigurna — predloži) · **Kada vam odgovara** (Jutro 09—12h / Popodne 12—17h / Veče 17—21h) · **Jezik sesije** (Srpski / English / Deutsch) · full-width **Sa čim želite da radimo** textarea · required consent checkbox (`accent-color #5b1e2d`) · footer row: "Bez naplate do potvrđenog termina." + burgundy submit `Pošalji prijavu`.
- Success state replaces the form: serif burgundy "Prijava je poslata.", body "Hvala vam. Odgovaram lično, u roku od 24 sata, sa dva predloga termina.", burgundy `Zatvori`.
- Closes on ×, scrim click, Escape; content click must not bubble; locks `<html>` + `<body>` scroll.
- Real implementation: `useBookingForm()` → validate with a schema in `lib/validation.ts` → `lib/booking.ts` `POST /api/booking` (serverless route: validate again, persist to the tenant, send notification mail, return `{ ok }`). Add pending/error states — the prototype only has idle/success.

### 15. Sticky CTA bar (`StickyCtaBar`)
Fixed bottom, full width, `z-index 80`, `rgba(26,26,31,.95)` + `blur(10px)`, padding `22px 20px 14px`. Left: serif 18px ivory "Konsultacija 1:1 · online, 60 min". Right: ivory `Zakaži` pill with the burgundy double ring, and above it three lilac/burgundy strips peeking 10 / 20 / 30px (widths 212 / 150 / 96, `right:20px`) so the eye is pulled to the button.
**Animation (final spec):** always mounted; hidden state `transform: translateY(140%); opacity: 0; pointer-events: none`; shown state `translateY(0); opacity: 1`. Transition `transform 620ms cubic-bezier(.55,.03,.24,1)` (slow start, quick settle) + `opacity 380ms ease-in-out`. Same transition runs in reverse when it hides. Shown when: hero bottom has scrolled past the top **and** the `#kontakt` block is not yet in view, and neither the modal nor the drawer is open. Drive it from a `useStickyCta()` hook with a passive `scroll` + `resize` listener writing the style on a ref (do not mount/unmount — an unmounted element can't animate out). Respect `prefers-reduced-motion` by skipping the transform.

## Interactions & Behavior
- **Scroll-spy**: nav links get ink color + 1px ink underline for the section in view (IntersectionObserver, `rootMargin: -45% 0px -45% 0px`). Anchor navigation is smooth (`scroll-behavior: smooth`).
- **Hover**: buttons swap fill (burgundy→ink, ivory→lilac); cards/tiles gain a burgundy border; nav/footer links go to full ink/ivory; chapter rows get a lilac wash. Keep transitions short (~150ms) or instant, as in the prototype.
- **Focus**: inputs switch border to burgundy. Add visible focus rings for keyboard users in production (`focus-visible:ring-2 ring-burgundy/40`).
- **Responsive**: single breakpoint family — 900px (nav → hamburger), 620px (wordmark/CTA shrink, FAQ padding). Everything else is fluid via `auto-fit` grids. Verify no horizontal overflow at 360px.
- **A11y**: labelled controls, `aria-label` on icon buttons, focus trap + `role="dialog" aria-modal="true"` for the modal and drawer (the prototype does not trap focus — add it), Escape closes both.
- **Motion**: hero fades up 700ms; modal 300ms rise; drawer 280ms slide; sticky bar as specced.

## State Management
Prototype state → target hooks:
| State | Owner | Notes |
|---|---|---|
| `modalOpen`, `sent` | `useBookingForm` / `useModal` | add `submitting`, `error` |
| `menuOpen` | `useDrawer` | + scroll lock on `<html>`/`<body>` |
| `selectedVideoId` | `useVideoLibrary` | default = first episode; server can pass initial |
| sticky-bar visibility | `useStickyCta` | ref-written style, not React state |
| active nav section | `useScrollSpy` | IntersectionObserver |
Data: video library from `lib/videos.ts` (static or `GET /api/videos`); intake submitted via `POST /api/booking`. Page copy belongs in `lib/content.ts` so the tenant can be localized/edited.

## SEO
Prototype already contains what to port into `app/layout.tsx` / `page.tsx` metadata:
- Title: "Sanja Neuer — Konsultacije i mentorstvo | Psihoterapija, porodične konstelacije i neuroplastična transformacija".
- Description, keywords, `robots: index,follow`, OG (`type/title/description/locale sr_RS`), Twitter `summary_large_image`.
- JSON-LD `ProfessionalService` with `provider: Person (Sanja Neuer, jobTitle, knowsAbout[])`, `areaServed: Online`, `availableLanguage: [sr, en, de]`, `parentOrganization: P. Digital Centar`. Add `FAQPage` from the accordion items and `VideoObject` per episode once real YouTube ids exist.
- Semantic order h1 → h2 → h3, one h1 (hero).

## Assets
- **No final photography yet.** Eight placeholders in the prototype (drag-and-drop `<image-slot>` components, to be replaced by real `<Image>`): `sn-hero-portrait` (4:5 portrait), `sn-about-portrait` (1:1), `sn-method-texture` (4:3 burgundy/lilac texture), `sn-video-featured` + `sn-video-1…4` (16:9 thumbnails). In production use `next/image` with explicit sizes and the same frames/radii.
- Fonts: Playfair Display + Instrument Sans — load via `next/font/google`.
- Brand board (palette + type reference): `color-font-scheme.png`.
- The platform design system (PsihointegritetUI) supplies the Accordion pattern; this tenant re-tokenizes it to the palette above (`sanja-theme.css` in this bundle shows the token overrides: `forest→burgundy`, `meadow→lilac`, `sage→lilac-deep`, `coffee→ink`, `canvas→ivory`, `newsreader→Playfair Display`). Reuse the platform's shared components where they exist; only the tokens differ per tenant.

## Files
- `Sanja Neuer Landing v2.dc.html` — **the approved design** (single ivory ground, contrast blocks). Implement this one.
- `Sanja Neuer Landing.dc.html` — earlier variant (soft ivory→lilac section washes). Reference only.
- `sanja-theme.css` — token overrides that turn the platform DS into this tenant's palette.
- `image-slot.js` — placeholder component used by the prototypes (not for production).
- `color-font-scheme.png` — client brand board.

Open the HTML files directly in a browser to inspect states: scroll for the sticky bar, resize below 900px for the drawer, click any CTA for the modal, click an episode row to swap the player.
