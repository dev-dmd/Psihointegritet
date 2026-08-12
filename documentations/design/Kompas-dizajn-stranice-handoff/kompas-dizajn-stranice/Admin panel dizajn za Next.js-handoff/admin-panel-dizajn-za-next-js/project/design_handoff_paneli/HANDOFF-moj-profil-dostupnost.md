# Handoff — Moj profil › Dostupnost i stranica Dostupnost

**Obim:** samo tab **Dostupnost** na `/radni-prostor/profil` i stranica `/radni-prostor/dostupnost` na koju vodi.
**Vizuelna referenca:** `Psihointegritet Control Center.dc.html` → Moj profil → tab **Dostupnost** (tokeni: `tailwind.config.ts`, `globals.css`; opšta pravila: `README.md`).
**Tehnička osnova:** `ADR-015 — Availability Service Contract (v2)`. Sva imena polja u ovom dokumentu su iz ADR-a; UI ih ne izmišlja.

---

## 1. Šta ova stranica jeste (i šta nije)

Tab **Dostupnost** je **pregled u četiri kartice** — terapeut na jednom ekranu vidi celu sliku svoje dostupnosti i odatle ulazi u uređivanje. Kartice **ne uređuju podatke inline**; svaka je preview + ulaz.

Četiri kartice su četiri **odvojena sloja** koja Booking engine čita zasebno (ADR-015 §2.7.6). Numeracija `1 ·` … `4 ·` u naslovima je namerna i **ostaje u UI-ju** — ona uči korisnika modelu:

```
DOSTUPNO = (radno vreme → generisani slotovi  ∪  ručno dodati termini)
           − (izuzeci  ∪  zauzeti termini  ∪  rezervisani kapacitet)
```

Ključna poruka koju UI mora da prenese: **raspoloživost nije termin.** Kartica 2 je izvedena vrednost, ne unos.

---

## 2. Rute

| Ruta | Šta je |
|---|---|
| `/radni-prostor/profil?tab=dostupnost` | Moj profil → tab Dostupnost (ovaj ekran). Tabovi profila: Javni profil · Matching preferencije · **Dostupnost** |
| `/radni-prostor/dostupnost` | Puna stranica dostupnosti; tabovi: **Radno vreme** (default) · **Termini** · **Izuzeci** |
| `/radni-prostor/dostupnost?tab=radno-vreme` | Cilj dugmeta **Uredi** na kartici 1 |
| `/radni-prostor/dostupnost?tab=izuzeci` | Cilj dugmeta **Uredi** na kartici 3 |
| `/radni-prostor/kompanije/[id]?tab=kapacitet` | Cilj dugmeta **Uredi** na kartici 4 (rezervisani kapacitet se uređuje na kompaniji, ne na terapeutu) |

Tab stanje ide u query param (`?tab=`) da bi se stanje delilo linkom i preživelo refresh. Vlasnica koja gleda tuđi profil: `/radni-prostor/terapeuti/[id]?tab=dostupnost` — isti ekran, vidi §8.

---

## 3. Layout

- Grid `grid-cols-2 gap-[14px]`, ispod 1024px `grid-cols-1` (kartice idu jedna ispod druge, redosled 1→4 se ne menja).
- Iznad grida **explainer kartica** (`bg-meadow/22 border-sage/30 rounded-card px-[18px] py-[13px] text-[13px]`):
  > **Četiri odvojena sloja:** radno vreme → slotovi → izuzeci → rezervisani kapacitet. Booking engine ih čita zasebno — raspoloživost nije isto što i termin.
- Kartica: `.card rounded-panel p-[22px_24px]`, naslov `.eyebrow` (11.5px/600/uppercase/tracking .14em, `sage`), zatim sadržaj, pa **footer**: `border-t border-line pt-[13px] mt-[14px] flex justify-end`.
- U footeru stoji **`Uredi`** (`.btn-outline`, min-h 44px) — osim kartice 2, gde stoji samo tekst `Nastaje iz radnog vremena` (13px, italic, `ink-45`, ista visina reda 44px da se kartice poravnaju).
- Kartice u istom redu su iste visine (`items-stretch`, sadržaj `flex flex-col`, footer `mt-auto`).

---

## 4. Kartice — sadržaj, izvor podataka, stanja

### Kartica 1 · Radno vreme

**Prikaz** — grupisana recurring pravila, jedan red po grupi identičnog intervala:

```
Ponedeljak i sreda · 14:00 — 20:00
Utorak i četvrtak · 10:00 — 16:00
Petak · 10:00 — 14:00
```

Dani normalnim tekstom (`ink-70`), **vremena bold u `forest`**; `line-height: 2`. Grupisanje: dani sa identičnim `start_local_time`/`end_local_time` spajaju se u jedan red, sortirano po prvom danu (ISO: 0 = ponedeljak).

**Izvor:** `availability_rules` (`weekday`, `start_local_time`, `end_local_time`, `format`, `location_id`, `valid_from`, `valid_until`) filtrirano po aktivnom `availability_profile_id` i važenju na današnji dan.
**Vremena su lokalno wall-clock vreme profila** (`availability_profiles.timezone`, default `Europe/Belgrade`) — prikazuje se tačno ono što je uneto, bez UTC konverzije u UI-ju (ADR-015 §2.7.3).

- Ako terapeut ima **više profila** (npr. online + uživo Niš), iza intervala ide sitna oznaka formata/lokacije: `· online`, `· uživo Niš` (12.5px, `ink-55`).
- **Prazno stanje:** dashed kartica, tekst „Radno vreme još nije uneto — javni booking ne prikazuje termine." + `Uredi` postaje primarno **`Unesi radno vreme`**.
- **Akcija:** `Uredi` → `/radni-prostor/dostupnost?tab=radno-vreme`.

### Kartica 2 · Raspoloživi slotovi  *(read-only, izvedeno)*

**Prikaz** — jedan pasus (14px, `ink-70`, line-height 1.6), broj bold u `forest`:

> Generišu se iz radnog vremena: 60 min + 15 min pauze. Klijent u javnom bookingu vidi samo ovo. — **18 slotova ove nedelje**

Footer: samo tekst **Nastaje iz radnog vremena** (italic, `ink-45`). **Nema dugmeta** — kartica je namerno bez akcije jer se slotovi ne unose.

**Izvor:**
- „60 min + 15 min pauze" = `service_booking_configs.duration_minutes` + `buffer_after_minutes` primarne ponude vezane za profil. Ako profil koriste ponude različitog trajanja, tekst glasi: „Generišu se iz radnog vremena; trajanje i pauza zavise od usluge."
- „18 slotova ove nedelje" = broj `DerivedSlot` iz `derive_slots(...)` za tekuću nedelju (pon–ned u zoni profila), **posle** oduzimanja izuzetaka, zauzetih termina, aktivnih hold-ova i `min_lead_time_hours` filtera. Isti broj koji bi klijent video u javnom bookingu.
- Za profil u modu `manual_slots` tekst je: „Termini se ne generišu automatski — nudite ih ručno u tabu Termini. — **N termina ove nedelje**".

**Stanja:** loading = skeleton pasusa; 0 slotova = tekst „Nema raspoloživih termina ove nedelje" u `st-wait` boji + link „Proveri izuzetke →".

### Kartica 3 · Izuzeci

**Prikaz** — lista, red = `naziv/razlog` levo (14px/600, `coffee`) + `period` desno (13px, `ink-55`), `gap-[10px]`, maks. 3 reda pa `+ još N`:

```
Godišnji odmor            3 — 14. avgust
Konferencija · Beograd    25. jul
```

**Izvor:** `availability_exceptions` (`kind`, `starts_at`, `ends_at`, `reason_code`, `availability_profile_id`) — prikazuju se **budući i tekući** izuzeci, sortirano po `starts_at` rastuće; prošli se ne prikazuju na kartici.

- `kind = unavailable` → prikaz kao gore. `kind = extra_available` → prefiks „Dodatno: " i tekst u `st-ok` boji.
- `availability_profile_id = NULL` → sitna oznaka „svi rasporedi" (blokira i online i uživo).
- **Prazno stanje:** „Nema unetih izuzetaka." (`ink-45`) + `Uredi` → `Dodaj izuzetak`.
- **Akcija:** `Uredi` → `/radni-prostor/dostupnost?tab=izuzeci`.

### Kartica 4 · Rezervisani kapacitet

**Prikaz** — red po ugovoru: naziv kompanije (14px/600) levo, termin desno (13px, `ink-55`), pa objašnjenje:

```
TechNiš d.o.o.            Četvrtak · 16:00 — 18:00

Nedostupno javnom bookingu — koristi se samo kroz kompanijski program.
```

**Izvor:** rezervacije kapaciteta vezane za terapeuta (`company_reserved_capacity`: `company_id`, `weekday`, `start_local_time`, `end_local_time`, `valid_from/until`). Ulaze u BLOCKERS za javni booking, a kompanijski program ih koristi.

- **Prazno stanje:** „Nema rezervisanog kapaciteta." + `Uredi` vodi na listu kompanija.
- **Akcija:** `Uredi` → `/radni-prostor/kompanije/[id]?tab=kapacitet`. Terapeut bez prava na kompanije vidi karticu **read-only** (bez dugmeta, umesto njega tekst „Uređuje vlasnica centra").

---

## 5. Stranica `/radni-prostor/dostupnost`

Header: naslov **Dostupnost** (serif 34px, mobilno 27px), podnaslov „Radno vreme, ponuđeni termini i izuzeci — osnova javnog bookinga.", desno statusni bedž profila (`Aktivan raspored` / `Pauziran`) i `Nazad na profil` link.
Ispod: `TabPills` — **Radno vreme · Termini · Izuzeci** (horizontalni scroll na mobilnom, `?tab=` u URL-u).

### 5.1 Tab Radno vreme

- Lista od 7 redova (Ponedeljak → Nedelja). Red: dan (14px/600) · intervali kao pilule `14:00 — 20:00` sa `×` za brisanje · `+ Dodaj interval`. Neradni dan: `Ne radim` (`ink-45`, italic).
- Ispod liste: **Kopiraj na sve radne dane**, i sekcija **Pravila rasporeda** (iz `availability_profiles`): način nuđenja (`Puni sat` / `Fleksibilno 15/30/60 min` / `Ručno biram termine`), zona (`Europe/Belgrade`, read-only prikaz), **minimalni rok zakazivanja** `min_lead_time_hours` (default 24, `0` = isključeno), **rok za otkazivanje** `cancellation_notice_hours`. Oba su **po terapeutu**, ne po centru (ADR-015 §5.1.1).
- Ako terapeut ima više profila (online / uživo), iznad liste segmented izbor profila; svaki profil ima svoje intervale.
- **Validacija:** intervali istog dana i profila se ne preklapaju (`start < end`, korak 15 min); poruka: „Intervali se preklapaju — spojite ih ili razdvojite."
- Snimanje: sticky footer `Sačuvaj izmene` (primary) + `Odustani`; upozorenje pri napuštanju nesačuvanog; posle snimanja toast + „Novi raspored važi od danas."

### 5.2 Tab Termini

Nedeljna mreža ponuđenih **početaka** (ne trajanja): kolone Pon–Ned, ispod svake liste vremena kao pilule. Vreme koje dolazi iz radnog vremena je prikazano prigušeno (auto), ručno dodato punom bojom (`meadow`), ×  briše.

- Alatke iznad mreže: navigacija nedelje `‹ 20 — 26. jul ›`, **Generiši nedelju** (iz radnog vremena), **Kopiraj prošlu nedelju**, `+ Dodaj termin`.
- Izvor: `manual_availability_slots` (`starts_at`, `format`, `location_id`, `source: manual | weekly_generator | copied_week`). `source` se prikazuje samo kao tooltip — ne menja ponašanje.
- U modovima `hourly_grid` / `flexible_grid` ovaj tab je **pregled generisanih početaka** (read-only mreža + „Dodatno dostupno" unosi kao `extra_available`); u modu `manual_slots` je **glavni radni ekran** — bez njega nema ponude.
- Prikaži legendu: `iz radnog vremena` · `ručno dodato` · `zauzeto` (prekriženo, `ink-45`) · `blokirano izuzetkom`.

### 5.3 Tab Izuzeci

- Lista izuzetaka grupisana na **Predstojeći** / **Prošli** (prošli sklopljeni). Red: razlog, period (datum + vreme ako nije ceo dan), obim (`svi rasporedi` / naziv profila), tip bedž: `Nedostupno` (`badge-danger`) ili `Dodatno dostupno` (`badge-ok`); akcije Izmeni / Obriši.
- `+ Novi izuzetak` → forma (sheet na mobilnom): tip (Nedostupno / Dodatno dostupno), datum od–do, ceo dan ili vremenski opseg, obim (svi rasporedi / određeni profil), razlog (slobodan tekst, interno).
- **Pravilo iz ADR-015 §2.7.4:** u modu `manual_slots` opcija **Dodatno dostupno** se ne nudi — dodatni termini se unose u tabu Termini. Prikaži objašnjenje umesto opcije.
- **Sudar sa postojećim terminima:** ako izuzetak pokriva potvrđene termine, pre snimanja modal: „U ovom periodu imate 3 potvrđena termina. Izuzetak ih ne otkazuje — kontaktirajte klijente." + lista termina.

---

## 6. Data model (samo relevantno)

```ts
interface AvailabilityProfile {          // KAKO nudi vreme
  id: string; therapistId: string; enabled: boolean;
  mode: "hourly_grid" | "flexible_grid" | "manual_slots";
  startStepMinutes: number | null;       // null za manual_slots
  timezone: string;                      // "Europe/Belgrade"
  minLeadTimeHours: number;              // default 24, 0 = isključeno
  cancellationNoticeHours: number;       // po terapeutu, ne po centru
  format: "online" | "in_person"; locationId?: string;
}
interface AvailabilityRule {             // KADA radi (kartica 1, tab Radno vreme)
  id: string; profileId: string; weekday: 0|1|2|3|4|5|6;   // 0 = ponedeljak
  startLocalTime: string; endLocalTime: string;            // "14:00" — lokalno vreme profila
  validFrom: string; validUntil: string | null;
}
interface AvailabilityException {        // kartica 3, tab Izuzeci
  id: string; profileId: string | null;  // null = blokira sve rasporede
  kind: "unavailable" | "extra_available";
  startsAt: string; endsAt: string;      // UTC ISO
  reasonCode?: string; format?: string; locationId?: string;
}
interface ManualAvailabilitySlot {       // tab Termini
  id: string; profileId: string; startsAt: string;         // UTC ISO
  source: "manual" | "weekly_generator" | "copied_week";
}
interface DerivedSlot { startsAt: string; endsAt: string; } // kartica 2 — samo se broji, ne unosi
```

**Predlog endpoint-a:** `GET /me/availability/summary` (jedan poziv za sve 4 kartice: `rules[]`, `derivedSlotCount`, `durationMinutes`, `bufferAfterMinutes`, `exceptions[]`, `reservedCapacity[]`) · `GET/PUT /me/availability/rules` · `GET/POST/DELETE /me/availability/slots` · `GET/POST/PATCH/DELETE /me/availability/exceptions` · `POST /me/availability/slots/generate-week` · `POST /me/availability/slots/copy-week`.

---

## 7. Pravila koja UI ne sme da prekrši

1. **Kartica 2 nema unos.** Broj slotova je izvedena vrednost; svaka izmena ide kroz kartice 1, 3 ili tab Termini.
2. **Lokalno vreme, ne UTC.** Sva unesena i prikazana vremena su wall-clock u zoni profila; UTC postoji samo u API payload-u za konkretne trenutke (izuzeci, ručni termini).
3. **Trajanje i pauza se ne unose ovde.** Oni pripadaju usluzi (`service_booking_configs`) — ekran ih samo prikazuje kao tekst.
4. **Rezervisani kapacitet se ne uređuje na terapeutu** — samo prikazuje; izvor je ugovor sa kompanijom.
5. **Izuzetak ne otkazuje termine.** Nikada tiho ne menjati postojeće termine — samo upozoriti (§5.3).
6. **Bez „Uskoro" placeholder-a** na ovom ekranu: sve četiri kartice i sva tri taba su u obimu R2.

---

## 8. Uloge i pristup

| Uloga | Ponašanje |
|---|---|
| **Terapeut** | Vidi i uređuje sopstvenu dostupnost (kartice 1–3, sva tri taba). Kartica 4 read-only. |
| **Vlasnica centra** | Isto + može otvoriti tuđi profil (`/radni-prostor/terapeuti/[id]?tab=dostupnost`) i uređivati; iznad kartica traka „Uređujete raspored: Marjan Janković" (`badge-wait`). Kartica 4 sa `Uredi`. |
| **Klijent / javni sajt** | Nikada ne vidi ovaj ekran — samo rezultat kartice 2 (raspoložive termine). |

Server-side provera vlasništva nad profilom na svakoj mutaciji; nije dovoljno sakriti dugme.

---

## 9. Mobilno

- Kartice jedna ispod druge; `Uredi` širine kartice (`w-full`), min 44px.
- `/radni-prostor/dostupnost`: tabovi horizontalni scroll; forma izuzetka i dodavanje intervala kao **bottom sheet**; nedeljna mreža u tabu Termini postaje **lista po danima** (dan = sekcija, vremena kao pilule u wrap redu) — nema horizontalne tabele.
- Sticky footer sa `Sačuvaj izmene` iznad bottom navigacije.

---

## 10. Acceptance kriterijumi

- [ ] Tab Dostupnost prikazuje 4 kartice tačno u redosledu i sa numeracijom `1 ·` … `4 ·`; kartica 2 nema dugme, već tekst „Nastaje iz radnog vremena".
- [ ] `Uredi` na kartici 1 otvara `/radni-prostor/dostupnost?tab=radno-vreme`, na kartici 3 `?tab=izuzeci`, na kartici 4 stranicu kompanije; svi ciljevi rade i sa direktnim linkom.
- [ ] Broj u kartici 2 jednak je broju termina koje javni booking prikazuje za istu nedelju (isti `derive_slots` poziv).
- [ ] Izmena radnog vremena u tabu Radno vreme menja tekst kartice 1 i broj u kartici 2 posle povratka na profil (invalidacija keša).
- [ ] Unos izuzetka koji pokriva potvrđene termine prikazuje upozorenje sa listom i ne otkazuje ih.
- [ ] Preklapajući intervali se ne mogu sačuvati; poruka je jasna i vezana za polje.
- [ ] Sva vremena prikazana su u zoni profila i ostaju ista preko prelaska na letnje/zimsko računanje vremena.
- [ ] Ceo ekran upotrebljiv na 375px širine; sve mete ≥ 44px.
