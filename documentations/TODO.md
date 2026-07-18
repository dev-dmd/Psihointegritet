# TODO — Psihointegritet digitalni centar

**Verzija:** 1.0 · **Datum:** 2026-07-17 · **Vlasnik:** Milan Dražić (CTO)
**Svrha:** živi status rada — šta je urađeno, gde svaki zadatak piše u dokumentaciji, šta je sledeće.

---

## 0. Kako se koristi ovaj dokument

- **Ovde se prati samo status.** Obim se menja u četiri obavezujuća dokumenta — nikada ovde.
- Kolona **„Gde piše"** je poenta: svaki red vodi na `DOKUMENT §sekcija`. Ako reda nema u dokumentaciji, ne radi se.
- Red postaje ✅ tek kad prođu gates iz master plana §12 i completion report iz `ARCHITECTURAL_RULES_REVISED.md` §24.
- Jedan milestone = jedan plan = jedan PR (master plan §0, tačke 2–3). Nikad ne počinjati kasniji milestone jer „deluje spremno".
- Ako se udari u STOP stavku (§8 ovde) — **stati i pitati**. Ne pogađati proizvodne, pravne, cenovne ni kliničke odluke.

---

## 1. Hijerarhija dokumentacije

### Obavezujuća četiri

| Dokument | Uloga |
|---|---|
| `CLAUDE_CODE_MASTER_PLAN_v1_0.md` | Sekvenca, obim, kriterijumi prihvatanja. T1–T15, S1–S12, gates §12 |
| `Psihointegritet_Razvojni_Proposal_v1_1.docx` | Poslovni dogovor sa Anjom: faze, budžet, njena lista odluka §4 |
| `IZMENE_POSTOJECEG_PROJEKTA_v1_0.md` | Šta se menja u postojećem; redosled izvršenja §8 |
| `ARCHITECTURAL_RULES_REVISED.md` | Kvalitet koda, optimizacija, najbolja praksa, §24 completion report |

### Aktivni, ali podređeni

| Dokument | Status |
|---|---|
| `technical-documentation-architecture-v0.3.md` | Autoritet #4. Jedini izvor modela podataka (§6), granica modula (§4.2), ADR liste (§16). **Gde se sudara sa master planom, master plan pobeđuje** — 2 poznata sudara u §10 ovde |
| `PSIHOINTEGRITET_PRODUCT_ENGINES_ARCHITECTURE_v1_0.md` | Autoritet #6, **vodič a ne propis**. Master plan ga citira normativno iz M2.3 (§7.3) i M2.7 (§18) |

### Arhiva — `archive/`, ne uzimati odluke odatle

Svaki ima SUPERSEDED zaglavlje sa razlogom i zamenom. Arhivirano 2026-07-17: `PRODUCT_CONTEXT.md` (bio autoritet #2; zastarela terminologija + konkurentni redosled autoriteta) · `production-plan.md` (M0–M6, IZMENE §6) · `FOUNDATION_SETUP.md` · `CLAUDE_FOUNDATION_PROMPT.md` · `quality-gate-before-production.md` (master plan §12) · `deployment-and-environments.md` (master plan §14) · `technical-documentation-architecture-v0.1-SUPERSEDED.md`.

---

## 2. Legenda

| | Značenje |
|---|---|
| ✅ | Urađeno i prošlo gates |
| 🟡 | Delimično — postoji, ali nije završeno |
| ⬜ | Nije započeto |
| 🚫 | Blokirano STOP stavkom (§8) |
| ⏸️ | Gated — čeka prihvatanje prethodnog releasea ili SoW |

---

## 3. Pregled

| Release | Naziv | Faza (Proposal) | Trajanje | Stanje | Status |
|---|---|---|---|---|---|
| **R0** | Housekeeping i poravnanje dokumentacije | — | 1–2 dana | **~45%** | u toku |
| **R1** | Javni digitalni centar (produkcijski launch) | Faza 1 — vaučer, 0 EUR | ~4 nedelje | **~20%** | u toku |
| **R2** | Operativni MVP + Booking Engine | Faza 2 — 9.000–13.000 EUR | 7–9 nedelja | **0%** | ⏸️ čeka R1 + SoW |
| R3 | Znanje i resursi | Faza 3 — 6.500–9.500 EUR | 5–7 nedelja | 0% | ⏸️ |
| R4 | Radionice, programi i B2B | Faza 4 — 8.000–12.000 EUR | 6–8 nedelja | 0% | ⏸️ |
| R5 | Online rad, poruke, plaćanja | Faza 5 — 7.000–10.000 EUR | 5–7 nedelja | 0% | ⏸️ |
| R6 | Business OS: analitika, dijagnostika, marketing | Faza 6 — 10.000–14.000 EUR | 7–9 nedelja | 0% | ⏸️ |
| R7+ | SaaS, marketplace, AI navigator | Faze 7–9 | — | 0% | ⏸️ zasebne poslovne odluke |

**Gde smo zaista:** frontend je ispolirana **jednostrana prezentacija + auth ljuska**. Backend je **čvrst temelj bez ijednog domena**. Od 17 javnih ruta koje R1 traži, postoji **jedna** (`/`). Backend ima **2 endpointa**, oba health.

---

## 4. R0 — Housekeeping

> **Gde piše:** master plan §4 · IZMENE §2–§5, §8.1 · PR: `chore/docs-and-terminology-alignment`

### R0.1 — Poravnanje dokumentacije

| ID | Zadatak | Gde piše | Status | Napomena |
|---|---|---|---|---|
| R0.1.a | v0.1 arhitektura → `archive/…-v0.1-SUPERSEDED.md` | MP §4 R0.1 · IZMENE §2 | ✅ | Preimenovan + SUPERSEDED zaglavlje |
| R0.1.b | v0.3 kao referentni baseline | MP §4 R0.1 | ✅ | Anotiran zaglavljem o 2 sudara |
| R0.1.c | Ukloniti „Drizzle migration check" | MP §4 R0.1 · MP §2 | ✅ | Dokument arhiviran umesto krpljen — MP §12 je jedini izvor gates-a |
| R0.1.d | Arhivirati konkurentne/zastarele dokumente | zahtev CTO 2026-07-17 | ✅ | 6 dokumenata + v0.1, svaki sa zaglavljem |
| R0.1.e | `documentations/` vratiti u git | — (nalaz revizije) | ✅ | Commit `6452c70` je gitignorovao folder i obrisao 4.059 linija iz gita. `.docx`/`.pdf` ostaju van |
| R0.1.f | Engines dokument u repo | MP §0 (autoritet #6) | ✅ | Kopiran iz `~/Downloads`; MP ga citira iz M2.3/M2.7 |
| R0.1.g | Ovaj `TODO.md` | zahtev CTO 2026-07-17 | ✅ | — |
| R0.1.h | `PRODUCT_DECISIONS.md` (datum, odluka, vlasnik, razlog, uticaj) | MP §4 R0.1 · MP §0 | ✅ | 8 odluka: D-001 ekavica … D-008 pravni pravac |
| R0.1.i | `OPEN_DECISIONS.md` seed iz STOP liste | MP §4 R0.1 · MP §13 | ✅ | 13 stavki, unakrsno sa Proposal §4 |
| R0.1.j | Root `CLAUDE.md` → 4 obavezujuća + `TODO.md` | MP §4 R0.1 · IZMENE §2.4 | ⬜ | Postoji samo `frontend/CLAUDE.md` |
| R0.1.k | ~~Ažurirati `PRODUCT_CONTEXT.md`~~ | MP §4 R0.1 | ✅ | Odluka CTO: arhiviran umesto ažuriran |

### R0.2 — Terminološki i jezički sweep (frontend)

> ⚠️ **Sve u ovoj sekciji ide u jedan prolaz** — T1/T2 zamena i ekavica diraju iste stringove. Dva prolaza = dvostruko prepisivanje.

| ID | Zadatak | Gde piše | Status | Napomena |
|---|---|---|---|---|
| R0.2.a | `footerServiceLinks`: „Partnersko savjetovanje" → **„Bračno savetovanje"** | MP §4 R0.2 · MP §1 T1 | ⬜ | `src/content/homepage.ts:128` |
| R0.2.b | „Psihološko savjetovanje" → **„Psihoterapijsko savetovanje"** | MP §4 R0.2 · MP §1 T2 | ⬜ | `homepage.ts:129` i `:255` (midServices) |
| R0.2.c | Ekavica u celom `src/`, **osim Anjinog ličnog sadržaja** | MP §1 T9 (D-017, 2026-07-18) | 🟡 | `content/therapists.ts` **gotovo** — Anjin `quote`/`bio`/`cardExcerpt` su namerno ijekavica (D-017), ostatak fajla ekavica. **Preostaje:** `homepage.ts` (18+ linija) i komponente `hero.tsx`, `site-footer.tsx`, `workshop.tsx`, `faq.tsx`, `resources.tsx`, `support-paths.tsx` — obrisati i komentar „Ijekavica is intentional" (`homepage.ts:3`, zastareo) |
| R0.2.d | Ukloniti „pod supervizijom" iz zvanja | MP §4 R0.2 · MP §1 T3 | 🚫 S1 | `homepage.ts:187`, `:205`, `:217` — sva tri terapeuta |
| R0.2.e | Kviz: „Za partnerski odnos" | MP §4 R0.2 | ⬜ | **Nosivo, ne kozmetika:** ključ rečnika u `quiz.ts:83`, tvrdnja u `quiz.test.ts:20,64` i `tests/e2e/guidance.spec.ts:14`. Logika + testovi menjaju se zajedno |
| R0.2.f | 3 duge biografije kao `draft` sadržaj | MP §4 R0.2 · IZMENE §3 | 🚫 S1 | — |
| R0.2.g | `handoff/bios-2026-07.md` verbatim + status po terapeutu | MP §4 R0.2 · IZMENE §2.4 | ⬜ | Folder `handoff/` ne postoji |
| R0.2.h | Grep provera: 0 pogodaka na `partnersk`, `psihološko savj`, `pod supervizijom`, `pacijent` | MP §4 Acceptance R0 | ⬜ | Trenutno **18 pogodaka**. „pacijent" već ima 0 ✅ |

### R0.3 — Verifikacija backend-a

| ID | Zadatak | Gde piše | Status | Napomena |
|---|---|---|---|---|
| R0.3.a | Health endpointi | MP §4 R0.3 | ✅ | `GET /health` (`main.py:30`), `GET /api/v1/health` |
| R0.3.b | Problem-details envelope | MP §4 R0.3 · v0.3 §5.3 | ✅ | `api/errors.py`, testiran; `application/problem+json` |
| R0.3.c | CORS allowlist | MP §4 R0.3 | ✅ | `main.py:47-53`, bez wildcard-a |
| R0.3.d | Alembic konfigurisan | MP §4 R0.3 | ✅ | `alembic.ini` + `env.py` rade |
| R0.3.e | Ruff / Pyright / pytest zeleni | MP §4 R0.3 · MP §12 | ✅ | 5 testova prolazi; pyright `strict` |
| R0.3.f | Dockerfile + OpenAPI export | MP §4 R0.3 | ✅ | `export_openapi.py` determinističan |
| R0.3.g | `versions/` prazan **i netrackovan** | — (nalaz revizije) | ⬜ | 🐞 `railway.json:10` na deploy pokreće `alembic upgrade head` → puca na fresh clone. Treba `.gitkeep` ili prva migracija |
| R0.3.h | `backend/openapi.json` je gitignorovan | MP §12 (contract drift) | ⬜ | 🐞 `.gitignore:26` — CI ne može da detektuje drift ako artefakt nije u gitu |
| R0.3.i | Regenerisati `api.generated.ts` | MP §4 R0.3 | ⏸️ | Ima smisla tek kad postoje pravi endpointi (sad samo `HealthResponse`) |

### R0.5 — Higijena repoa

| ID | Zadatak | Gde piše | Status | Napomena |
|---|---|---|---|---|
| R0.5.a | Arhive bez `node_modules/`, `.next/`, `test-results/` | MP §2 · IZMENE §5 | ✅ | `.gitignore` pokriva |
| R0.5.b | Provera `frontend/.env.local` na prave ključeve | IZMENE §5 | ⬜ | Ako ima Clerk ključeva → rotirati |
| R0.5.c | `backend/.env.local` ima **žive produkcijske kredencijale** | — (nalaz revizije) | ⬜ | ⚠️ Postgres + Redis lozinke, Clerk issuer. Gitignorovan i nije u istoriji, ali stoji u plaintextu. Razmotriti rotaciju |
| R0.5.d | `production-plan.md` označiti prevaziđenim | IZMENE §6 | ✅ | Arhiviran |

**Prihvatanje R0** (MP §4): gates zeleni na oba app-a · grep zabranjenih termina = 0 · dokumentacija ažurirana · potpis CTO u `PRODUCT_DECISIONS.md`.

---

## 5. R1 — Javni digitalni centar

> **Gde piše:** master plan §5 · Proposal v1.1 §6 (Faza 1, milestone 1.1–1.5)
> **Cilj:** produkcijski sajt koji prima upite i **ručne zahteve za termin**. Bez naloga, bez automatskih slotova.

### R1.1 — Javne rute i navigacija

> **Gde piše:** MP §5 R1.1 · Proposal §6 M1.3 · v0.3 §15 („Design integration")
> Pravila: profil = monogram inicijala (**nikad stock portret pod pravim imenom**), samo potvrđeno zvanje, formati, grad, CTA → `/zakazi?terapeut=slug`. Teme se čitaju kao životne situacije, ne dijagnoze. Neaktivne oblasti = „U pripremi" + forma interesovanja, **nikad dugme za zakazivanje**.

| Ruta | Sadržaj | Status | Napomena |
|---|---|---|---|
| `/` | Homepage, 11 sekcija + `GuidanceLauncher` | ✅ | `(public)/page.tsx`; RSC |
| — | Navigacija vezana na prave rute | ⬜ | Sad su sve anchor linkovi (`#usluge`, `#terapeuti`…) |
| — | Footer: pravni linkovi + brzi linkovi + postojeći logo | ⬜ | **Struktura odblokirana (D-007):** privatnost · uslovi · kolačići · pravila zakazivanja; brzi: tim · radionice · rad sa kompanijama |
| `/pronadji-podrsku` | Vođeni izbor (kviz kao puna strana) | ⬜ | Vidi R1.2 |
| `/oblasti-podrske` | Pregled tema — 10 oblasti | ⬜ | Izvor tema: `archive/PRODUCT_CONTEXT.md` §17 kao **nacrt**, uz potvrdu Anje |
| `/oblasti-podrske/[slug]` | Objašnjenje, povezani terapeuti/usluge, CTA | ⬜ | — |
| `/tim` | Zajednički pristup, vrednosti, kartice | ✅ | Zigzag po dizajnu; jedini izvor `content/therapists.ts` |
| `/tim/[slug]` | 3 profila | 🟡 | **Napravljeno** — `anja-stamenkovic`, `marija-stamenkovic`, `marjan-jankovic`, sve tri SSG. Prave fotografije ✅. **Objava blokirana S1** — zvanja su generička (`draft`) |
| `/usluge` | 3 usluge + trajanje/cena/format + „okvirne cene" | ⬜ | Cene T7; napomena o okvirnosti obavezna |
| `/radionice` | Informativno + „Prijavite interesovanje" | 🚫 S6 | **Bez datuma i bez prijave** dok S6 ne stigne |
| `/znanje` | 3 najave članaka kao „u pripremi" | ⬜ | **Bez lažnih članaka** |
| `/rad-sa-kompanijama` | B2B strana + forma | 🟡 | **Stranica napravljena** (D-013); ponuda, 3 koraka, CTA → `/#kontakt`. Forma čeka R1.3. Rešen D2 (hero 404) |
| `/o-nama` | Misija, način rada, lokacije, prva seansa | 🟡 | Ime rešeno (D-006); **tekst o lokacijama i adrese otvoreni** (O-02) |
| `/zakazi` | Forma zahteva za termin | ⬜ | Prefill `?terapeut=slug`. 🐞 `hero.tsx:70` linkuje na `/zakazivanje` → **404**, a spec kaže `/zakazi` |
| `/kontakt` | Opšti kontakt | 🚫 S10 | Email/telefon/mreže i dalje nepotvrđeni (O-06) |
| `/privatnost` `/uslovi` `/kolacici` `/pravila-zakazivanja` | Pravni placeholderi „u pripremi — pravna potvrda" | 🚫 S5 | Pravac poznat (D-008), pravna potvrda nije. **Krizni disclaimer (T11) i dalje nedostaje.** Stranice se mogu napraviti kao placeholderi; tekst ne pišemo mi (MP §0, tačka 8) |

### R1.2 — Vođeni izbor / Intake & Matching Engine v1

> **Prošireno 2026-07-17** u pun Matching Engine po CTO spec-u (D-012). Hardcoded na frontendu, bez perzistencije (T13). Booking forma i slanje su R1.3/R2.

| ID | Zadatak | Gde piše | Status | Napomena |
|---|---|---|---|---|
| R1.2.a | Matching engine — deterministički, bez perzistencije | MP §5 R1.2 · MP §1 T13 · Engines (Intake) | ✅ | `features/guidance/matching.ts`; 5 pitanja, tvrdi filteri, grane; 13 unit testova |
| R1.2.b | Drawer: chooser → kviz → rezultat | MP §5 R1.2 | ✅ | `guidance-drawer.tsx`; Escape, scroll-lock, progress, nazad |
| R1.2.c | Sigurnosni izlaz (nije dijagnoza / nije hitna služba) | spec §0 · MP §1 T11 | ✅ | Stalna traka iznad pitanja; **konačna formulacija čeka S5** |
| R1.2.d | **Objašnjiv rezultat** — razlozi po terapeutu, bez skora | MP §5 R1.2 · Proposal §5 · spec | ✅ | Rečenice („oblast rada odgovara…"), nikad „87%" |
| R1.2.e | Tri ulaza: „Zakaži termin" → chooser; hero/sekcija → kviz | spec | ✅ | Postojeći klijenti preskaču pitanja („Znam kog terapeuta") |
| R1.2.f | Grane: B2B, tim-pregled, maloletnici, krizni oporavak | spec | ✅ | Krizni oporavak **nikad auto-Marjan** → tim; maloletnici → Marija + napomena |
| R1.2.g | Rezultat kartice → `/tim/[slug]` | MP §5 R1.2 | ✅ | Bez email gate-a (T13); BookingWidget kasnije |
| R1.2.h | Opciona textarea „svojim rečima" | spec | ✅ | Samo memorija — ništa se ne šalje ni čuva |
| R1.2.i | Promovisati na `/pronadji-podrsku` (puna strana) | MP §5 R1.2 · Proposal §6 M1.3 | ⬜ | Drawer radi svuda; zasebna ruta još ne postoji |
| R1.2.j | Pregled pitanja + routing matrice od tima | MP §13 S11 · Proposal §4/6 | 🚫 S11 | Blokira sign-off; nove otvorene stavke u `OPEN_DECISIONS` |

### R1.3 — Prijem upita i zahteva za termin (backend)

> **Gde piše:** MP §5 R1.3 · Proposal §6 M1.4 · rules §1.1 (business CRUD je u FastAPI — **Next Route Handlers ovo ne smeju raditi**)
> **Stanje: 0%.** Modul `inquiries` ne postoji; Resend nije ni zavisnost; rate limiting ne postoji.

| ID | Zadatak | Gde piše | Status |
|---|---|---|---|
| R1.3.a | Modul `inquiries` (tanki isečak budućeg booking-a) | MP §5 R1.3 | ⬜ |
| R1.3.b | Tabela `organizations` + seed (slug, name, `Europe/Belgrade`) | MP §5 R1.3 | ⬜ |
| R1.3.c | `contact_inquiries` (kind: general/b2b/interest) | MP §5 R1.3 | ⬜ |
| R1.3.d | `appointment_requests` (+ `consent_booking_rules` NOT NULL) | MP §5 R1.3 | ⬜ |
| R1.3.e | `email_deliveries` | MP §5 R1.3 | ⬜ |
| R1.3.f | `POST /public/inquiries` — `create_public_inquiry` | MP §5 R1.3 | ⬜ |
| R1.3.g | `POST /public/appointment-requests` — `create_appointment_request` | MP §5 R1.3 | ⬜ |
| R1.3.h | Honeypot + Upstash rate limit (IP+email) + limit veličine zahteva | MP §5 R1.3 | ⬜ |
| R1.3.i | Resend: obaveštenje timu + potvrda korisniku | MP §5 R1.3 · Proposal §6 M1.4 | 🟡 |
| R1.3.i.1 | `EmailService` + deljeni email wrapper — isti dizajn za sve mejlove | zahtev CTO 2026-07-18 | ⬜ |
| R1.3.j | Potvrda **mora** reći „zahtev nije potvrda termina" | MP §5 R1.3 · MP §5 Acceptance 3 · Proposal §6 | ⬜ |
| R1.3.k | Graciozan pad kad Resend zakaže (retry, log, correlation ID) | MP §5 Acceptance 2 | ⬜ |
| R1.3.l | Forme: RHF + Zod, inline greške, pending, success | MP §5 R1.3 | ⬜ |
| R1.3.m | `note` copy: **ne unositi zdravstvene detalje**; nikad logovati sadržaj poruke | MP §5 R1.3 · MP §11 | ⬜ |

> **R1.3.i 🟡** — Delimično odblokirano (D-016). Adrese kreirane (O-06): po jedna za svakog terapeuta + `info@psihointegritet.com`; Resend šalje sistemske/verifikacione mejlove sa `noreply@`. `RESEND_API_KEY` postavljen u `frontend/.env.local` — **nije u `.env.example` ni na jednoj strani, 0 pominjanja u kodu**. ⚠️ Stvarno slanje ide iz **backend-a** (rules §1.1 — business CRUD nije u frontendu); ključ treba replicirati u backend env kad R1.3 počne. Lokacija templejta (react-email FE vs Jinja BE) je već otvoreno pitanje iz MP §6.1 — „decide by ADR".
> **R1.3.i.1** — Novo (D-016). Jedan wrapper/layout za tim-obaveštenje, korisničku potvrdu i Resend `noreply@` verifikacije, isti dizajn svuda. Čeka odluku FE/BE lokacije (gore) pre nego što se piše kod.

### R1.4 — SEO, analitika, pristupačnost, performanse

| ID | Zadatak | Gde piše | Status | Napomena |
|---|---|---|---|---|
| R1.4.a | Metadata API po ruti | MP §5 R1.4 | ⬜ | **Nijedan `generateMetadata` ne postoji** |
| R1.4.b | `sitemap.xml`, `robots.txt`, canonical | MP §5 R1.4 | ⬜ | Nema `sitemap.ts` ni `robots.ts` |
| R1.4.c | OG slike | MP §5 R1.4 | ⬜ | — |
| R1.4.d | JSON-LD: Organization, LocalBusiness (Niš/Leskovac) | MP §5 R1.4 | 🚫 S10 | Samo potvrđeni podaci |
| R1.4.e | Analitika bez PII, samo nivo strane | MP §5 R1.4 · MP §11 | ⬜ | **Nikad** odgovori kviza ni sadržaj formi |
| R1.4.f | axe/Playwright na svim javnim rutama | MP §5 R1.4 · MP §5 Acceptance 1 | 🟡 | axe skener radi na `/`; nema ostalih ruta |
| R1.4.g | Lighthouse mobile ≥ 90 (home, profil, `/zakazi`) | MP §5 R1.4 | ⬜ | — |
| R1.4.h | Optimizacija slika + `next/font` | MP §5 R1.4 | 🟡 | `next/font` radi |

### R1.5 — Produkcijski launch gate

| ID | Zadatak | Gde piše | Status |
|---|---|---|---|
| R1.5.a | Domen na nalogu Psihointegriteta + DNS + SSL + `www` redirect | MP §5 R1.5 · Proposal §6 M1.5 | 🟡 |
| R1.5.b | Resend verifikacija domena (SPF/DKIM/DMARC) uz Zoho MX | MP §5 R1.5 | ✅ |
| R1.5.c | Adrese `info@`, `termini@` | MP §5 R1.5 | 🚫 S10 |
| R1.5.d | Odvojeni staging i produkcija; preview nikad ne dira prod podatke | MP §5 R1.5 · MP §14 | 🟡 |
| R1.5.e | Sentry (PII scrubbing) na oba app-a | MP §5 R1.5 | ⬜ |
| R1.5.f | Uptime check na `/api/v1/health` | MP §5 R1.5 | ⬜ |
| R1.5.g | Content freeze → **pisana saglasnost Anje** po stranicama | MP §5 R1.5 · MP §5 Acceptance 5 | ⬜ |
| R1.5.h | Deploy → smoke testovi → launch beleška u `PRODUCT_DECISIONS.md` | MP §5 R1.5 | ⬜ |

> **R1.5.a 🟡** — `psihointegritet.com` kupljen (2026-07-17, D-015). `qa.` (features) i `staging.` poddomeni u pripremi na Vercel-u. SSL/`www` redirect za apex domen — proveriti pri produkcijskom deployu.
> **R1.5.b ✅** — Verifikovano 2026-07-17 (D-015). Resend API ključ dodat; slanje sa `@psihointegritet.com` adresa radi. Ne čeka više S10.
> **R1.5.d 🟡** — Odvojeni Railway servisi za qa i staging (D-015) — svaki dobija sopstveni `CORS_ORIGINS`, ne mešati. Backend `CORS_ORIGINS` na svakom servisu mora sadržati tačno svoj frontend domen (`main.py:47-53` čita listu iz env-a).

**Prihvatanje R1** (MP §5, 5 kriterijuma · Proposal §6): sve rute na mobilnom i desktopu, axe bez kritičnih · e2e zeleni (home→profil→`/zakazi`; home→kviz→preporuka→`/zakazi`; B2B forma) · obe forme validiraju, upisuju u PostgreSQL, obaveštavaju tim, potvrđuju korisniku i **preživljavaju pad Resend-a** · svaka površina za zahtev kaže da to nije potvrda · 0 nepotvrđenih zvanja, 0 stock portreta, 0 zabranjenih termina (T1–T4) · staging izolovan · **pisano prihvatanje Anje**.

**Izričito van R1** (MP §5 · Proposal §6): nalozi i paneli · automatski slotovi · Google Calendar · plaćanje · CMS · zaštićeni resursi · chat/video · prijave na radionice.

---

## 6. R2 — Operativni MVP + Booking Engine

> **Gde piše:** master plan §6 · Proposal v1.1 §7 (Faza 2) · Engines (status enum §7.3, dijagnostika §18)
> **Ulazni kriterijumi:** R1 prihvaćen u produkciji · potpisan SoW za Fazu 2 · potvrđena pravila otkazivanja (S7) · Google nalozi po terapeutu (M2.6)
> **Pakovanje:** **2A** = M2.1–M2.5 + M2.7 (6.500–9.000 EUR) · **2B** = M2.6 (2.500–4.000 EUR) · opcija M2.8 (800–1.500 EUR)
> **Stanje: 0%.** Svih 11 backend modula je prazno; nula modela, nula migracija.

| ID | Milestone | Gde piše | Okvir | Status |
|---|---|---|---|---|
| M2.1 | Identitet, organizacija, uloge | MP §6.2 · Proposal §7 M2.1 | 1 ned. | ⏸️ |
| M2.2 | Katalog i raspoloživost | MP §6.2 · Proposal §7 M2.2 | 1–1,5 ned. | ⏸️ |
| M2.3 | Booking domen | MP §6.2 · Proposal §7 M2.3 · Engines §7.3 | 1,5–2 ned. | ⏸️ |
| M2.4 | Paneli (klijent, terapeut, admin) | MP §6.2 · Proposal §7 M2.4 | 1,5–2 ned. | ⏸️ |
| M2.5 | Email obaveštenja i podsetnici | MP §6.2 · Proposal §7 M2.5 | 3–4 dana | ⏸️ |
| M2.6 | Google Calendar Connect (**2B**) | MP §6.2 · Proposal §7 M2.6 · MP §1 T15 | 4–7 dana | ⏸️ 🚫 S12 |
| M2.7 | Dijagnostika + pilot | MP §6.2 · Proposal §7 M2.7 · Engines §18 | 1 ned. | ⏸️ |
| M2.8 | „Obavesti me" (**opciono**) | MP §6.2 · Proposal §7 M2.8 · Engines §7.7 | 3–5 dana | ⏸️ samo ako uđe u SoW |

### Ključne obaveze koje se ne smeju izgubiti

| Obaveza | Gde piše |
|---|---|
| `organization_id` na **svakom** tenant redu; skopirati svaki upit od prvog dana | MP §8 · rules §11 |
| Ekstenzija `btree_gist`; `EXCLUDE USING gist` na `appointments` i `appointment_holds` | MP §6.1 |
| **11 statusa** termina u jednoj domenskoj politici `booking/domain/status_machine.py` + iscrpni testovi | MP §6.1 · Engines §7.3 |
| Test konkurentnosti: dva istovremena zahteva **nikad** oba aktivna | MP §6 Acceptance 1 · Proposal §7 |
| Idempotency ključevi na svim mutirajućim booking endpointima | MP §6.2 M2.3 |
| Termin + event + outbox u **jednoj transakciji** | MP §6.2 M2.3 |
| `client_profiles` — **bez kolone za beleške, ne dodavati** | MP §6.1 · MP §1 T12 |
| Google daje samo free/busy, **nikad naslove**; pad Google-a ne blokira booking | MP §1 T15 · MP §6 Acceptance 4 |
| Svaki rizičan workflow nosi read-only dijagnostički kolektor **u istom PR-u** | MP §11 · rules §21 |
| UTC svuda; `booking_timezone` (IANA) se hvata pri zakazivanju | MP §6.1 |

---

## 7. R3–R7 — Backlog

> ⛔ **Master plan §3:** *„only R0–R2 are specified for implementation… do not scaffold their tables, modules, or UI."* Prazne placeholder apstrakcije su zabranjene. Ovo je kontekst, ne zadatak.

| Release | Naziv | Faza | Trajanje | Odlučene granice |
|---|---|---|---|---|
| R3 | Znanje i resursi | Faza 3 | 5–7 ned. | Stručni pregled pre objave; bez AI-izmišljenih kliničkih tekstova; edukativni PDF-ovi da, standardizovani psihološki testovi ne (licenca) |
| R4 | Radionice, programi, B2B | Faza 4 | 6–8 ned. | Poslodavac **nikad** ne vidi individualno korišćenje; radionica se objavljuje samo sa potvrđenim datumom/voditeljem/cenom/kapacitetom |
| R5 | Online rad, poruke, plaćanja | Faza 5 | 5–7 ned. | Bez snimanja/transkripata; poruke su administrativne, **nije terapijski chat**; podaci kartica nikad ne dodiruju naš server |
| R6 | Business OS | Faza 6 | 7–9 ned. | Bez metrika mentalnog stanja; bez marketinških segmenata iz individualnog savetovanja; AI **nikad** ne objavljuje sam |
| R7+ | SaaS, marketplace, AI navigator | Faze 7–9 | — | SaaS gate tek posle 8–12 nedelja interne produkcijske upotrebe (MP §8) |

---

## 8. Blokade — STOP lista

> **Gde piše:** master plan §13 · Proposal v1.1 §4 (Anjina lista odluka)
> **Pravilo (MP §0, tačka 5):** ako se udari u STOP stavku — stati i pitati. Ne pogađati.

> **Detaljno stanje:** `OPEN_DECISIONS.md` · **Doneto:** `PRODUCT_DECISIONS.md`
> **Ažurirano 2026-07-17:** 1 rešena, 2 parcijalne, 1 nova.

| ID | Odluka | Proposal §4 | Blokira | Stanje |
|---|---|---|---|---|
| **S1** | Pisana potvrda tačnog zvanja svakog terapeuta | #1 | R0.2.d, R0.2.f, objava profila (R1.5), `/tim/[slug]` | 🔴 **OTVOREN.** Sva tri terapeuta u kodu nose „pod supervizijom"; Marjanova biografija isto, a Anja kaže da su sertifikovani → kontradikcija stoji. *(Odgovor „samo ekavica" je jezička odluka D-001, ne odgovor na S1)* |
| **S2** | Ime Janković + tekst o lokacijama | #2 | `/tim/[slug]`, `/o-nama` | ✅ **REŠEN (D-006): „Marjan Janković"** → slug `marjan-jankovic`. ⬜ Tekst o lokacijama otvoren (O-02) |
| **S5** | Pravni tekstovi + krizni disclaimer | #5 | Pravne stranice (R1.1), launch (R1.5) | 🟡 **PARCIJALNO (D-008).** Pravac: platforma nije odgovorna, terapeuti = samostalni preduzetnici u APR. **Nije pravno potvrđeno.** Otvoreno: provera APR po terapeutu · **krizni disclaimer (T11) nedostaje** · izvršivost klauzule → pravnik (O-03) |
| **S10** | Kontakt + logo/brend | #3 | Footer, `/kontakt`, Resend, JSON-LD | 🟡 **PARCIJALNO (D-007).** Footer struktura + brzi linkovi + **postojeći logo** rešeni. ⬜ Email/telefon/mreže/adrese otvoreni (O-06) |
| **S13** | Autentične fotografije terapeuta | #3 | — | ✅ **REŠEN (D-009).** Prave fotografije stigle u dizajn handoff-u i ugrađene; 3 stock portreta obrisana iz repoa |
| **S11** | Pregled pitanja vođenog izbora od tima | #6 | Sign-off R1.2 | 🟠 otvoren |
| **S6** | Prva radionica: datum, voditelj, cena, kapacitet, pravila | #10 | Objava radionice sa prijavom | 🟠 otvoren |
| **S3** | Cena za adolescente/studente | #4 | Proširenje prikaza cena | 🟡 otvoren |
| **S7** | Konačna pravila otkazivanja/kašnjenja/nedolaska (nacrt: 24 h) | #7 | Seed `cancellation_policies` (M2.3) | 🟡 pre Faze 2 |
| **S12** | Google: koji kalendar po terapeutu + scope-ovi | #8 | M2.6 (2B) | 🟡 otvoren |
| **S4** | Model saglasnosti/zaštite za adolescente | — | Self-service za maloletnike (posle R2) | ⚪ |
| **S8** | Ko prima uplate i izdaje račune | #9 | R5 | ⚪ |
| **S9** | Provajder meeting linkova + rezervna procedura | — | R5 | ⚪ |

**Launch blokiraju: S1, S5, S13** i deo S10 (kontakt podaci). S2 više ne blokira. IZMENE §8 — poslati Anji uz Proposal v1.1.

---

## 9. Poznati defekti i tehnički dug

| # | Nalaz | Gde | Ozbiljnost |
|---|---|---|---|
| ~~D16~~ | ~~Tri stock portreta pod `imageSrc` terapeuta~~ | — | ✅ **REŠENO 2026-07-17** — obrisani, zamenjeni pravim fotografijama |
| D1 | `versions/` prazan **i netrackovan**, a `railway.json:10` na deploy pokreće `alembic upgrade head` → **puca na fresh clone** | `backend/src/psihointegritet/db/migrations/versions/` | 🔴 latentan deploy failure |
| D17 | **Footer i još 5 komponenti su i dalje ijekavica** i sad se vide na svakoj javnoj stranici: `site-footer.tsx` („savjetovanje… na jednom mjestu", „zamjenu"), `hero.tsx` („razumijevanje", „savjetovanje"), `workshop.tsx`, `faq.tsx`, `resources.tsx`, `support-paths.tsx`. Isto i `homepage.ts` — `midServices` („Partnersko savjetovanje", „Psihološko savjetovanje" — **T1/T2**), `reasons`, `featuredService` | `content/homepage.ts` + 6 komponenti | 🟠 **R0.2 sweep** — **Anjin lični sadržaj (`content/therapists.ts`) je izuzet** (D-017: ona lično piše ijekavicom), sve ostalo ide na ekavicu |
| D18 | Footer prikazuje **nepotvrđen email** `kontakt@psihointegritet.rs` i „Niš · online i uživo" (centar ima i Leskovac) | `site-footer.tsx:22-28` | 🟠 S10/O-06 |
| ~~D2~~ | ~~404: „Za organizacije" u hero kartici~~ | — | ✅ **REŠENO 2026-07-17** — `/rad-sa-kompanijama` napravljena, hero kartica je sad `Link` |
| ~~D3~~ | ~~404: „Već ste klijent?"~~ | — | ✅ **REŠENO 2026-07-17** — link postao chooser trigger („Znam kog terapeuta"), ne ruta; taj use case je baš to |
| D4 | `/health` ne proverava bazu, a `railway.json:8` ga koristi kao healthcheck → **deploy sa mrtvom bazom prijavljuje se kao zdrav** | `main.py:30` | 🟠 |
| D5 | `backend/openapi.json` gitignorovan → gate za contract drift (MP §12) ne može da padne | `.gitignore:26` | 🟠 |
| D6 | `backend/.env.local` sa **živim produkcijskim kredencijalima** u plaintextu (gitignorovan, nije u istoriji) | — | 🟠 razmotriti rotaciju |
| D7 | Rolne ne rade: `isSuperadmin` hardkodovan `false`, `memberships` prazan → `/superadmin` dostupan svakom ulogovanom | `use-identity.ts:32` `TODO(identity-backend)` | 🟡 rešava M2.1 |
| D8 | D2/D3 su `<a>` tagovi pa **zaobilaze `typedRoutes`** — typecheck, lint i testovi ih ne hvataju | `next.config.ts` `typedRoutes: true` | 🟡 |
| D9 | Mrtav kod: `lib/api/client.ts` se nigde ne importuje; `providers/query-provider.tsx` se nigde ne montira | — | 🟡 |
| D10 | ~14 zavisnosti instalirano a neiskorišćeno (`resend`, `next-intl`, `@upstash/*`, RHF, `date-fns`, `jose`, `rrule`…) | `package.json` | ⚪ većina se aktivira u R1.3/R2 |
| D11 | `api_host`/`api_port` se nikad ne čitaju → `API_PORT=8001` u `.env.example` je dekorativan i obmanjuje | `config.py:24-25` | ⚪ |
| D12 | Verzija „0.1.0" hardkodovana na 3 mesta + `pyproject.toml` → driftovaće | `main.py:33,42`, `health.py:14` | ⚪ |
| D13 | `get_session` prima `session_factory` kao običan argument, ne `Depends` → neupotrebljiv kao FastAPI dependency | `db/session.py:25` | ⚪ |
| D14 | `backend/README.md` je 0 bajtova, a `pyproject.toml:5` ga referencira i `Dockerfile:10` ga kopira | — | ⚪ |
| D15 | Nema `conftest.py`; `testcontainers` je dev zavisnost ali se ne koristi — nijedan test ne dira bazu | `backend/tests/` | ⚪ rešava M2.1 |

---

## 10. Konflikti u dokumentaciji

| # | Konflikt | Razrešenje |
|---|---|---|
| K1 | **Ekavica vs ijekavica.** MP T9 je tvrdio „ijekavica… the owner's authored style", a **Proposal v1.1 §3 — dokument koji Anja dobija — piše „bračno savetovanje" i „psihoterapijsko savetovanje"** (ekavica). Engines dokument: 27 ekavskih : 4 ijekavska | ✅ **Rešeno 2026-07-17 (CTO):** ekavica kao podrazumevani jezik sajta. MP T1/T2/T9 ispravljeni prema Proposalu. Sweep koda je R0.2.c. **Dopunjeno 2026-07-18 (D-017):** Anja Stamenković (iz Prijedora) lično govori/piše isključivo ijekavicom — njen `quote`/`bio`/`cardExcerpt` u `content/therapists.ts` su namerna ijekavica, ne greška, i izuzeti su iz R0.2 sweep-a. Marija i Marjan ostaju isključivo ekavica |
| K2 | **Status enum termina:** v0.3 §7 ima 8 statusa (`reschedule_requested`); MP §6.1 ima 11 (`change_requested`, `alternative_proposed`, `declined`, `expired`) | ✅ **MP pobeđuje** (noviji, izvor Engines §7.3). v0.3 anotiran zaglavljem |
| K3 | **Guidance perzistencija:** v0.3 §6 predviđa `guidance_sessions`/`guidance_answers`; T13 i §11 zabranjuju čuvanje odgovora u R1 | ✅ **T13 pobeđuje** — tabele se ne prave. v0.3 anotiran |
| K4 | **`documentations/` bio gitignorovan** — commit `6452c70` obrisao 4.059 linija iz gita | ✅ **Rešeno:** `.md` se prati, `.docx`/`.pdf` van gita |
| K5 | **Engines dokument nedostajao** iako ga MP §0 zove autoritetom #6 i citira normativno iz M2.3/M2.7 | ✅ **Rešeno:** kopiran u repo |
| K6 | **Ime master plana:** §8 je govorio `CLAUDE_CODE_MASTER_PLAN.md`, fajl je `..._v1_0.md` | ✅ **Rešeno:** referenca usklađena |
| K7 | **Konkurentne mape puta:** M0–M6 (`production-plan.md`) vs R0–R7 (MP §3) vs Faze 1–9 (Proposal §2) | ✅ **Rešeno:** `production-plan.md` arhiviran. R-mapa i Faze su usklađene 1:1 (MP §3) |
| K8 | **`PRODUCT_CONTEXT.md` imao svoj redosled autoriteta** (§1) koji ne poznaje master plan | ✅ **Rešeno:** arhiviran; MP §0 je jedini redosled |
| K9 | **Nedostaju dokumenti** koje MP traži: `PRODUCT_DECISIONS.md`, `OPEN_DECISIONS.md`, `handoff/bios-2026-07.md`, root `CLAUDE.md` | ⬜ R0.1.h–j, R0.2.g |
| K10 | **Svih 12 ADR-ova nenapisano**, `adr/` je prazan. MP §0 tačka 6: svako odstupanje traži ADR | ⬜ v0.3 §16 — ADR-001…012. Pisati kad odluka postane relevantna, ne unapred |
| K11 | **Port 8000 vs 8001** — arhivirani `FOUNDATION_SETUP.md` §7.1 je govorio 8000, `.env.example` 8001 | ✅ **Nije pravi sudar:** compose mapira `8001:8000`. Ali vidi D11 |

---

## 11. Sledeći korak

**R0 kao zaseban plan i PR** — `chore/docs-and-terminology-alignment` (IZMENE §8):

1. ✅ **R0.1.h–i** — `PRODUCT_DECISIONS.md`, `OPEN_DECISIONS.md`
2. **R0.1.j** — root `CLAUDE.md`
3. **R0.2** — sweep u jednom prolazu: T1/T2 + ekavica + kviz ključ + testovi. **Ovo ide pre novih ruta** — inače se novi sadržaj piše ijekavicom pa prepisuje
4. **D16** — obrisati 3 stock portreta, prebaciti na monogram inicijala
5. **R0.3.g–h** — `versions/.gitkeep` (D1) i `openapi.json` u git (D5)
6. **D2/D3** — dva 404 linka iz `hero.tsx`
7. Gates (MP §12) → completion report (rules §24) → potpis CTO

**Zatim R1.1** — `/tim` i `/tim/[slug]` su prve rute na redu (slug odblokiran D-006). Prave se sa generičkim zvanjima (`draft`) i monogramom; **objava čeka S1 + S13**.

**Paralelno, ne čeka kod:** poslati Anji rezime iz `OPEN_DECISIONS.md`. **Launch blokiraju S1 (zvanja), S13 (fotografije), S5 (pravni + krizni disclaimer) i kontakt podaci iz S10.**

**Posle prihvatanja R1:** SoW za Fazu 2 (2A obavezno; 2B i M2.8 opciono) → R2.

> **Booking flow (napomena CTO, 2026-07-17):** flow se projektuje sa naše strane pre nego što se traži od klijenta — da se izbegnu zastareli zahtevi. Artefakt je `BOOKING_POLICY` (IZMENE §2.4), a ne kod: T6 već zaključava request-first, S7 daje pravila otkazivanja. **Dokument da, implementacija tek u M2.3** (Faza 2, čeka SoW).
