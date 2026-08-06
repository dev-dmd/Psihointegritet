# ADR-015 — Availability Service Contract

**Status:** Accepted
**Datum:** 2026-08-06
**Vlasnik tehničke odluke:** Milan Dražić (CTO)
**Povezano:** ADR-013 · PRE_R2_BOOKING_ENGINE_DECISION_SPEC_v0.2.md §6 (BDS-002) · PRE_R2 §7 (BDS-003, BDS-007A)

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

## 3. Posledice

- Bez ovog ADR-a `slot_request` BookingMode ne može da se uključi ni za jednu ponudu — nema kandidat-slotova.
- `derive_slots` je čista funkcija domain sloja; ne zavisi od FastAPI-ja, SQLAlchemy-ja ni Redis-a.
- Calendar adapter (BDS-012), kada bude odobren, postaje opcioni izvor `free/busy` blokova u koraku 3e algoritma.
- Buffer i trajanje se čuvaju uz `availability_rules`, ne uz `services` — ista usluga može imati različito trajanje kod različitih terapeuta.
- `SlotHold` expiry se oslanja i na PostgreSQL `expires_at` i na Redis TTL; Redis TTL je brži za cleanup, PostgreSQL je durable izvor istine.

## 4. Supersedes / updates

- PRE-R2 BDS-002 — zatvara OPEN: trajanja, bufferi, radno vreme i horizont su sada definisani kao konfigurabilne vrednosti.
- PRE-R2 BDS-003 — slot lifecycle je formalizovan kroz `derive_slots` algoritam.
- PRE-R2 BDS-007A — `SlotHold` TTL, concurrency, idempotency i expiry su formalizovani.
