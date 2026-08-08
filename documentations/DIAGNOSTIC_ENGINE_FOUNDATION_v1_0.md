# Diagnostic Engine — Foundation v1.0

**Verzija:** 1.0 · **Datum:** 2026-08-07 · **Vlasnik:** Milan Dražić (CTO)
**Status:** ✅ implementirano i zatvoreno 2026-08-08 (Commit 4 — kernel + Booking collectori + frontend connection; detalji u `DIAGNOSTIC_TODO.md`)
**Svrha:** zaključati minimalni, generički Diagnostic Engine kernel i njegov prvi stvarni collector paket (Booking), pre nego što se piše ijedan red koda.

---

## 0. Granica ovog dokumenta

Ovaj dokument **nije** pun Diagnostic Engine iz `PSIHOINTEGRITET_PRODUCT_ENGINES_ARCHITECTURE_v1_0.md` §18 (Identity, Booking, Notify Me, Notification, Consent, Content, AI Content, ThemeLayout, Benefits, Programs, Resource, Payment, Feature/Plan — §18.3 tabela). Taj dokument je vodič za R6 „Business OS: analitika, dijagnostika, marketing" (§3 tabela u `TODO.md`), ne propis za sada.

**Sada gradimo:**

1. Generički kernel — kontrakt, registry, runner, read-only pravilo, compact/full režim.
2. **Booking** kao prvi i jedini stvarni collector paket (četiri provere).
3. Minimalni superadmin API nad postojećim `/superadmin/diagnostics` ekranom (trenutno demonstracioni spinner — `SUPERADMIN_CONTROL_CENTER_PLAN_v1_0.md` §7.5: „Automatske popravke — kasnije").

**Namerno ostaje van scope-a** (ne graditi prazne apstrakcije za faze koje još ne postoje — `CLAUDE_CODE_MASTER_PLAN_v1_0.md` princip protiv preranih apstrakcija):

- Content, RBAC, Consent, integracije, media dijagnostika — dolaze sa sopstvenim modulima kada ti moduli dobiju svoj Integrity Gate, po istom obrascu kao Booking.
- Istorija izvršavanja / perzistovani run rezultati (nema tabele u ovom commitu — rezultat se računa na zahtev).
- Periodično automatsko pokretanje (cron/scheduler).
- Notifikacije administratoru na nalaz.
- Automatske repair akcije (Product Engines §18.4 predviđa poseban repair workflow — dry-run, potvrda, audit — ali to je zaseban, kasniji application workflow, ne deo ovog gate-a).
- Napredni dashboard/grafikoni — postojeći `/superadmin/diagnostics` ekran samo dobija stvarne podatke umesto mock spinnera.
- `booking.invalid_status_transitions` — vidi §6.5, čeka audit/outbox istoriju tranzicija.

---

## 1. Zašto sada, i zašto baš uz Booking

**Pravilo je već zaključano**, ne izmišljeno za ovu priliku:

- `ARCHITECTURAL_RULES_NEXTJS_REACT_QUERY_v1.1.md` §21 (Diagnostics rule): *„Every risky workflow that touches several models or reassigns ownership must ship with a read-only integrity diagnostic in the same PR."*
- `PSIHOINTEGRITET_PRODUCT_ENGINES_ARCHITECTURE_v1_0.md` §18.3 već navodi Booking kategoriju (overlap, expired hold, invalid participant, status/event mismatch, calendar drift) kao jedan od prvih redova buduće registry tabele.
- `CLAUDE_CODE_MASTER_PLAN_v1_0.md` §6.2 **M2.7 — Diagnostics baseline + pilot** eksplicitno navodi početni set: preklapajući aktivni termini, istekao hold koji i dalje blokira, potvrđen termin bez event-a, alternativa bez isteka, mismatch učesnik/tenant, zaglavljeni notification job-ovi.
- `SUPERADMIN_CONTROL_CENTER_PLAN_v1_0.md` §7.5 postojeći `/superadmin/diagnostics` ekran već ima „Pokreni proveru" dugme — trenutno je to čist demo (spinner, nema pravog backend poziva). Ovaj commit ga prvi put povezuje sa stvarnim podacima.

**Booking je kandidat broj jedan** jer je upravo prošao Booking Integrity Gate (2026-08-07, tri commita: NULLS NOT DISTINCT constraint, `appointments_no_therapist_overlap` exclusion constraint, pravi concurrency testovi — vidi `TODO.md` R2.3b) i u jednom zahtevu menja `SlotHold`, `AppointmentRequest`, `AlternativeProposal`, `Appointment`, `ServiceBookingConfig` i audit/reviewer stanje. Po §21 pravilu, ovakav workflow **mora** dobiti read-only integrity proveru u istom talasu rada — DB constraint sprečava *nove* konflikte, ali ne dokazuje da stari podaci (pre migracije, ili nastali dok je constraint bio isključen tokom staging migracije) ne postoje već u bazi.

**Diagnostic ne zamenjuje DB constraint.** Redosled autoriteta:

1. DB constraint (`appointments_no_therapist_overlap`, `uq_booking_config_offer` NULLS NOT DISTINCT) — sprečava da se problem *ponovo* dogodi.
2. Diagnostic collector — dokazuje da problem *već ne postoji*, i to na zahtev, ponovljivo, bez pisanja u bazu.

---

## 2. Kontrakt

```python
class DiagnosticStatus(StrEnum):
    OK = "ok"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    FAILED = "failed"


class DiagnosticResult(BaseModel):
    key: str
    status: DiagnosticStatus
    affected_count: int
    summary: str
    sample_rows: list[dict[str, object]]
    suggestion: str | None
    duration_ms: int
    checked_at: datetime
```

**Ključna semantička razlika, mora biti testirana eksplicitno:**

| Status    | Značenje                                                                 |
| --------- | ------------------------------------------------------------------------ |
| `ok`      | Collector je uspešno izvršen, nula nalaza.                              |
| `info`    | Collector je uspešno izvršen, nalaz postoji ali nije problem sam po sebi. |
| `warning` | Collector je uspešno izvršen, nalaz je problem bez trenutne posledice.   |
| `error`   | Collector je uspešno izvršen **i pronašao problem**.                    |
| `failed`  | Collector **tehnički nije mogao da završi** proveru (izuzetak, timeout). |

`failed` nikad ne sme biti predstavljen kao `ok` sa nula nalaza — to bi sakrilo da provera uopšte nije izvršena. Runner (§4) ovo garantuje hvatanjem izuzetka na nivou jednog collectora, ne na nivou celog run-a.

`affected_count` je **ukupan** broj nalaza, čak i kada je `sample_rows` odsečen na limit (§7). `sample_rows` nikad ne sadrži klijentske podatke (ime, email, telefon, napomenu) — samo ID-jeve i vremenske/statusne vrednosti dovoljne da administrator otvori konkretan red.

---

## 3. Registry — eksplicitna registracija, bez magije

Jedno mesto registruje sve dostupne provere. Bez dinamičkog skeniranja modula, bez `importlib`/plugin magije — eksplicitan `dict` je čitljiviji i sigurniji za sistem koji tek dobija svoj prvi collector paket.

```python
DIAGNOSTIC_REGISTRY: dict[str, DiagnosticDefinition] = {
    "booking.appointment_overlaps": DiagnosticDefinition(...),
    "booking.duplicate_config_scope": DiagnosticDefinition(...),
    "booking.request_appointment_mismatch": DiagnosticDefinition(...),
    "booking.stuck_slot_holds": DiagnosticDefinition(...),
}
```

Svaka `DiagnosticDefinition` nosi: stabilni `key` (koristi se u URL-u i u budućoj istoriji izvršavanja — nikad se ne menja, samo dodaje), `label`, `description`, collector funkciju (`Callable[[DiagnosticContext], Awaitable[DiagnosticResult]]`), `category` (za sada samo `"booking"`), severity politiku (šta collector *smatra* problemom — mapirano na `error`/`warning` unutar samog collectora, registry samo dokumentuje očekivanje), podržane režime (`compact`/`full`), `max_sample_rows` gornju granicu i `tenant_aware: bool`.

Ključevi su namerno hijerarhijski (`domen.provera`) — sledeći paket (kad god dođe na red po §0) dodaje `content.*`, `identity.*` itd. u isti dict, bez menjanja postojećih ključeva.

---

## 4. Runner

```python
@dataclass(frozen=True)
class DiagnosticContext:
    session: AsyncSession
    organization_id: UUID | None
    mode: DiagnosticMode
    sample_limit: int
    checked_at: datetime
```

`organization_id=None` je dozvoljeno **samo** za superadmin globalno izvršavanje (svi tenanti odjednom) — obična staff/admin autorizacija mora uvek nositi konkretan `organization_id`. Ovo je jedna od obaveznih test-linija u §8.

Runner odgovornosti:

1. Nađe collector u `DIAGNOSTIC_REGISTRY` po `key`; nepoznat ključ → kontrolisana greška (404 na API nivou), ne izuzetak koji ruši proces.
2. Sastavi `DiagnosticContext` (read-only sesija, tenant scope, režim, sample limit, `checked_at = now()`).
3. Izmeri trajanje oko poziva collectora (`duration_ms`).
4. Uhvati **svaki** izuzetak iz collectora i pretvori ga u `DiagnosticResult(status=FAILED, ...)` sa porukom bezbednom za prikaz (bez stack trace-a klijentu; stack trace ide u structured log po `ARCHITECTURAL_RULES` §19).
5. Kod grupnog izvršavanja (`run_all` / po kategoriji): jedan `failed` collector **ne sme** prekinuti ostale — runner nastavlja i vraća kompletnu listu, uključujući `failed` red.
6. Ograniči `sample_rows` na `min(zahtevani_limit, definition.max_sample_rows)`, ali `affected_count` ostaje pravi broj iz upita (`COUNT(*)`, ne `len(sample)`).

---

## 5. Read-only pravilo

Collector **ne sme**:

- menjati status bilo kog reda (appointment, request, hold, config);
- brisati duplikat ili zatvarati hold;
- kreirati `Appointment`;
- pozivati spoljne provider servise (Resend, Redis, Clerk, budući Google Calendar).

Za ovaj commit dovoljna je **aplikativna** zabrana i test koji dokazuje da collector ne menja stanje (pokreni collector, uporedi DB snapshot pre/posle — mora biti identičan). Posebna read-only DB uloga (zaseban Postgres role sa samo `SELECT` grantovima) je infrastrukturni sloj koji može doći kasnije, bez zaustavljanja ovog gate-a — nema ga danas u infrastrukturi, pa ga ne izmišljamo za ovaj commit.

---

## 6. Booking collectori (prvi stvarni paket)

### 6.1 `booking.appointment_overlaps` — `error`

Prati **potpuno istu semantiku** kao `appointments_no_therapist_overlap` (0009 migracija): ista organizacija, isti `therapist_profile_id`, status u `('confirmed', 'completed', 'no_show')`, preklapajući `[start_time, end_time)` intervali (`tstzrange(..., '[)')`  `&&`).

Sample red (bez podataka klijenta):

```json
{
  "organizationId": "...",
  "therapistId": "...",
  "appointmentId": "...",
  "conflictingAppointmentId": "...",
  "startsAt": "...",
  "endsAt": "..."
}
```

Ovaj collector **ne zamenjuje** DB constraint — pronalazi ono što constraint ne vidi: stare podatke, podatke nastale pre migracije, prolazno stanje tokom staging migracije, ili regresiju ako neko ubuduće greškom ukloni constraint.

### 6.2 `booking.duplicate_config_scope` — `error`

Duplikati po normalizovanom ključu `organization_id + service_id + therapist_profile_id + format + location_id`, gde se **dva NULL `location_id` tretiraju kao ista vrednost** — ista logika koja je već primenjena u preflight upitu 0008 migracije (`GROUP BY` prirodno spaja NULL-ove).

Posebno važno **pre** primene `UNIQUE NULLS NOT DISTINCT` na bilo kojoj drugoj tabeli u budućnosti — ako preflight ili ovaj collector nađe postojeće duplikate, migracija se prekida umesto da tiho izabere jedan red.

### 6.3 `booking.request_appointment_mismatch` — pretežno `error`

Najvažnija provera transakcione konzistentnosti celog Booking toka. Prva verzija pronalazi najmanje:

- zahtev je `converted`, ali nema `Appointment` sa `appointment_request_id` koji na njega pokazuje;
- `Appointment.appointment_request_id` pokazuje na zahtev čiji status nije `converted`;
- jedan zahtev povezan sa više od jednog `Appointment` reda;
- `AlternativeProposal` sa statusom `accepted` bez odgovarajućeg `Appointment`;
- više od jedne `AlternativeProposal` istog zahteva označeno kao `accepted`.

### 6.4 `booking.stuck_slot_holds` — `warning` ili `error`

- istekao (`expires_at < now()`) hold koji je i dalje formalno „aktivan" u modelu, ali bez posledice po dostupnost → `warning`;
- istekao hold koji **i dalje utiče** na `get_available_slots` izračun (blokira slot koji bi trebalo da bude slobodan) → `error`;
- više aktivnih holdova za isti slot kada trenutni model to ne dozvoljava;
- hold vezan za nepostojeći ili terminalni (`declined`/`withdrawn`/`expired`) zahtev.

### 6.5 Zašto NE `booking.invalid_status_transitions` (još)

Bez pouzdane istorije tranzicija (audit/outbox događaji sa `previous_status`, `new_status`, `actor`, `occurred_at`), collector ne može **dokazati** da se dogodila nedozvoljena tranzicija — može proveriti samo trenutno stanje, što `booking.request_appointment_mismatch` (§6.3) već radi. Kad audit/outbox počne da beleži tranzicije (van scope-a ovog commita), dodaje se `booking.invalid_status_transitions` kao peti collector, bez menjanja postojeća četiri.

---

## 7. API i režimi

```
GET  /api/v1/superadmin/diagnostics
POST /api/v1/superadmin/diagnostics/run
POST /api/v1/superadmin/diagnostics/{key}/run
```

`POST .../run` primer zahteva:

```json
{ "category": "booking", "mode": "full", "organizationId": null }
```

Odgovor:

```json
{
  "results": [],
  "summary": { "ok": 2, "warning": 1, "error": 1, "failed": 0 },
  "checkedAt": "..."
}
```

Bez tabele za istoriju izvršavanja u ovom commitu — rezultat je izračunat na zahtev, ne perzistovan.

**Autorizacija:** frontend guard (`requireSuperadmin()`, `requireSuperadminApi()` konvencija iz `SUPERADMIN_CONTROL_CENTER_PLAN_v1_0.md` §5) već postoji na frontend ruti, ali **backend ekvivalent ne postoji još** — `internal_users.is_superadmin` kolona postoji (0006 migracija), ali nijedna FastAPI zavisnost je danas ne čita. Ovaj commit mora dodati `require_superadmin` dependency (analogno `api/dependencies.py` obrascu) pre nego što se `/superadmin/diagnostics/*` rute smeju otvoriti — bez toga, „običan admin ne može pokrenuti globalni diagnostic" test (§8) nema šta da proveri.

| Režim     | Sample redova | Namena                                                      |
| --------- | :-----------: | ------------------------------------------------------------ |
| `compact` |      0–1      | Osnovni health pregled — brz odgovor, minimalan payload.     |
| `full`    |    do 20      | Otvaranje konkretnog nalaza — tehnički podaci + `suggestion`. |

`affected_count` je uvek ukupan broj, nezavisno od režima.

---

## 8. Obavezni testovi (sažetak — puna lista u `DIAGNOSTIC_TODO.md`)

**Foundation:** jedinstveni registry ključevi · nepoznat ključ → kontrolisana greška · izuzetak u collectoru → `failed` · jedan `failed` ne prekida `run_all` · `sample_rows` se ograničava dok `affected_count` ostaje ukupan · `duration_ms`/`checked_at` se popunjavaju · tenant-aware collector poštuje `organization_id` scope · običan admin (bez `is_superadmin`) ne može pokrenuti globalni (`organization_id=None`) diagnostic · collector ne menja podatke (DB snapshot pre/posle identičan).

**Booking collectori:** zdravo stanje → `ok`; neispravno stanje → očekivani status; `affected_count` tačan; `sample_rows` bez klijentskih podataka; drugi tenant nije uključen u tenant-scoped rezultat; globalni superadmin rezultat sabira sve tenante; overlap collector koristi `[)` semantiku (susedni termini nisu overlap, otkazan termin ne ulazi); NULL `location_id` duplikati se pronalaze; `accepted` zahtev bez `Appointment`-a se pronalazi; istekao hold se pronalazi.

Svi testovi rade nad pravim PostgreSQL-om (isti obrazac kao `tests/integration/test_booking_service.py` i `test_booking_concurrency.py`) — nema smisla mockovati bazu za proveru koja postoji isključivo da bi proverila stanje baze.

---

## 9. Direktorijumska struktura

Prilagođeno stvarnom rasporedu backend paketa (`backend/src/psihointegritet/...`, ne `backend/app/...` iz generičkog šablona — vidi `psihointegritet-foundation` napomenu o `CLEAN_PROJECT_ARCHITECTURE_PYTHON_POSTGRES.md` kao šablonu, ne stvarnoj strukturi):

```text
backend/src/psihointegritet/modules/diagnostics/
├── __init__.py
├── contracts.py       # DiagnosticStatus, DiagnosticResult, DiagnosticDefinition, DiagnosticContext
├── registry.py        # DIAGNOSTIC_REGISTRY
├── runner.py           # run_one / run_many, failure isolation, sample limiting
├── router.py            # GET/POST /superadmin/diagnostics* (prati postojeću modul-po-modul router konvenciju)
├── schemas.py           # API request/response DTO-ovi (odvojeno od internog DiagnosticResult po §16 pravilu)
└── collectors/
    ├── __init__.py
    └── booking.py       # sve četiri Booking provere
```

`router.py`/`schemas.py` umesto `api.py`/`service.py` iz originalnog predloga — usklađeno sa postojećom booking/compass/content modul konvencijom (`router.py` je adapter, logika je u samom runneru + collectorima, nema posebnog „service" sloja kad runner već jeste tanka orkestracija).

---

## 10. Odnos prema punom Diagnostic Engine-u (§18)

Ovaj kernel je namerno projektovan tako da sledeći collector paket (bilo koji domen iz §18.3 tabele) zahteva samo: (1) nove `DiagnosticDefinition` unose u `DIAGNOSTIC_REGISTRY`, (2) novi fajl u `collectors/`, (3) nove testove — **bez** menjanja `contracts.py`, `runner.py` ili API oblika. Kad (i ako) R6 „Business OS" faza zaista treba repair workflow, run-istoriju, notifikacije i dashboard — to su nadogradnje na postojeći kernel, ne prepravka njegovog kontrakta.
