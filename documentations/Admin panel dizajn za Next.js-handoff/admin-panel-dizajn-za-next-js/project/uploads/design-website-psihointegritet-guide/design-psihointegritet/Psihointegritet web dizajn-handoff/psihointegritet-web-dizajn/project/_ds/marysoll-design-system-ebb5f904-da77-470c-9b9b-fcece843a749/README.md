# Marysoll Design System

Design system for **Marysoll Assistant AI** — a Serbian-language AI-powered booking platform that lets people find and reserve beauty/wellness appointments (massage, facials, hair, nails) in under 30 seconds.

## Sources

- **Codebase:** mounted as `MarysollAI (copy)/` (read-only File System Access). Next.js 16 + React 19 + Tailwind v4 + Headless UI + Heroicons + Framer Motion. Entry point `src/app/page.tsx` → `LandingHero` + `LandingCampaigns`. Brand tokens defined in `src/app/globals.css`.
- **Brand assets:** `MarysollAI (copy)/public/` — logos, hero images, avatars copied into `assets/`.
- **Design brief:** `MarysollAI (copy)/Design_For_Landing.md` — directs a redesign of the landing page focused on a 30-second booking flow, with the AI agent moved off the front of stage.
- **Inspiration:** `MarysollAI (copy)/inspiration_for_landing.jpeg` (saved to `scraps/`) — soft beige/blush nail-salon landing with a side-rail booking widget. Marysoll re-skins this archetype in the brand's deep purple palette.

## Product context

There are two surfaces to design for:

1. **Marysoll marketing/booking landing page** — public-facing. Goal: surface real-time available appointments and let visitors book immediately. Currently a single salon is wired up; the design must read as a multi-salon directory.
2. **Marysoll AI assistant ("Maria Deep")** — a sliding sidebar/drawer chat that can take over scheduling, register, log in, and surface salon recommendations. Lives behind a "Pitaj asistenta" / "Ask Maria Deep" trigger; not on the front of stage.

Language: **Serbian (Latin script)** primarily, with some English in admin/tooling. Currency: **RSD (din)**. Primary city right now: **Novi Sad**.

## Index

```
README.md                  ← this file
SKILL.md                   ← agent skill manifest (downloadable to Claude Code)
colors_and_type.css        ← canonical CSS variables: color, type, spacing, radii, shadow, motion
assets/                    ← logos, hero images, salon/avatar imagery copied from /public
fonts/                     ← (using Google Fonts CDN — see Visual Foundations)
preview/                   ← per-token review cards rendered in the Design System tab
ui_kits/
  landing/                 ← marketing/booking landing UI kit (header, hero, booking widget, sticky CTA, AI drawer)
  app/                     ← logged-in booking app (calendar block, appointments dashboard, auth, AI panel)
scraps/                    ← raw inspiration images, originals — not for production use
```

## Content fundamentals

**Language & voice.** Copy is **Serbian (Latin alphabet)** for end-users and **direct, action-first**. Sentences are short, almost imperative — they're written to be *acted on inside 30 seconds*, not read. Headlines name a result; sub-copy names what the user does next. Slang and warmth show up only in the AI assistant's first-person lines (Maria says *"Unela sam podatke…"* — "I've filled in the details for…"), never in marketing chrome.

**You vs. I.** The product addresses the user with informal **ti** ("Pronađi masažu, tretman ili šišanje u **vašem** gradu i **rezerviši** odmah"). The AI assistant speaks in first person ("Maria: Unela sam…"). Buttons are imperatives — *Pogledaj*, *Rezerviši*, *Pitaj asistenta*, *Zakaži termin*.

**Casing.** Sentence case everywhere. Headlines, buttons, and section titles are **never** all caps. The only uppercase is the eyebrow tag (`.eyebrow`, tracked, brand magenta).

**Tone examples (verbatim from codebase / brief):**
- H1: *"Slobodni termini u salonima danas"* (Available appointments in salons today)
- Sub: *"Pronađi masažu, tretman ili šišanje u vašem gradu i rezerviši odmah."*
- Primary CTA: *"Pogledaj slobodne termine danas"*
- Sticky modal: *"⚡ Brzo: prvi slobodan termin u 14:00 — Rezerviši sada"*
- AI prompt: *"Ne znaš šta ti treba?"* — *"Pitaj asistenta"*
- Reassurance: *"Čekamo umesto vas u redu. Zovemo vas za prvi slobodan termin."*

**Bullets** use a heavy checkmark glyph `✔` (not the lighter `✓` or emoji ☑️). Example checklist:
> ✔ Slobodni termini u realnom vremenu
> ✔ Rezervacija bez poziva
> ✔ Više salona na jednom mestu
> ✔ Gotovo za 30 sekundi

**Emoji.** Sparingly, and only with utility — `⚡` for speed, `🔥` for highlighted offers, `💡` for tips, `🤖` for assistant, `📅` for scheduling. Never decorative-only. Section headings in the brief use them (`🤖 Section 4 – AI`) but they should not bleed into actual UI headings unless the heading announces an *action*.

**Numbers.** Time as 24-hour `HH:MM` (`14:00`). Currency: trailing `RSD` with no decimals (`2 400 RSD`). Dates in Serbian — day-of-week long form (Sreda, 14. maj).

**Don'ts (called out in the brief):** no blog above the fold, no product explanation, no the phrase *"AI platform"*. The assistant is a tool, not the headline.

## Visual foundations

**Palette.** Brand is built on a single deep aubergine **`#5D0156`** (primary) accented by a vivid magenta **`#BA34B7`** (secondary, for buttons, links, selection, scrollbars, focus). The background is a cool near-white `#F4F6F8`. Most surfaces are pure white. Imagery and gradient washes lean **purple/pink** (the codebase uses `from-[#ff80b5] to-[#9089fc]` decorative blurs in hero blocks). Destructive is `#D20003`.

**Typography.** `Changa` (Google Fonts, weights 300–800) for *everything functional* — body, UI, buttons, headings. `Berkshire Swash` is reserved as a *script accent* for romantic display words ("Beauty", "Online", "Termini"), used **sparingly** — one or two words per page maximum. Both fonts are loaded from Google Fonts CDN. **No local font files are bundled** — flagged below.

**Spacing.** 4pt scale (`--sp-1` … `--sp-20`). Typical card padding is `24px`, page gutter `24–32px`, section vertical rhythm `64–96px`. Hero blocks in the codebase use `py-24 sm:py-32` (96–128px).

**Backgrounds.** Mostly flat — `--background` (`#F4F6F8`) or pure white surfaces. Hero variants from the codebase introduce a single decorative element: a **soft conic/blob gradient blur** (`blur-3xl`, opacity 0.3, magenta-to-violet) clipped to an irregular polygon, sitting behind the H1. **No repeating textures, no hand-drawn illustrations, no stock photo full-bleeds** in the marketing chrome — but salon listings *do* show real photos with rounded corners.

**Animation.** Motion is via Framer Motion (`Reveal`, `FadeView`, `SlideFade`, `ScaleView`, `StaggerList`). Default: short fade + 8–12px slide-up on enter, eased out. Durations sit in `140–380ms`. The AI panel uses `animate-pulse` while loading. **No bounces, no overshoot, no wild parallax.** The aesthetic is *calm and immediate* — every motion serves to confirm an action.

**Hover states.** Brand-colored elements hover *darker* (e.g. `--secondary-color` → `--secondary-hover` `#962992`); white/neutral chips hover into `bg-gray-50/100`. Text links transition **black → magenta**, never the reverse. Icons inherit color shift via group-hover.

**Press states.** Buttons rely on color shift only — `hover:bg-(--secondary-color)/80` from the codebase, no scale-down or shrink. Toggles flip selected state to `bg-gray-800 text-white`.

**Borders.** 1px, low-contrast (`--border-1` `#E7E5EA`). Stronger borders (`--border-2`) only on form fields and toggles. Brand borders are reserved for focus outlines (`focus-visible:outline-(--primary-color)` 2px, 2px offset).

**Shadows.** Soft, warm-tinted (rgba `20, 0, 18`) — never neutral grey. Cards default to `--shadow-md`; floating widgets (booking widget, AI drawer) use `--shadow-lg` / `--shadow-brand`. The booking widget in `AppointmentCalendarBlockView` uses Tailwind `shadow-xl`.

**Capsules vs. protection gradients.** Booking widget and modals are **flat white capsules** with `rounded-3xl` and a strong shadow — no scrim/protection gradient overlay. The fixed AI panel sits on a `bg-white/5 backdrop-blur` band with internal `bg-purple-50/50` capsule — that's the one place blur is used.

**Layout rules.** One fixed element only at a time: the bottom AI panel (`fixed bottom-0`) **or** the sticky "first slot" modal in the bottom-left. The brief explicitly says the AI input must hide on the redesigned landing and only appear when the assistant is opened from the sidebar.

**Transparency & blur.** Reserved for the AI assistant chrome: `backdrop-blur` on the panel band, `bg-purple-50/50` capsule. Marketing pages use solid surfaces.

**Imagery.** Warm, slightly desaturated, magenta/violet-leaning. Hero illustration (`marysoll-assistant-hero.png`) is a synthetic violet techno-cloud scene with the brand mark center-stage. Avatar photography is naturalistic, neutral background. **No black and white, no grain.**

**Corner radii.** Generous and consistent — chips/inputs `rounded-2xl` (20–28px), cards `rounded-3xl` (28–36px), buttons `rounded-md` to `rounded-2xl` depending on density. Icons sit on `rounded-full` chips.

**Cards.** White surface, `rounded-3xl`, `shadow-md` to `shadow-xl`, no border (or `border-gray-100`). Padding is generous (`p-6` minimum). Inside, controls use a faint grey fill (`bg-gray-50`) instead of white-on-white.

## Iconography

**System.** The codebase imports **Heroicons v2** (`@heroicons/react/24/outline` and `/24/solid`) — confirmed by `package.json` and direct usage (e.g. `SparklesIcon`, `BoltIcon`, `TrashIcon` in `Header.tsx` and `AIAgentPanel.tsx`). Outline 24px is the default; solid is used inside filled chips.

**Approach in this design system.** Heroicons is CDN-available — the UI kits link icons via inline SVG copies of the Heroicons set (MIT-licensed) rather than redrawing them. We do **not** ship a custom icon font. Icon stroke weight is the Heroicons default (1.5px on 24px viewBox).

**Sizing.** `size-4` (16px) inline with text, `size-5` (20px) in headers/buttons, `size-6` (24px) in feature lists. Tap targets stay ≥ 44px even when the icon is 16px (chip padding makes up the difference).

**Color.** Icons inherit `currentColor`. Brand-tinted icons use `text-(--primary-color)` shifting to `text-(--secondary-color)` on hover — see `<SparklesIcon …>` in `Header.tsx`.

**Emoji.** Used sparingly as leading micro-icons in copy (`⚡`, `📅`, `✍️`, `🧠`, `🤖`, `🔥`, `💡`, `✔`). Never as a stand-alone interactive element. The bullet `✔` in the brief is a Unicode heavy check, not an emoji — render it as text, color `--primary-color`.

**Logos.** `assets/logo.png` is the master horizontal lockup ("Marysoll Assistant" with a sun/cloud glyph, magenta). `assets/favicon.ico` is the round mark. There is no SVG logo in the source — flagged below.

## Caveats and substitutions

- **Fonts** — the codebase imports `Changa` and `Berkshire Swash` from a Google-Fonts CDN string in `globals.css` (`--main-font: 'Changa'`, `--heading-font: 'Berkshire Swash'`). No `.ttf`/`.woff2` files are bundled in the repo. This design system loads the same families from Google Fonts. **If you want offline-safe self-hosted versions, please drop the font files into `fonts/` and we'll wire them up.**
- **Logo** — only a raster PNG was available. **An SVG version of the Marysoll mark is highly recommended.**
- **Salon imagery** — only one salon's stock photography lives in the repo (`hero-image-marysoll.png` and the assistant hero). UI kit thumbnails for additional salons are placeholder-tinted swatches. **Real salon photography would significantly improve fidelity.**
- The codebase declares `@media (prefers-color-scheme: dark)` but no actual dark mode is shipped — we extended a sensible dark palette in `colors_and_type.css`. **Treat dark mode as a draft pending your sign-off.**
