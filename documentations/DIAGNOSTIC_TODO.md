# DIAGNOSTIC TODO — Diagnostic Engine foundation + Booking collectors

**Status:** planirano, implementacija zakazana 2026-08-08 (Commit 4)
**Datum:** 2026-08-07
**Vlasnik:** Milan Dražić (CTO)
**Ugovor:** `DIAGNOSTIC_ENGINE_FOUNDATION_v1_0.md` — ovaj fajl razbija taj ugovor na konkretne fajlove/funkcije/test slučajeve, isti obrazac kao `CMS_TODO.md` prema `CMS_CORE_CONTENT_GOVERNANCE_PLAN_v0.1.md` i `KOMPAS_TODO.md` prema Kompas D-053/ADR-022.
**Granica:** ne dirati Content/RBAC/Consent/media dijagnostiku, run-istoriju, cron, notifikacije ili repair akcije — vidi Foundation §0 „Namerno ostaje van scope-a".

Red se prebacuje na ✅ u `TODO.md` R2.3c tek kad su svi pod-zadaci ovde ✅.

---

## 0. Preduslov koji ne postoji još

- [x] **D0 — `require_superadmin` FastAPI zavisnost.** `internal_users.is_superadmin` kolona postoji (migracija `20260730_0006`), ali nijedna backend ruta je danas ne čita — `api/dependencies.py` nema ekvivalent frontend `requireSuperadminApi()` konvencije. Bez ovoga, test „običan admin ne može pokrenuti globalni diagnostic" (D-Common-9 niže) nema šta da proveri. Ovo je preduslov za D-API sekciju, ne opciono poliranje. **✅ Implementirano 2026-08-07 u `api/dependencies.py:require_superadmin`.**

---

## 1. Kontrakti — `modules/diagnostics/contracts.py`

- [x] D1.1 `DiagnosticStatus(StrEnum)`: `OK | INFO | WARNING | ERROR | FAILED`
- [x] D1.2 `DiagnosticResult(BaseModel)`: `key, status, affected_count, summary, sample_rows: list[dict[str, object]], suggestion: str | None, duration_ms: int, checked_at: datetime`
- [x] D1.3 `DiagnosticContext` (`@dataclass(frozen=True)`): `session: AsyncSession, organization_id: UUID | None, mode: DiagnosticMode, sample_limit: int, checked_at: datetime`
- [x] D1.4 `DiagnosticMode(StrEnum)`: `COMPACT | FULL`
- [x] D1.5 `DiagnosticDefinition`: `key, label, description, collector: Callable[[DiagnosticContext], Awaitable[DiagnosticResult]], category: str, supported_modes, max_sample_rows: int, tenant_aware: bool`

---

## 2. Registry — `modules/diagnostics/registry.py`

- [x] D2.1 `DIAGNOSTIC_REGISTRY: dict[str, DiagnosticDefinition]` — eksplicitan literal, **bez** dinamičkog skeniranja/plugin importa.
- [x] D2.2 Četiri Booking unosa (§4).
- [x] D2.3 Helper `get_definition(key: str) -> DiagnosticDefinition` koji baca tipiziranu grešku (ne `KeyError` direktno do API sloja) za nepoznat ključ.

---

## 3. Runner — `modules/diagnostics/runner.py`

- [x] D3.1 `run_one(key, context) -> DiagnosticResult` — nađe definiciju, pozove collector, izmeri `duration_ms`, uhvati **svaki** izuzetak → `DiagnosticStatus.FAILED` sa bezbednom porukom (bez stack trace-a u odgovoru; pun trace ide u structured log, `ARCHITECTURAL_RULES` §19).
- [x] D3.2 `run_many(keys | category, context) -> list[DiagnosticResult]` — jedan `failed` collector ne prekida ostale.
- [x] D3.3 Ograniči `sample_rows` na `min(zahtevani_limit, definition.max_sample_rows)`; `affected_count` uvek iz `COUNT(*)`, nikad `len(sample)`.
- [x] D3.4 `organization_id=None` dozvoljen samo kad poziva superadmin (provera se dešava u `router.py`, ne u runneru — runner je čist, autorizacija je adapter odgovornost po §14.1 layering pravilu).

---

## 4. Booking collectori — `modules/diagnostics/collectors/booking.py`

### 4.1 `booking.appointment_overlaps` (`error`)

- [ ] Ista semantika kao `appointments_no_therapist_overlap` (0009 migracija): ista `organization_id` + `therapist_profile_id`, status `IN ('confirmed','completed','no_show')`, `tstzrange(start_time, end_time, '[)')  &&`.
- [ ] `sample_rows` oblik: `organizationId, therapistId, appointmentId, conflictingAppointmentId, startsAt, endsAt` — bez imena/emaila/napomene klijenta.

### 4.2 `booking.duplicate_config_scope` (`error`)

- [ ] Grupisanje po `organization_id, service_id, therapist_profile_id, format, location_id` — NULL `location_id` tretiran kao ista vrednost (`GROUP BY` prirodno spaja NULL-ove, ista logika kao 0008 preflight upit).

### 4.3 `booking.request_appointment_mismatch` (pretežno `error`)

- [ ] `converted` zahtev bez odgovarajućeg `Appointment.appointment_request_id`.
- [ ] `Appointment.appointment_request_id` pokazuje na zahtev čiji status nije `converted`.
- [ ] Jedan zahtev povezan sa više od jednog `Appointment` reda.
- [ ] `AlternativeProposal.status == accepted` bez odgovarajućeg `Appointment`.
- [ ] Više od jedne `accepted` alternative za isti zahtev.

### 4.4 `booking.stuck_slot_holds` (`warning` ili `error`)

- [ ] Istekao hold i dalje formalno aktivan, bez posledice po dostupnost → `warning`.
- [ ] Istekao hold koji i dalje blokira `get_available_slots` → `error`.
- [ ] Više aktivnih holdova za isti slot kad model to ne dozvoljava.
- [ ] Hold vezan za nepostojeći ili terminalni (`declined`/`withdrawn`/`expired`) zahtev.

### 4.5 Ne raditi sada

- [ ] `booking.invalid_status_transitions` — eksplicitno odloženo dok audit/outbox ne beleži `previous_status`/`new_status`/`actor`/`occurred_at`. Ne otvarati kao prazan stub.

---

## 5. Read-only pravilo

- [ ] Test po collectoru: DB snapshot (relevantne tabele) pre/posle poziva mora biti identičan.
- [ ] Nijedan collector ne sme pozvati `session.add/delete/execute(update/delete)` niti spoljni provider klijent.
- [ ] Posebna read-only Postgres uloga — **ne raditi sada** (infrastruktura ne postoji, Foundation §5 eksplicitno ne blokira commit zbog ovoga).

---

## 6. API — `modules/diagnostics/router.py` + `schemas.py`

- [x] D6.1 `GET /api/v1/superadmin/diagnostics` — lista registrovanih definicija (key/label/description/category), bez izvršavanja.
- [x] D6.2 `POST /api/v1/superadmin/diagnostics/run` — telo `{ category, mode, organizationId }`, agregatni odgovor `{ results, summary: {ok,warning,error,failed}, checkedAt }`.
- [x] D6.3 `POST /api/v1/superadmin/diagnostics/{key}/run` — pojedinačno izvršavanje, isti odgovorni oblik sa jednim rezultatom.
- [x] D6.4 Sve tri rute iza `require_superadmin` (§0/D0).
- [x] D6.5 `organizationId: null` u telu dozvoljen samo superadminu — obican staff/admin mora poslati konkretan ID (vraća 403/422 bez njega, ne tihi globalni scope).
- [x] D6.6 Nema tabele za run-istoriju — rezultat je izračunat na zahtev.

**Compact/full limiti:** `compact` → 0–1 sample red; `full` → do 20 sample redova; `affectedCount` uvek ukupan broj nezavisno od režima.

---

## 7. Testovi

### 7.1 Foundation (`tests/unit/test_diagnostics_runner.py` ili integration, zavisi da li dotiče DB)

- [ ] D-Common-1 svi registry ključevi jedinstveni
- [ ] D-Common-2 nepoznat ključ → kontrolisana greška, ne 500
- [ ] D-Common-3 izuzetak u collectoru → `FAILED`, run ne puca
- [ ] D-Common-4 jedan `failed` ne prekida `run_many`
- [ ] D-Common-5 `sample_rows` ograničen na `max_sample_rows`/traženi limit
- [ ] D-Common-6 `affected_count` ostaje ukupan broj i kad je sample odsečen
- [ ] D-Common-7 `duration_ms` i `checked_at` popunjeni na svakom rezultatu
- [ ] D-Common-8 tenant-aware collector poštuje prosleđeni `organization_id`
- [ ] D-Common-9 običan admin (bez `is_superadmin`) ne može pokrenuti globalni (`organization_id=None`) diagnostic
- [ ] D-Common-10 collector ne menja podatke (DB snapshot pre/posle)

### 7.2 Booking collectori (`tests/integration/test_diagnostics_booking.py`)

Za svaki od četiri collectora:

- [ ] zdravo stanje → `ok`
- [ ] neispravno stanje → očekivani status (`error`/`warning`)
- [ ] `affected_count` tačan
- [ ] `sample_rows` ne sadrži klijentske podatke (ime/email/telefon/napomenu)
- [ ] drugi tenant nije uključen u tenant-scoped rezultat
- [ ] globalni superadmin rezultat sabira sve tenante

Dodatno, po collectoru:

- [ ] `appointment_overlaps`: `[)` semantika — susedni termini nisu overlap; otkazan termin ne ulazi u overlap
- [ ] `duplicate_config_scope`: NULL `location_id` duplikati se pronalaze
- [ ] `request_appointment_mismatch`: `accepted`/`converted` zahtev bez `Appointment`-a se pronalazi
- [ ] `stuck_slot_holds`: istekao hold se pronalazi

Svi testovi nad pravim PostgreSQL-om (isti `db_session` fixture obrazac kao `test_booking_service.py`), bez mock baze.

---

## 8. Redosled rada (zadržan, ne raditi Diagnostics pre prva tri koraka)

1. ✅ Popravka nullable booking config uniqueness (Commit 1, 2026-08-07).
2. ✅ Appointment exclusion constraint (Commit 2, 2026-08-07).
3. ✅ Pravi concurrency testovi (Commit 3, 2026-08-07).
4. ⬜ Diagnostic foundation + Booking collectori (Commit 4, planiran 2026-08-08 — ovaj fajl).

## 9. Predloženi interni commit raspored

```
feat(diagnostics): add result contract, registry and runner
feat(diagnostics): add booking integrity collectors
test(diagnostics): cover failures, tenant isolation and booking findings
```

Posle review-a: ili ostaju tri pregledna commita, ili se squash-uju u `feat(diagnostics): add foundation and booking integrity collectors`.

---

## 10. Definition of Done

- [ ] Postoji generički `DiagnosticResult` kontrakt (§1).
- [ ] Postoji eksplicitni registry, bez magije (§2).
- [ ] Runner podržava pojedinačno i grupno izvršavanje, izolovan od pojedinačnog pada (§3).
- [ ] Tehnička greška daje `failed`, nikad tiho `ok`.
- [ ] Svi collectori su read-only, dokazano testom (§5).
- [ ] Postoje sva četiri Booking collectora (§4.1–§4.4); `invalid_status_transitions` namerno izostavljen (§4.5).
- [ ] Tenant izolacija testirana za svaki collector.
- [ ] `sample_rows` ne sadrži PII ni za jedan collector.
- [ ] `require_superadmin` postoji i pokriva sve tri rute (§0, §6.4).
- [ ] Postojeći `/superadmin/diagnostics` frontend ekran može da pozove stvarne rezultate umesto mock spinnera (frontend povezivanje samo, ne redizajn ekrana — van scope-a ako zahteva UI izmene van postojećeg dugmeta).
- [ ] Pun backend gate zelen: `ruff format --check` · `ruff check` · `pyright` · `pytest` · `alembic upgrade head` · `alembic check`.
- [ ] `TODO.md` R2.3c i `DIAGNOSTIC_ENGINE_FOUNDATION_v1_0.md` status ažurirani stvarnim stanjem (ne planiranim).
