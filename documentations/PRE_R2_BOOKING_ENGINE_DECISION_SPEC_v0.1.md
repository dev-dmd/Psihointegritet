# PRE-R2 BOOKING ENGINE DECISION SPEC v0.1

**Status:** documentation gate; implementation is not approved  
**Datum:** 2026-07-21  
**Formalni naziv:** Pre-R2 Booking Engine Decision Specification  
**Interni redosled:** R1.6; nije deo R1 production launch scope-a

## 1. Svrha i granica

Ovaj dokument zaključava poslovne, kliničke, pravne i tehničke odluke koje R2 Booking Engine mora da poštuje. Ne daje dozvolu za R2 tabele, migracije, endpoint-e, panel UI ili provider integracije pre R1 prihvatanja, SoW-a i zatvorenih obaveznih odluka.

R2 je request-first scheduling. R3 je Content Engine / CMS. R5 je finansijski domen.

## 2. Trajne invarijante

```text
User selection != confirmed appointment

Selected slot or preferred period
-> AppointmentRequest
-> Therapist review
-> Confirmed Appointment or AlternativeProposal
```

```ts
type BookingMode = "request" | "slot_request" | "disabled";
```

- `request`: korisnik predlaže period; nema slot pickera.
- `slot_request`: korisnik bira željeni slot, ali dobija samo zahtev. UI kaže da izbor nije rezervacija niti potvrda.
- `disabled`: nema booking CTA-a; može postojati zaseban interest/waitlist tok kada bude odobren.
- `live` je zabranjen naziv i zabranjen sistemski mode.

## 3. Status oznake za odluke

| Status     | Značenje                                                        |
| ---------- | --------------------------------------------------------------- |
| `OPEN`     | odluka ne postoji; kod ne sme pretpostaviti vrednost            |
| `PROPOSED` | radni predlog za review; nije schema/API ugovor                 |
| `APPROVED` | zaključano za implementaciju kada R2 krene                      |
| `BLOCKED`  | tema je van ovog release-a; samo se evidentira target milestone |

Svaka promena `APPROVED` odluke zahteva novi red u `PRODUCT_DECISIONS.md` i update ovog dokumenta.

## 4. Decision register

| ID       | Tema                                              | Status   | Owner                          | Odluka / sledeći korak                                                                                                  |
| -------- | ------------------------------------------------- | -------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| BDS-001  | request-first invariant                           | APPROVED | Product/Technical              | korisnički izbor nikada sam ne potvrđuje termin                                                                         |
| BDS-002  | `BookingMode`                                     | APPROVED | Product/Technical              | samo `request`, `slot_request`, `disabled`; `live` zabranjen                                                            |
| BDS-003  | R2/R5 granica                                     | APPROVED | Product/Technical              | R2 scheduling/operativa; finansije su R5                                                                                |
| BDS-004  | odvajanje `AppointmentRequest` i `Appointment`    | PROPOSED | Product/Technical              | potvrditi canonical model pre šeme; trenutni MP 11-statusni appointment model je baseline, ne finalna odluka            |
| BDS-005  | request i appointment statusi/tranzicije          | PROPOSED | Product/Technical              | odobriti/izmeniti predlog iz odeljka 5                                                                                  |
| BDS-006  | radno vreme, slotovi, bufferi i overlap           | OPEN     | Product + terapeuti            | numerička i poslovna pravila nisu potvrđena                                                                             |
| BDS-007A | atomic submission contention hold                 | APPROVED | Technical                      | samo `slot_request`; kratak interni, atomski i idempotentan hold; nije rezervacija, Appointment ni user-visible status  |
| BDS-007B | post-submission slot availability                 | OPEN     | Business + Product + Technical | da li `under_review` uklanja slot javno ili dozvoljava više kandidata; preporuka je prva opcija uz SLA/reminder pravila |
| BDS-008  | alternative, reschedule, cancellation i waitlist  | OPEN     | Product + Legal                | S7 pravila otkazivanja i rokovi nedostaju                                                                               |
| BDS-009  | osnovna obaveštenja                               | PROPOSED | Product/Technical              | neutralni email: request received, alternative, confirmed, change/cancel, reminder; bez teme/razloga u subject-u        |
| BDS-010  | maloletnici, consent i safety boundary            | OPEN     | Clinical + Legal + Product     | S4/S5 input pre self-service ili javnih pravila                                                                         |
| BDS-011  | retention, audit i data minimization              | OPEN     | Legal + Technical              | ne čuvati anamnezu/dijagnozu/terapijske beleške; rokovi i pravni osnov čekaju legal input                               |
| BDS-012  | Google Calendar                                   | OPEN     | Product + terapeuti            | S12: nalozi i scope; samo free/busy, interni engine je source of truth                                                  |
| BDS-013  | B2B rezervisani kapacitet                         | BLOCKED  | Product                        | operativni kapacitet target R4; naplata/fakturisanje target R5                                                          |
| BDS-014  | paketi, krediti, pretplate, naplata i refundacije | BLOCKED  | Business + Legal               | target R5; bez R2 koda/tabela/UI-ja                                                                                     |
| BDS-015  | unresolved request reminder/SLA                   | OPEN     | Business + Operations + Legal  | prvi/ponovljeni reminder, escalation, max review rok, expiry i komunikacija klijentu čekaju operativnu potvrdu          |
| BDS-016  | Notify Me offer policy                            | PROPOSED | Product + Operations           | preporuka: sekvencijalna privatna ponuda; broadcast first-claim je buduća tenant opcija, ne default                     |
| BDS-017  | atomic waitlist offer claim                       | APPROVED | Technical                      | serverski atomic claim, token/expiry/idempotency i nearest-slot fallback; ne definiše business redosled ili TTL         |

## 5. Predloženi lifecycle za potvrdu

Ovo je `PROPOSED`, ne migraciona šema. Cilj je da se razdvoje korisnički zahtev i stvarni termin, umesto da se sve semantike mešaju u jedan status enum.

```ts
type AppointmentRequestStatus =
  | "received"
  | "under_review"
  | "alternative_proposed"
  | "accepted"
  | "declined"
  | "expired"
  | "withdrawn";

type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled_by_client"
  | "cancelled_by_therapist"
  | "no_show"
  | "rescheduled";
```

Predloženi request prelazi:

```text
received -> under_review | withdrawn | expired
under_review -> alternative_proposed | accepted | declined | withdrawn | expired
alternative_proposed -> accepted | declined | withdrawn | expired
accepted -> creates Appointment
```

Predloženi appointment prelazi zahtevaju još dve semantičke odluke:

1. da li `scheduled` znači „period postoji, čeka završnu potvrdu“ ili se termin pravi tek kao `confirmed`;
2. da li je `rescheduled` trajni status ili event koji povezuje stari i novi termin.

Do BDS-004/BDS-005 approval-a, postojeći master-plan 11-statusni model ostaje dokumentacioni baseline. Ne praviti paralelne enum-e ili migracije.

## 6. Dostupnost, slotovi i preklapanje

R2 mora da ima sledeće konceptualne ulaze, ali njihove konkretne vrednosti nisu odobrene:

- timezone organizacije i terapeuta (default Europe/Belgrade), kao i korisnikova timezone pri zahtevu;
- recurring radno vreme po terapeutu i formatu;
- izuzetke (`block` i dodatna dostupnost);
- trajanje po usluzi;
- buffer pre/posle termina;
- minimalni rok i maksimalni horizont za zahtev;
- external free/busy blokove ako je Google odobren;
- pravila za overlap, paralelne formate, parove/učesnike i ručno unete termine;
- kapacitet novih zahteva, waitlist i fairness pravila.

Radna formula je:

```text
candidate slots = availability rules
                - exceptions
                - confirmed/active appointment periods
                - approved buffers
                - external busy blocks
                - any approved temporary hold policy
```

Samo database constraint i concurrency test smeju biti poslednja zaštita od duplog aktivnog termina. UI nikada ne sme sam odlučiti da je slot siguran.

## 7. BDS-007 — dve odvojene hold odluke

### BDS-007A — Atomic submission contention hold

**Status:** APPROVED  
**Target:** R2 `slot_request` implementacija

Kada korisnik izabere slot, sistem koristi kratak interni contention hold samo da dva istovremena slanja ne prođu kao primarna za isti slot.

```text
selected slot -> technical hold -> submit + validation -> AppointmentRequest
```

Hold:

- važi samo za `slot_request`, ne za običan `request`;
- nije `Appointment`, potvrda, plaćena rezervacija ni korisnička poruka „termin je rezervisan";
- ima kratak konfigurabilan TTL, bez sada zaključene vrednosti;
- nestaje kada slanje ne uspe ili se tok napusti;
- uspešnim slanjem prelazi u stanje koje definiše BDS-007B;
- mora biti atomski i idempotentan pri retry-u;
- PostgreSQL je krajnji autoritet; Redis može biti contention sloj.

Korisnička poruka ostaje request-first: terapeut proverava dostupnost i potvrđuje termin ili predlaže drugu mogućnost.

### BDS-007B — Post-submission slot availability

**Status:** OPEN  
**Owner:** Business + Product + Technical

Nakon uspešnog `AppointmentRequest` u `under_review` treba potvrditi jednu politiku:

- **A — pending unavailable:** prvi validan zahtev privremeno uklanja slot iz javne ponude;
- **B — multiple candidates:** slot ostaje dostupan i može primiti više zahteva.

Predlog je **A**, ali pre odobrenja zahtevaju se review SLA, reminder/escalation, istek zahteva, ponovno otvaranje slota, Notify Me ponašanje i prioritet zahteva.

```text
AVAILABLE -> TECHNICAL_HOLD -> PENDING_REVIEW -> CONFIRMED
PENDING_REVIEW -> ALTERNATIVE_PROPOSED | DECLINED -> AVAILABLE
TECHNICAL_HOLD -> EXPIRED -> AVAILABLE
```

`TECHNICAL_HOLD` je infrastrukturno stanje; `PENDING_REVIEW` je poslovno stanje. Njihovo trajanje i javna dostupnost nisu ista odluka.

## 8. Reschedule, otkazivanje i osnovna obaveštenja

R2 treba da podrži request za promenu, otkazivanje bez finansijskog obračuna, alternativu i istoriju termina. Broj dozvoljenih promena, minimalni rok, late/no-show posledice i komunikacioni tekst su `OPEN` dok S7 ne dobije business/legal potvrdu.

Predlog za osnovna obaveštenja je neutralan email sa dokazom isporuke, retry/dedupe pravilima i bez zdravstvenih detalja. Podsetnici, vremena slanja i opt-out granice zahtevaju finalni product/legal review.

## 9. Nerešeni zahtevi, Notify Me i atomic claim

Booking Engine emituje događaje; Notification Engine reaguje, ali nikada ne odlučuje ko dobija slot:

```text
APPOINTMENT_REQUEST_CREATED
APPOINTMENT_REQUEST_UNRESOLVED
SLOT_RELEASED
WAITLIST_OFFER_CREATED
WAITLIST_OFFER_CLAIMED
WAITLIST_OFFER_EXPIRED
ALTERNATIVE_SLOTS_GENERATED
```

### BDS-015 — Reminder Scheduler

Potrebno je definisati prvi reminder terapeutu, ponovljeni reminder, escalation owneru, maksimalno vreme za odgovor, ponašanje nakon isteka, ponovno otvaranje slota i status/alternativu za klijenta. Rokovi se ne izmišljaju tehnički; potvrđuje ih Anja i operativni tim.

### BDS-016 — Notify Me policy

Predloženi default je sekvencijalna ponuda: prvi korisnik na listi dobija privatnu ponudu sa rokom; sledeći korisnik dolazi na red tek po claim-u ili isteku. Broadcast first-claim može kasnije biti tenant opcija, uz jasnu poruku i veću UX/race složenost.

### BDS-017 — Atomic offer claim

Bez obzira na policy, claim je serverski atomski:

```text
WAITLIST_OFFER offered -> claimed
every later valid request -> already_claimed + nearest_available_slots
```

Ponuda nosi jedinstven token, vezu sa korisnikom i slotom, expiry, idempotency key, status i vreme claim-a. Korisnik koji zakasni dobija poruku da je termin preuzet i najbliže dostupne termine. Tačan TTL i redosled iz BDS-016 ostaju poslovne odluke.

## 10. Maloletnici, privacy i retention

Pre bilo kog adolescent self-service toka moraju biti zaključeni uzrast, roditeljska/starateljska saglasnost, privatnost i krizni/safety tekst. Booking domen ne čuva anamnezu, dijagnozu, kliničku belešku, snimak, transkript ili zaključak o mentalnom stanju.

`client_note`, ako uopšte postoji, služi samo logistici i mora imati ograničenje/validaciju koja odvraća unos zdravstvenih detalja. Retention i brisanje podataka zahtevaju legal odluku.

## 11. Finansijski appendix - BLOCKED do R5

| Tema                     | Status  | Target | R2 dozvoljeno                 |
| ------------------------ | ------- | ------ | ----------------------------- |
| Package purchase         | BLOCKED | R5     | samo `PackageOffer` prikaz    |
| Credit balance/ledger    | BLOCKED | R5     | ništa                         |
| Subscription             | BLOCKED | R5     | ništa                         |
| kartično/hosted plaćanje | BLOCKED | R5     | ništa                         |
| refund                   | BLOCKED | R5     | ništa                         |
| invoice/fiscal model     | BLOCKED | R5     | ništa                         |
| company billing          | BLOCKED | R5     | samo CompanyPlan opis/inquiry |
| coupon/reconciliation    | BLOCKED | R5     | ništa                         |

Ovo znači: bez R2 tabela, migracija, endpointa, UI-ja, provider SDK-a i finansijske logike.

## 12. Ulazni kriterijum za R2 implementaciju

Pre prvog R2 booking PR-a mora postojati:

1. R1 prihvaćen u produkciji i potpisan SoW za R2;
2. BDS-004 do BDS-017 zatvoren, odložen sa jasnim fallback-om ili uklonjen iz SoW-a;
3. S7 otkazivanje, S4 maloletnici gde relevantno i S12 Calendar gde se naručuje;
4. potvrđena vlasnička/pravna odluka za retention i notification sadržaj;
5. tehnički acceptance za concurrency, idempotency, outbox, tenant scoping i data minimization.

Dok to ne postoji, ovaj dokument smanjuje rizik i čuva odluke, ali nije dozvola za produkcijsku implementaciju.
