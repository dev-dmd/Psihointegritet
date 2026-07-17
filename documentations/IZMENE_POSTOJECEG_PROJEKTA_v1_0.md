# PSIHOINTEGRITET — IZMENE POSTOJEĆEG PROJEKTA

**Verzija:** 1.0 · 15.07.2026 · Za: Milan (CTO) · Osnov: analiza repo arhive, dokumentacije, Proposal-a v0.1, materijala klijenta i novih biografija

Ovaj dokument odgovara na pitanje „šta menjamo u onome što već postoji". Sve izmene su prenete i u `CLAUDE_CODE_MASTER_PLAN_v1_0.md` (Release 0), pa Claude Code može da ih izvrši kao prvi zadatak.

---

## 1. Šta postoji i šta zadržavamo (bez izmena)

| Oblast                                                                                        | Stanje                                                  | Odluka                                                                                                                   |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Arhitektura v0.3 (Next.js 16 + FastAPI monolit + PostgreSQL 18, Clerk, OpenAPI→TS)            | Kvalitetna, konzistentna sa ARCHITECTURAL_RULES_REVISED | **Zadržati kao baseline.** Ne vraćati se na Next-only/Drizzle/Auth.js.                                                   |
| Frontend foundation (strict TS, gates, Vitest/Playwright/axe, React Compiler, env validacija) | Uzorno postavljeno                                      | Zadržati; ništa ne relaksirati.                                                                                          |
| Homepage iz dizajn handoff-a + typed content (`src/content/homepage.ts`)                      | Implementirano, sa testovima                            | Zadržati kao referentni dizajn sistem; typed content ostaje seed izvor dok se ne pređe na DB u Fazi 2.                   |
| Guidance quiz (deterministički, bez čuvanja odgovora)                                         | Implementiran + testovi                                 | Zadržati; u Fazi 1 podići na `/pronadji-podrsku`; pitanja finalno potvrđuje tim (STOP S11).                              |
| Engines dokument v1.0                                                                         | Odlična vizija granica modula                           | Zadržati kao **vodič** — engine = modul monolita, ne mikroservis. Milestones E0–E6 mapirani na faze u master planu (§3). |
| Deployment model (main/staging/feature, odvojeni resursi)                                     | Ispravan                                                | Zadržati; dopuniti matricom iz master plana §14.                                                                         |

## 2. Obavezne izmene — dokumentacija (Release 0)

1. **`documentations/technical-documentation-architecture.md` je zastarela v0.1** (Drizzle, Auth.js, Next-only), a v0.3 stoji pored nje → premestiti v0.1 u `documentations/archive/…-SUPERSEDED.md`, README linkovati isključivo na v0.3. Rizik: agent pomeša dve arhitekture.
2. **`quality-gate-before-production.md`** navodi „Drizzle migration check" → zameniti sa `alembic upgrade head && alembic check` + backend gate blok (Ruff/Pyright/pytest).
3. **`PRODUCT_CONTEXT.md`** ažurirati:
   - §6 terminologija: „Partnersko savetovanje" → **„Bračno savjetovanje"**; „Psihološko savetovanje" → **„Psihoterapijsko savjetovanje"** (uklj. seed-data mapu §17);
   - MVP definicija (§13) meša javni sajt i naloge/booking → podeliti na **Release 1 (javni sajt + ručni zahtev)** i **Release 2 (nalozi + Booking Engine)**, kako je i Proposal postavio;
   - kvalifikacije: sve „pod supervizijom" formulacije tretirati kao zastarele; objava tek uz pisanu potvrdu (STOP S1);
   - cene 3.500/5.000/3.500 RSD upisati kao potvrđene radne (uz „okvirne").
4. **Dodati nove dokumente:** `CLAUDE_CODE_MASTER_PLAN.md` (isporučen), `PRODUCT_DECISIONS.md`, `OPEN_DECISIONS.md` (seed iz STOP liste), `handoff/bios-2026-07.md` (verbatim nove biografije sa statusom po terapeutu), root `CLAUDE.md` sa redosledom čitanja. Kasnije po fazama: ROLE_CAPABILITY_MATRIX, BOOKING_POLICY, DATA_CLASSIFICATION_RETENTION itd. (spisak iz Proposal-a §10.1 — ne kreirati prazne unapred, već uz fazu koja ih koristi).

## 3. Obavezne izmene — frontend sadržaj (Release 0)

1. `src/content/homepage.ts` → `footerServiceLinks`: „Partnersko savjetovanje" → **„Bračno savjetovanje"**, „Psihološko savjetovanje" → **„Psihoterapijsko savjetovanje"**. Zatim `grep` sweep celog `src/` (uklj. testove i e2e fixtures) za: `partnersk`, `psihološko savj`, `pod supervizijom`, `pacijent` — nula pogodaka u javnom sadržaju.
2. Nove biografije (Anja, Marija, Marjan — primljene 15.07.) uneti kao typed `draft` sadržaj profila. **Napomena:** Marjanova nova biografija i dalje sadrži „psiholog i geštalt psihoterapeut pod supervizijom", što je u koliziji sa Anjinom porukom „svi smo sertifikovani" → ne objavljivati zvanje dok ne stigne pisana potvrda; u staging-u držati neutralno „geštalt psihoterapeut" bez statusa.
3. Ime je Marjan: dokumenti koriste oba ali je Marjan jedino tačno. Blokira slug `/tim/…` — potvrditi pre produkcije (STOP S2).
4. Kviz: bez izmena logike; odgovori ostaju client-only. Dodati kratko objašnjenje rezultata („zašto je prikazano") ako već ne postoji na nivou UI.

## 4. Obavezne provere — backend (Release 0)

- ZIP arhiva je presečena na 449 MB (node_modules), pa `backend/` nije mogao biti verifikovan iz arhive iako ga README detaljno opisuje. **Lokalno proveriti** da backend foundation postoji i odgovara `CLAUDE_FOUNDATION_PROMPT.md` (health, problem-details, CORS allowlist, Alembic, gates, Dockerfile, OpenAPI export). Ako fali — prvo ga kompletirati, pa tek onda Faza 1 forme (one po pravilima idu kroz FastAPI, ne kroz Next Route Handlers).
- Regenerisati `src/types/api.generated.ts` i potvrditi da CI pada na contract drift.

## 5. Higijena repozitorijuma

- U buduće arhive/uploade ne pakovati `node_modules/`, `.next/`, `test-results/`, `tsconfig.tsbuildinfo` (dodati u pravilo za deljenje koda; `.gitignore` ih već pokriva za git).
- `frontend/.env.local` je bio u arhivi — proveriti da ne sadrži prave ključeve; ako sadrži, rotirati Clerk ključeve. Nikada ne deliti `.env.local` u arhivama.

## 6. Usklađivanje planova (Proposal ↔ engines ↔ production-plan)

- `production-plan.md` (M0–M6, po ~1 nedelja) je preoptimističan za operativni MVP → važi novi roadmap: **Faza 2 = 7–9 nedelja** (Proposal), sa opcionom podelom 2A/2B (Google Calendar izdvojen). `production-plan.md` označiti kao superseded ili prepisati na R-mapu iz master plana.
- Engines E-milestones: E0 se radi „lightweight" u R0 (registry dokumenti bez koda), E1+E2 = Faza 2, E3 = Faza 3, E4 = Faza 4–5, E5 = Faza 6, E6 = Faza 7. Notify Me (E2) prebačen u **opcioni M2.8** — dodatna kompleksnost (matching jobs, fairness) nije uslov MVP-a.
- Terminološka korekcija tvoje poruke: platforma se pozicionira kao **psihoterapijska/savetodavna**, ne „psihijatrijska" (niko iz tima nije lekar) — Proposal §1.2 to već ispravno definiše; primeniti dosledno u svakoj komunikaciji.
- „PDF testovi za pacijente" → u proizvodu: **edukativni PDF vodiči i radni listovi + vežbe bez čuvanja odgovora**; standardizovani psihološki instrumenti i bilo kakav „rezultat o stanju" ostaju van scope-a dok ne postoji licenca/pravni osnov (Proposal §1.5). Ovo je i zaštita Anjine licence.

## 7. Šta smo dodali u odnosu na Proposal v0.1 (ugrađeno u v1.1 i master plan)

1. **Opcija 2A/2B** u Fazi 2 (core MVP vs Google Calendar paket) — fleksibilnost budžeta i rizika.
2. **Notify Me kao opcioni M2.8**, ne default.
3. **Nove biografije** evidentirane + kontradikcija za Marjana podignuta kao blocker S1.
4. **Tabela mesečnih eksternih troškova** sa okvirnim rasponima (launch ~5–25 EUR/mes; operativni MVP ~25–90 EUR/mes) — Anja dobija realnu sliku fiksnih troškova, ne samo razvojnih.
5. **Konsolidovana checklista „šta je potrebno od Psihointegriteta"** sa rokovima po fazi (izvučena iz §13 u jednu tabelu za Anju).
6. **Data model + API + event katalog za Fazu 2** detaljno specificirani (master plan §6) — ovo je deo koji je v0.1 najviše nedostajao da bi Claude Code mogao da radi bez improvizacije.
7. Precizirano da **forme Faze 1 idu kroz FastAPI** sa evidencijom u bazi (`contact_inquiries`, `appointment_requests`) — čime Faza 1 već seed-uje Booking domen.

## 8. Redosled izvršenja (praktično)

1. R0 (1–2 dana): tačke 2–5 ovog dokumenta → PR „chore/docs-and-terminology-alignment".
2. R1 milestones 1.1–1.5 po master planu → produkcijski launch (kraj vaučera).
3. Paralelno: Anji poslati Proposal v1.1 + checklistu odluka (S1, S2, S5, S10 blokiraju launch).
4. Po prihvatanju R1: SoW za Fazu 2 (2A obavezno, 2B/2.8 opciono) → R2.
