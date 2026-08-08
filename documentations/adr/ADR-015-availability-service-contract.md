# ADR-015 — Availability Service Contract

**Status:** Accepted (v2 supersedes v1 slot-generation i exception semantiku)
**Datum:** 2026-08-06 (v1) · **2026-08-08 (v2)**
**Vlasnik tehničke odluke:** Milan Dražić (CTO)
**Povezano:** ADR-013 · PRE_R2_BOOKING_ENGINE_DECISION_SPEC_v0.2.md §6 (BDS-002) · PRE_R2 §7 (BDS-003, BDS-007A)

---

## 0. v2 — šta se menja u odnosu na v1

v2 **supersedes** sledeće delove v1:

- **Slot generation contract** (v1 §2.1 `slot_duration_minutes` je upravljao i generisanjem i zauzećem): sada su **`duration_minutes`** (koliko termin zauzima) i **`start_step_minutes`** (korak mreže početaka) razdvojeni. v1 je pretpostavljao da je svaki sledeći kandidat tačno `slot_duration_minutes` posle prethodnog; to više nije tačno.
- **Exception semantika** (v1 §2.2 `block | extra_slot | modified_hours`): zamenjena sa **`unavailable | extra_available`**, oba sa konkretnim `starts_at`/`ends_at` intervalima. v1 `block` je uklanjao ceo datum; v2 `unavailable` je proizvoljan interval.
- **Recurring vreme** (v1 §2.3 je čuvao `start_time`/`end_time` kao UTC `time`): sada se recurring radno vreme čuva kao **lokalno wall-clock pravilo** (`start_local_time`/`end_local_time` + `timezone`), a UTC nastaje tek pri generisanju konkretnog datuma — DST ostaje ispravan.
- **`availability_rules.service_ids`** (v1 §2.1 `UUID[]` lista usluga na pravilu): uklonjena. Veza je sada `ServiceBookingConfig → availability_profile_id → availability_rules`.
- **Tabela `manual_availability_slots`** je novi treći izvor dostupnosti za `MANUAL_SLOTS` mod.

**Nisu menjani:** v1 §2.4 `derive_slots` načelni tok (kandidati → uklanjanje zauzetih), v1 §2.5 `SlotHold` concurrency/expiry, v1 §2.6 konfigurabilni default-i po organizaciji, v1 §3 posledice (source of truth, čista domain funkcija, Calendar adapter seam).

Istorija v1 ostaje u git-u.

---

## 1. Kontekst

PRE-R2 Booking Engine Decision Specification §6 (BDS-002) definiše granicu vremenskog ugovora: periodi se čuvaju i porede u UTC-u, organizacija i podrazumevani javni prikaz koriste IANA zonu `Europe/Belgrade`, a pri slanju se čuva korisnikova IANA zona radi tačne komunikacije i letnjeg/zimskog računanja vremena.

Pre R2 je potrebno potvrditi ili namerno isključiti:

- trajanje po ponudi i buffer pre/posle;
- recurring radno vreme po terapeutu, formatu i lokaciji;
- odsustva, ručne blokove i dodatnu dostupnost;
- minimalni rok, maksimalni horizont i pravilo za poslednji slot u danu;
- overlap, paralelne formate, dva učesnika i ručno unete termine;
- pravila za izvor dostupnosti i Calendar outage.

Ovaj ADR zaključava tehnički Availability Service Contract pre implementacije, a trajanja, bufferi i radno vreme ostaju konfigurabilne vrednosti po organizaciji — nijedna nije hardkodovana konstanta.

---

## 2. Odluka

### 2.1 Radno vreme — `availability_rules`

Svaki terapeut ima jedan ili više recurring vremenskih blokova. Svaki blok definiše:

| Polje | Tip | Opis |
|---|---|---|
| `organization_id` | UUID | Tenant scope |
| `therapist_id` | UUID | Veza na terapeuta (matching profil) |
| `day_of_week` | `0..6` | ISO 8601: 0 = Monday, 6 = Sunday |
| `start_time` | `time` | UTC, npr. `07:00` = 09:00 Belgrade zimi |
| `end_time` | `time` | UTC |
| `valid_from` | `date` | Prvi dan važenja pravila (uključujući) |
| `valid_until` | `date \| null` | Poslednji dan važenja (uključujući); `null` = trajno |
| `format` | `online \| in_person` | Format na koji se pravilo odnosi |
| `location_id` | `UUID \| null` | Lokacija za `in_person`; `null` za `online` |
| `service_ids` | `UUID[]` | Lista usluga na koje se pravilo odnosi; prazno = sve |
| `slot_duration_minutes` | `int` | Trajanje jednog slota (preuzeto iz usluge, može se suziti) |
| `buffer_before_minutes` | `int` | Buffer pre slota (0 = bez buffera) |
| `buffer_after_minutes` | `int` | Buffer posle slota |

Buffer se dodaje na trajanje usluge pri proveri zauzeća. Na primer, usluga od 60 min sa bufferom od 15 min posle znači da slot 10:00–11:00 blokira period 10:00–11:15 za druge provere.

Pravila se **ne preklapaju**. Dva pravila za istog terapeuta, isti dan i format koja se vremenski dodiruju tretiraju se kao jedno kontinualno radno vreme — sistem ne pravi slot koji bi prešao granicu između pravila osim ako se eksplicitno dodiruju.

### 2.2 Izuzetci — `availability_exceptions`

Jednokratne izmene recurring pravila:

| Polje | Tip | Opis |
|---|---|---|
| `organization_id` | UUID | Tenant scope |
| `therapist_id` | UUID | |
| `exception_date` | `date` | Datum na koji se izuzetak odnosi (UTC) |
| `kind` | `block \| extra_slot \| modified_hours` | |
| `start_time` | `time \| null` | Za `extra_slot` i `modified_hours` |
| `end_time` | `time \| null` | Za `extra_slot` i `modified_hours` |
| `reason` | `str \| null` | Interni opis (godišnji odmor, konferencija, itd.) |

Pravila razrešenja:

- `block` na `exception_date` potpuno uklanja sve slotove za taj datum, bez obzira na recurring pravila.
- `extra_slot` dodaje jedan dodatni slot van recurring pravila, ali ne sme da se preklapa sa postojećim blokovima ili potvrđenim terminima.
- `modified_hours` zamenjuje recurring pravilo za taj dan — koristi se `start_time`/`end_time` iz izuzetka umesto recurring vrednosti.

### 2.3 UTC čuvanje i `Europe/Belgrade` prikaz

- Svi `date`, `time` i `timestamp` podaci čuvaju se u UTC-u u bazi.
- Organizacija ima konfigurabilnu `iana_timezone` (podrazumevano `Europe/Belgrade`).
- Pri izračunavanju slotova, sistem:
  1. čita UTC vrednosti iz baze;
  2. konvertuje ih u IANA zonu organizacije za proveru dana u nedelji i granica dana;
  3. generiše slotove kao UTC `[start, end)` intervale;
  4. prikazuje ih klijentu u zoni organizacije.
- Klijent pri slanju zahteva šalje svoju IANA zonu (`client_timezone`); backend je čuva uz zahtev radi DST ispravne komunikacije.
- Prelazak na letnje/zimsko računanje vremena se tretira ispravno: slotovi na dan prelaska koriste stvarno trajanje u UTC-u (npr. 23:00–06:00 UTC umesto uobičajenih 22:00–05:00).

### 2.4 Generisanje dostupnih slotova — `derive_slots`

Algoritam za generisanje kandidat-slotova za dati `(service, therapist, format, location, date_from, date_until)`:

```text
1. Učitaj sva važeća availability_rules za kombinaciju.
2. Za svaki dan u opsegu, za svako pravilo koje odgovara danu:
   a. Proveri da li postoji availability_exception za taj datum.
   b. Ako je exception.kind == "block", preskoči ceo dan.
   c. Ako je exception.kind == "modified_hours", koristi exception vreme umesto recurring.
   d. Ako je exception.kind == "extra_slot", dodaj ga posle regularne petlje.
   e. Izračunaj effective_start i effective_end u UTC-u.
   f. Generiši slotove počevši od effective_start sa inkrementom slot_duration_minutes.
   g. Poslednji slot mora da stane ceo pre effective_end (end_time - duration >= start).
3. Iz dobijene liste kandidata ukloni:
   a. Potvrđene Appointment-e (status = confirmed).
   b. Aktivne SlotHold-ove (expires_at > now).
   c. Aktivne AppointmentRequest-e ako BDS-007B pending-unavailable politika važi.
   d. Buffer zone potvrđenih termina (buffer_before + buffer_after).
   e. External free/busy blokove kada Calendar adapter bude omogućen.
4. Sortiraj slotove hronološki.
5. Vrati listu `DerivedSlot` objekata.
```

```text
candidate slots = approved availability rules
                - exceptions and blocks
                - confirmed appointments and approved buffers
                - external free/busy blocks when enabled
                - active hold or pending-request policy when applicable
```

UI ne donosi odluku da je slot siguran. Poslednja zaštita je PostgreSQL ograničenje i concurrency test u R2 domenu.

### 2.5 `SlotHold` — concurrency i expiry

`SlotHold` je kratko tehničko držanje slota tokom korisnikovog slanja forme. Nije Appointment, potvrda niti rezervacija.

| Pravilo | Vrednost |
|---|---|
| Trajanje hold-a | Konfigurabilno po organizaciji (`slot_hold_ttl_seconds`, podrazumevano 600 = 10 minuta) |
| Ko ga pravi | Samo za `slot_request` BookingMode; `request` mode nema hold |
| Atomsko pravljenje | `INSERT ... ON CONFLICT DO NOTHING` ili ekvivalentan Redis `SET NX` sa TTL-om |
| Idempotency | `idempotency_key` garantuje najviše jedan hold po klijentskom pokušaju |
| Expiry | `expires_at = now + ttl`; expired hold ne blokira slot |
| Redis pomoćni sloj | Redis `SET resource:slot_hold:{slot_key} client_id NX EX ttl` kao brzi contention check; PostgreSQL je krajnji autoritet |
| Oslobađanje | Uspešno slanje → hold se konvertuje u AppointmentRequest; neuspešno/isteklo → hold se briše |

Concurrency scenario:

```text
Client A                      Client B                    PostgreSQL
   |                             |                            |
   |-- Redis SET NX --> OK       |                            |
   |-- INSERT slot_hold --> OK   |                            |
   |                             |-- Redis SET NX --> FAIL   |
   |                             |   (slot unavailable)      |
   |-- POST appointment_request |                            |
   |-- DELETE slot_hold          |                            |
   |-- COMMIT                    |                            |
```

### 2.6 Konfigurabilni default-i po organizaciji

Svi rokovi i trajanja su konfigurabilni po tenantu kroz `organization_settings`:

| Ključ | Podrazumevano | Opis |
|---|---|---|
| `slot_hold_ttl_seconds` | 600 | Maksimalno trajanje SlotHold-a |
| `pending_request_visibility` | `remove_slot` | BDS-007B: da li pending zahtev uklanja slot (`remove_slot`) ili ga ostavlja (`keep_slot`) |
| `request_review_target_hours` | 12 | Ciljni rok za pregled zahteva u radnim satima |
| `request_auto_expire_hours` | 72 | Automatski expiry nepotvrđenog zahteva (3 radna dana ≈ 72 sata) |
| `cancellation_notice_hours` | 24 | Minimalni rok za otkazivanje bez posledica |
| `iana_timezone` | `Europe/Belgrade` | Vremenska zona organizacije |
| `business_hours_start` | `08:00` | Početak radnog vremena u zoni organizacije |
| `business_hours_end` | `20:00` | Kraj radnog vremena u zoni organizacije |

Nijedan rok nije hardkodovan u kodu; svi se čitaju iz baze.

### 2.7 v2 — Availability Modes and Slot Derivation

#### 2.7.1 Tri moda

```text
AvailabilityMode =
    HOURLY_GRID       # start_step_minutes = 60
    FLEXIBLE_GRID     # start_step_minutes = 15 / 30 / 60
    MANUAL_SLOTS      # nema automatske mreže; terapeut eksplicitno nudi početke
```

- `hourly_grid` — radno vreme 08:00–20:00 daje kandidate 08, 09, 10, …, 19.
- `flexible_grid` — ista granica radnog vremena, finija mreža početaka (15/30/60).
- `manual_slots` — nema automatske mreže. Terapeut eksplicitno ponudi npr. `PON: 08 09 10 14`, `UTO: 11 12 13 14`. Occupancy engine je potpuno isti kao za ostale modove.

#### 2.7.2 Granica odgovornosti (bez dupliranja source-of-truth-a)

| Entitet | Odgovornost | Polja |
|---|---|---|
| `availability_profiles` | **KAKO** terapeut nudi vreme | `mode`, `timezone`, `start_step_minutes` (nullable — nije potreban za `manual_slots`), `enabled` |
| `availability_rules` | **KADA** terapeut radi | `profile_id`, `weekday`, `start_local_time`, `end_local_time`, `valid_from`, `valid_until`, `format`, `location_id` |
| `service_booking_configs` | **KOLIKO** konkretna ponuda zauzima | `duration_minutes`, `buffer_before_minutes`, `buffer_after_minutes`, `availability_profile_id`, `booking_mode` |

**Zabranjeno:** duplirati `duration`/`buffer`/`start_step` između `availability_rules` i `service_booking_configs`. Postoji tačno jedan izvor za svaku vrednost.

`start_step_minutes` ima tačno jedno mesto — `availability_profiles`. Primer: Anjin profil `hourly_grid / step=60`; usluge `duration 60 / 90 / 75` — svi počeci 08/09/10/…, ali zauzimaju različitu količinu vremena. Ako ista osoba kasnije treba drugačiju mrežu po usluzi, pravi se drugi `availability_profiles` red i različiti `service_booking_configs` referenciraju odgovarajući profil — bez override sistema pre nego što postoji stvaran slučaj.

#### 2.7.3 Local wall-clock recurring vreme

Recurring radno vreme se **čuva kao lokalno pravilo**, ne UTC:

```text
day_of_week = Monday
start_local_time = 08:00
end_local_time = 16:00
timezone = Europe/Belgrade
```

Tek pri generisanju konkretnog datuma:

```text
2026-08-10 08:00 Europe/Belgrade
↓
UTC timestamp
```

Drugačije, fiksno `07:00 UTC` davalo bi različito lokalno radno vreme u zavisnosti od letnjeg/zimskog offseta. **Appointment, SlotHold, exception interval i konkretan DerivedSlot ostaju UTC timestamp-i.**


#### 2.7.4 Exceptions — `unavailable` / `extra_available` sa scope-om

```text
availability_exceptions:
    organization_id
    therapist_profile_id
    availability_profile_id   nullable
    kind: unavailable | extra_available
    starts_at
    ends_at
    format        nullable
    location_id   nullable
    reason_code   nullable
```

- `availability_profile_id = NULL` + `kind = unavailable` → terapeut je **potpuno** nedostupan (npr. „11:00–13:00 lekar" blokira online, uživo i sve profile).
- sa `availability_profile_id` → izuzetak je vezan samo za taj raspored (npr. „profil uživo Niš 18:00–20:00 unavailable", online ostaje).

`extra_available` i manual mode se **ne mešaju**:

- `hourly_grid` / `flexible_grid`: `extra_available` je **interval** (18:00–20:00) → strategy generiše početke po svom step-u (18:00, 19:00 ili 18:15, 18:30, …) uz proveru trajanja.
- `manual_slots`: dodatni termini isključivo kroz `manual_availability_slots` (18:00, 19:00 eksplicitno), nikad kroz intervalni `extra_available` — manual mode po definiciji ne zna koje početke terapeut želi.

#### 2.7.5 Manual slots

```text
manual_availability_slots:
    organization_id
    availability_profile_id
    starts_at
    format
    location_id
    source: manual | weekly_generator | copied_week
```

`source` služi za audit i UX, ne menja booking semantiku.

#### 2.7.6 Precedence — matematički, ne lanac

```text
POSITIVE AVAILABILITY = recurring generated candidates
                        ∪ extra availability
                        ∪ manual availability

BLOCKERS = unavailable intervals
           ∪ occupying appointments
           ∪ active SlotHolds
           ∪ pending requests (kada policy uklanja slot)
           ∪ external free/busy

AVAILABLE = POSITIVE AVAILABILITY − BLOCKERS
```

Regular 08–20 + extra 12:00 + unavailable 11–13 → 12:00 je u positive i u blocked → **nije available**. Ne postoji pitanje „koji korak pobeđuje".

#### 2.7.7 DB invariant — sužen scope nepreklapanja

Nepreklapanje recurring pravila vezano je za **`organization + availability_profile + weekday + effective validity period`**, ne globalno za terapeuta. Terapeut može legitimno imati online profil 08–16 i in-person profil 08–16 (dva profila). Isto važi za format/location ako se nalaze unutar profila.

#### 2.7.8 Google Calendar seam

- Interni Availability/Booking = **source of truth**.
- Google = opcioni **external busy source** (free/busy blokovi u BLOCKERS) i kasnije mirror potvrđenog Appointment-a.
- BDS-012 razdvojen: `APPROVED` arhitektonska granica (gore) + `DEFERRED` integracioni detalji (OAuth, izbor kalendara, cache, outage policy, webhook/polling, mirror, Meet link).

#### 2.7.9 Confirmation policy — dokumentovano sada, implementirano kasnije

```text
type ConfirmationPolicy = "manual_review" | "auto_confirm"
Default: manual_review
```

- **Nije deo ovog ADR-a za implementaciju** — beleži se ovde kao dokumentovana buduća odluka uz `service_booking_configs` (per-ponuda, ne globalno).
- `manual_review` (default): slobodan slot → zahtev → terapeut potvrđuje → Appointment. To je jedini tok koji se implementira u ovom talasu.
- `auto_confirm` (kasniji, Commit 14 posle stabilnog manual request-first toka): slobodan slot → korisnik izabere → DB concurrency check → Appointment odmah `confirmed`. Menja transakciju, SlotHold ponašanje, AppointmentRequest lifecycle, emailove, diagnostics, audit i concurrency testove — zato se uvodi tek posle Commit-a 13.
- Auto-confirmovani Appointment je **isti** Appointment kao ručno potvrđen; audit `confirmation_source: manual | automatic` ili event `appointment.confirmed` (actor=system, reason=auto_confirmation_policy). Nema `AutoAppointment`/`ManualAppointment`.
- Exclusion constraint (`appointments_no_therapist_overlap`) ostaje poslednji autoritet: A → confirmed, B → 409 BOOKING_SLOT_CONFLICT.

#### 2.7.10 Attendance model — dokumentovano sada, implementirano kasnije

```text
AppointmentStatus  = confirmed | completed | cancelled
AttendanceStatus   = unknown | attended | client_no_show | therapist_no_show
```

- Posle isteka termina: `confirmed` → termin prošao → `attendance = unknown`.
- UI: „⚠ Evidencija dolaska nije završena → [Došao/la] [Nije došao/la]"; posle 24h operativno stanje „Potrebna evidencija". **Bez automatske pretpostavke `attended`.**
- Opcioni reminder: 2h posle završetka (nije uneta evidencija), 24h (overdue).
- Diagnostic kasnije: `booking.attendance_not_recorded` (termin završen pre >24h, attendance=unknown).
- Finansijske posledice no_show pripadaju R5; Booking samo beleži činjenicu.


## 3. Posledice

- Bez ovog ADR-a `slot_request` BookingMode ne može da se uključi ni za jednu ponudu — nema kandidat-slotova.
- `derive_slots` je čista funkcija domain sloja; ne zavisi od FastAPI-ja, SQLAlchemy-ja ni Redis-a.
- Calendar adapter (BDS-012), kada bude odobren, postaje opcioni izvor `free/busy` blokova u koraku 3e algoritma.
- Buffer i trajanje se čuvaju uz `service_booking_configs`, ne uz `services` — ista usluga može imati različito trajanje kod različitih terapeuta.
- `SlotHold` expiry se oslanja i na PostgreSQL `expires_at` i na Redis TTL; Redis TTL je brži za cleanup, PostgreSQL je durable izvor istine.

### 3.1 v2 dodatne posledice

- Jedan `derive_slots` sa tri strategije (`HourlyGridStrategy | FlexibleGridStrategy | ManualSlotsStrategy`); svaka vraća isti `CandidateStart`, a zajednički occupancy resolver (candidate + `duration_minutes` + bufferi → interval → BLOCKERS provera) vraća `DerivedSlot`. Ostatak Booking Engine-a ne zna iz kog sistema slot potiče.
- `duration_minutes ≠ start_step_minutes` je zaključan: npr. `duration=90, start_step=60` daje kandidate 08/09/10/…, svaki zauzima 08:00–09:30. `duration=75, start_step=15` → 14:00–15:15, sledeći 15:15.
- Recurring pravila se čuvaju kao lokalno wall-clock vreme + IANA timezone; migracija podataka na v1 UTC `time` semantiku **ne sme** da počne — v2 se primenjuje pre prve Availability migracije.
- `availability_rules.service_ids` se ne kreira; `availability_profiles` + `service_booking_configs.availability_profile_id` je jedina veza.

## 4. Supersedes / updates

- PRE-R2 BDS-002 — zatvara OPEN: trajanja, bufferi, radno vreme i horizont su sada definisani kao konfigurabilne vrednosti.
- PRE-R2 BDS-003 — slot lifecycle je formalizovan kroz `derive_slots` algoritam.
- PRE-R2 BDS-007A — `SlotHold` TTL, concurrency, idempotency i expiry su formalizovani.
- **v1 §2.1–§2.3 (slot generation, exceptions, recurring UTC vreme)** — superseded od v2 §0/§2.7.
- **v1 `availability_rules.service_ids`** — uklonjeno u v2; veza ide kroz `availability_profiles`.
- **BDS-012** — podeljen: `APPROVED` arhitektonska granica (source of truth + free/busy only) + `DEFERRED` integracioni detalji.
- **BDS-011 / matrica ponuda / poslovni SLA kalendar** — ne blokiraju izgradnju Availability jezgra; blokiraju samo produkciono uključivanje javnog slanja zahteva.
