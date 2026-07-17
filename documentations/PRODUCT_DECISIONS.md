# PRODUCT DECISIONS — Psihointegritet

Registar donetih odluka. **Samo doneto** — otvoreno stoji u `OPEN_DECISIONS.md`.

**Gde piše:** master plan §0 („If documents conflict, record the conflict here and ask the CTO") · §4 R0.1 · §13
**Pravilo:** odluka ulazi ovde tek kad ima **vlasnika i datum**. Bez toga je nacrt, ne odluka.
**Vlasnici:** Milan Dražić (CTO — tehničke, arhitektonske, proizvodne) · Anja Stamenković (vlasnica — sadržaj, zvanja, cene, brend) · pravnik (pravni tekstovi)

---

| # | Datum | Odluka | Vlasnik | Razlog | Uticaj |
|---|---|---|---|---|---|
| D-001 | 2026-07-17 | **Jezik javnog sadržaja: ekavica, srpski, latinica.** Ispravlja T9 koji je tvrdio „ijekavica — the owner's authored style" | Milan (CTO) | Proposal v1.1 §3 — dokument koji je Anja dobila — piše „bračno savetovanje" i „psihoterapijsko savetovanje" (ekavica). Engines dokument isto (27 ekavskih : 4 ijekavska). Master plan je bio jedini ijekavski (13:2) i odudarao od dokumenta na koji se klijent obavezao | T1 → „Bračno savetovanje", T2 → „Psihoterapijsko savetovanje", T9 → ekavica. Sweep koda = R0.2.c (~15 fajlova; `homepage.ts` ima 18 ijekavskih linija). ⚠️ `homepage.ts` je Anjin autorski tekst — **obavestiti je pre objave** |
| D-002 | 2026-07-17 | **Četiri obavezujuća dokumenta:** master plan v1.0, Proposal v1.1, IZMENE v1.0, ARCHITECTURAL_RULES_REVISED. Ostalo je kontekst ili arhiva | Milan (CTO) | 11 dokumenata se takmičilo za autoritet; tri konkurentne mape puta (M0–M6, R0–R7, Faze 1–9) radile su jedna protiv druge | 6 dokumenata arhivirano sa SUPERSEDED zaglavljem. `PRODUCT_CONTEXT.md` (bio autoritet #2) arhiviran — zamenjuju ga Proposal §3 + MP §1 |
| D-003 | 2026-07-17 | **`documentations/` vraćen u git.** `.md` se prati; `.docx`/`.pdf` ostaju van | Milan (CTO) | Commit `6452c70` je gitignorovao folder i obrisao 4.059 linija dokumentacije iz verzionisanja | Dokumentacija je ponovo u PR review-u i deljiva |
| D-004 | 2026-07-17 | **v0.3 arhitektura ostaje aktivna**, podređena master planu | Milan (CTO) | Jedini izvor modela podataka (§6), granica modula (§4.2), ADR liste (§16) | Anotirana zaglavljem: status enum → MP §6.1 (11 statusa) pobeđuje; `guidance_sessions` tabele se **ne prave** (T13) |
| D-005 | 2026-07-17 | **Engines dokument u repo** kao autoritet #6 (vodič, ne propis) | Milan (CTO) | MP §0 ga navodi, a M2.3 (§7.3) i M2.7 (§18) ga citiraju **normativno** — bez njega ti milestone-ovi nisu specificirani | Kopiran; §7.3 potvrđeno sadrži 11 statusa na koje se MP poziva |
| **D-006** | **2026-07-17** | **S2 REŠEN — „Marjan Janković"** (ne „Marijan") | Milan (CTO), potvrda Anje | Konačno pisanje imena | Slug: **`marjan-jankovic`**. Odblokira `/tim/[slug]` (R1.1). ⚠️ Tekst o lokacijama (Proposal §4 #2) i dalje otvoren — vidi O-02 |
| **D-007** | **2026-07-17** | **S10 spušten sa blokade launcha na parcijalno.** Footer: pravni linkovi (privatnost, uslovi, kolačići, pravila zakazivanja) + brzi linkovi (tim, radionice, rad sa kompanijama). **Logo: postojeći** | Milan (CTO) | Struktura footera se zna, detalji stižu naknadno | Odblokira strukturu footera. ⚠️ Email/telefon/mreže i dalje nedostaju → `/kontakt`, Resend (`info@`, `termini@`) i JSON-LD **i dalje blokirani** — vidi O-06 |
| **D-008** | **2026-07-17** | **S5 pravni pravac (nacrt, NIJE pravna potvrda).** Platforma Psihointegritet nije odgovorna za pojedinačne terapeute; terapeuti preuzimaju odgovornost kao samostalni preduzetnici registrovani u APR. Stranice: privatnost, uslovi, kolačići, pravila zakazivanja. Tekstovi informativni — kako doći do terapeuta i koje programe imaju | Milan (CTO) — **pravnik nije potvrdio** | Definiše model odgovornosti | ⚠️ **S5 NIJE zatvoren.** Stranice ostaju „u pripremi — pravna potvrda". Tri otvorene stavke: (1) APR registracija se mora **proveriti po terapeutu** — tvrdnja u pravnom tekstu mora biti tačna; (2) **krizni disclaimer (T11) nedostaje** u ovom pravcu; (3) da li je ovakva klauzula o odgovornosti izvršiva traži pravnika. Vidi O-03 |

| **D-009** | **2026-07-17** | **S13 REŠEN — autentične fotografije terapeuta** ugrađene; 3 stock portreta obrisana iz repoa | Milan (CTO), materijal od Anje | Prave fotografije stigle u dizajn handoff-u (`assets/{anja,marija,marjan}.jpeg`) | `public/images/therapists/`. Uklonjen rizik iz Proposal §6 („Nema tuđih (stock) portreta pod imenima terapeuta") |
| **D-010** | **2026-07-17** | **Dizajn handoff je autoritet #7 — najniži.** Layout se preuzima 1:1, **copy se ispravlja** po T1/T2/T7/T8/T9/T11 | Milan (CTO) | Handoff `data/therapists.js` je kršio: T1 („Partnersko savjetovanje" kod Anje, „Partnerska terapija" kod Marjana — dva imena za jednu uslugu), T2 („Psihološko savjetovanje" kod sve troje), T3 („pod supervizijom" kod sve troje), T9 (ijekavica), T8 („uživo u Nišu" na svakom profilu iako su Marija i Marjan u Leskovcu), MP §11 (poverljivost „Potpuna" — neistinita tvrdnja) | Sve ispravke u `content/therapists.ts`. Handoff premešten u `frontend/design-handoff/` i gitignorovan (14 MB) |
| **D-011** | **2026-07-17** | **Ruta je `/tim/[slug]` sa punim imenima** (`anja-stamenkovic`), ne `/tim/[id]` sa skraćenicama (`anja`) | Milan (CTO) — „ili kako smo definisali" | MP §5 R1.1 imenuje slugove eksplicitno; puna imena su bolja za SEO | `generateStaticParams` daje 3 statičke rute; kviz targetira po slugu |

---

## Kako se dopunjava

Novi red na dno. Ako odluka menja T-vrednost ili STOP stavku:

1. Ažurirati `CLAUDE_CODE_MASTER_PLAN_v1_0.md` (§1 T-tabela ili §13 STOP tabela)
2. Ažurirati `OPEN_DECISIONS.md` (izbaciti rešeno)
3. Ažurirati `TODO.md` §8 (blokade) i pogođene redove
4. Ako odstupa od `ARCHITECTURAL_RULES_REVISED.md` ili v0.3 → **ADR u `adr/`** (MP §0, tačka 6)
