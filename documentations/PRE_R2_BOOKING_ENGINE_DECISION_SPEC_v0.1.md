# PRE-R2 BOOKING ENGINE DECISION SPEC v0.1

**Status:** R1.6 u toku; dokumentacioni gate, bez odobrenja za R2 kod
**Datum:** 2026-07-22
**Formalni naziv:** Pre-R2 Booking Engine Decision Specification  
**Interni redosled:** R1.6; nije deo R1 production launch scope-a

## 1. Svrha i granica

Ovaj dokument pretvara request-first pravac u stabilan ugovor za budući R2 Booking Engine. Zaključava arhitektonske granice koje ne zavise od dnevne prakse, a jasno odvaja poslovne predloge koji čekaju Anju, tim ili pravnika.

Ne daje dozvolu za R2 tabele, migracije, endpoint-e, panel UI ili provider integracije pre R1 prihvatanja, SoW-a i zatvorenih obaveznih odluka. R2 je request-first scheduling. R3 je Content Engine / CMS. R5 je finansijski domen.

## 2. Odmah zaključane invarijante

### 2.1 Booking režim je svojstvo konkretne ponude

Efektivni `BookingMode` računa se za kombinaciju:

```text
Service + Therapist + Format + Location
```

Override sme samo da suzi dozvoljeni režim:

```text
slot_request -> request -> disabled
```

Ne sme samostalno da ga proširi. Nepotpuna ili nepotvrđena kombinacija je `disabled`, osim eksplicitno odobrenog team-review toka. Preference iz Intake-a je samo signal za predlog; ne postavlja terapeuta, dostupnost ili booking režim.

### 2.2 Appointment nastaje samo potvrdom terapeuta

```text
Selected slot or preferred period
-> optional technical SlotHold
-> AppointmentRequest
-> therapist confirmation or AlternativeProposal
-> transactional Appointment creation
```

Ni `slot_request` ni `SlotHold` nisu Appointment, potvrda niti korisniku vidljiva rezervacija. Ne postoji stanje "skoro potvrđenog" Appointment-a.

### 2.3 Promena termina je poseban zahtev

```ts
type AppointmentRequestType = "initial" | "reschedule";
```

Dok `reschedule` zahtev ne bude prihvaćen i atomski pretvoren u novi Appointment, postojeći potvrđeni termin ostaje važeći. Time neuspešna ili istekla promena ne briše termin koji klijent već ima.

## 3. Statusi odluka

| Status | Značenje |
| --- | --- |
| `OPEN` | Odluka ili preporučeno rešenje još ne postoji; R2 kod ne sme pretpostaviti vrednost. |
| `PROPOSED` | Postoji konkretan predlog za poslovni/stručni review; nije ugovor za implementaciju. |
| `CHANGE_REQUESTED` | Vlasnik je pregledao predlog i traži izmenu pre novog odobrenja. |
| `APPROVED` | Zaključano za implementaciju kada R2 dobije svoj odobreni scope. |
| `BLOCKED` | Namerno je van ovog release-a; evidentira se granica i target milestone. |

R1.6 je završen tek kada svaki red koji ulazi u odobreni R2 scope dobije `APPROVED`, `CHANGE_REQUESTED`, `OPEN` sa eksplicitnim fallback-om ili `BLOCKED`. Svaka promena `APPROVED` odluke zahteva novi red u `PRODUCT_DECISIONS.md` i update ovog dokumenta.

## 4. Decision register

| ID | Tema | Status | Owner | Odluka / sledeći korak |
| --- | --- | --- | --- | --- |
| BDS-001 | Booking Mode Resolution | APPROVED | Product/Technical | Efektivni mode je po `Service + Therapist + Format + Location`; override samo sužava. Početna matrica iz odeljka 5 ostaje `PROPOSED` za Anju. |
| BDS-002 | Time and Availability Contract | OPEN | Product + terapeuti | UTC/IANA granica je definisana, ali trajanja, bufferi, radno vreme, odsustva, horizont i overlap pravila čekaju potvrdu. |
| BDS-003 | Derived Slot Lifecycle | PROPOSED | Product + Technical | Slot je izvedeno stanje iz `SlotHold`, `AppointmentRequest`, `Appointment` i availability pravila; semantiku iz odeljka 7 treba potvrditi sa BDS-007B. |
| BDS-004 | AppointmentRequest Lifecycle | PROPOSED | Product + Technical | Canonicalno razdvajanje od Appointment-a je zaključano; predloženi statusi i tranzicije iz odeljka 7 čekaju finalni review. |
| BDS-005 | Appointment Lifecycle | PROPOSED | Product + Technical | Predlog je mali lifecycle `confirmed`, `completed`, `no_show`, `cancelled`; actor i razlog su audit, ne novi javni statusi. |
| BDS-006 | Alternative Proposal | PROPOSED | Product + Operations | Terapeut može dati jednu ili više opcija; prihvatanje jedne mora biti atomsko, uz zatvaranje ostalih. |
| BDS-007A | Technical Contention Hold | APPROVED | Technical | Kratak atomski i idempotentan hold važi samo za `slot_request`; nije rezervacija ni Appointment. Konkretan TTL ostaje konfiguraciona R2 vrednost. |
| BDS-007B | Slot posle slanja zahteva | PROPOSED | Business + Product + Technical | Predlog A: prvi validan zahtev privremeno uklanja slot iz javne ponude do odluke ili isteka. Za odobrenje su potrebni SLA, reopen i Notify Me pravila. |
| BDS-008 | Review SLA | PROPOSED | Business + Operations + Legal | Predloženi rokovi su u odeljku 10; Anja i operativni tim ih potvrđuju kroz `Odobravam / Želim izmenu`. |
| BDS-009A | Atomic waitlist offer claim | APPROVED | Technical | Prvi validni serverski atomic claim osvaja jednu privatnu ponudu; ponovni claim dobija `already_claimed` i alternative. |
| BDS-009B | Notify Me policy | PROPOSED | Product + Operations | Sekvencijalna privatna ponuda, FIFO i rok od četiri radna sata su preporuka, ne odobrena operativna politika. |
| BDS-010A | Reschedule request contract | APPROVED | Product/Technical | `AppointmentRequest.type = initial | reschedule`; postojeći Appointment ostaje važeći do atomske konverzije. |
| BDS-010B | Cancellation policy i rutinske role | OPEN | Product + Legal + Operations | S7 pravila, rokovi, late/no-show posledice i finalna role politika zahtevaju potvrdu. R2 ne obračunava novac. |
| BDS-011 | Consent, retention i safety boundary | OPEN | Clinical + Legal + Product | Adult booking traži odobrene obavezne potvrde, retention i sigurnosni tekst; maloletnici su zasebno `BLOCKED` i ostaju `disabled` dok se ne odobre njihova pravila. |
| BDS-012 | Google Calendar | OPEN | Product + terapeuti | Moguć je samo naknadni free/busy adapter; interni engine ostaje source of truth. |
| BDS-013 | B2B rezervisani kapacitet | BLOCKED | Product | Target R4; B2B booking i billing ne ulaze u početni R2. |
| BDS-014 | Paketi, krediti, pretplate, plaćanje i refundacije | BLOCKED | Business + Legal | Target R5; bez R2 tabela, migracija, endpoint-a, UI-ja ili provider SDK-a. |

Ova revizija objedinjavanjem menja ranije radne oznake: prethodni BDS-015 prelazi u BDS-008, BDS-016 u BDS-009B, a BDS-017 u BDS-009A. BDS-007A/B zadržavaju ista značenja.

## 5. BDS-001 - Booking Mode Resolution

```ts
type BookingMode = "request" | "slot_request" | "disabled";

type BookingOfferContext = {
  serviceId: string;
  therapistId?: string;
  format: "online" | "in_person";
  locationId?: string;
};
```

`service` određuje najširi dozvoljeni mode. Terapeut, format i lokacija mogu samo da ga suze. Nema automatskog proširenja na osnovu marketing sadržaja, Intake preference-a, postojećeg klijenta ili nepopunjene konfiguracije.

```text
service ceiling + therapist override + format override + location override
-> most restrictive configured mode
-> effectiveBookingMode
```

Pravila:

- `slot_request` prikazuje samo slotove za potpuno podržanu ponudu; izbor šalje zahtev za taj slot, nikada rezervaciju.
- `request` traži željeni period bez slot pickera.
- `disabled` ne prikazuje booking CTA koji obećava dostupnost. Može prikazati informativni sledeći korak ili, kada BDS-009B bude odobren, Notify Me.
- Ako `slot_request` nema kandidat-slotova, ne sme sam promeniti javni tok u `request`. Takav fallback mora biti eksplicitno konfigurisan i može samo da suzi tok u `request` ili `disabled`.
- Team review iz Intake-a je eksplicitni `request` routing tok; nije zamena za nepotvrđenog terapeuta.

### Početna matrica ponuda - PROPOSED za Anju

| Usluga / ulaz | Preporučeni default | Zašto / uslov aktivacije |
| --- | --- | --- |
| Individualna psihoterapija za odrasle | `slot_request` | Standardno trajanje i potvrđen terapeut, format, lokacija i dostupnost. |
| Bračno savetovanje | `request` | Duže trajanje, dva učesnika i dodatna provera uslova. |
| Podrška roditeljima za odrasle | `slot_request` | Standardni slotovi kada terapeut objavi dostupnost. |
| Team review iz Intake-a | `request` | Tim prvo određuje kome zahtev pripada. |
| Usluga bez potvrđenog terapeuta ili pravila | `disabled` | Informativna stranica, bez lažnog booking CTA-a. |
| Maloletnici, radionice i B2B | `disabled` u početnom R2 | Aktiviraju se samo kroz zasebno odobrene politike. |

## 6. BDS-002 - Time and Availability Contract

Tehnička vremenska granica je sledeća:

- periodi se čuvaju i porede u UTC-u;
- organizacija i podrazumevani javni prikaz koriste IANA zonu `Europe/Belgrade`;
- pri slanju se čuva korisnikova IANA zona radi tačne komunikacije i letnjeg/zimskog računanja vremena;
- Calendar adapter, kada bude odobren, dostavlja samo free/busy blokove; nikada naslove, opise ili učesnike eksternih događaja.

Pre R2 je potrebno potvrditi ili namerno isključiti:

- trajanje po ponudi i buffer pre/posle;
- recurring radno vreme po terapeutu, formatu i lokaciji;
- odsustva, ručne blokove i dodatnu dostupnost;
- minimalni rok, maksimalni horizont i pravilo za poslednji slot u danu;
- overlap, paralelne formate, dva učesnika i ručno unete termine;
- pravila za izvor dostupnosti i Calendar outage.

```text
candidate slots = approved availability rules
                - exceptions and blocks
                - confirmed appointments and approved buffers
                - external free/busy blocks when enabled
                - active hold or pending-request policy when applicable
```

UI ne donosi odluku da je slot siguran. Poslednja zaštita je PostgreSQL ograničenje i concurrency test u R2 domenu.

## 7. BDS-003, BDS-004 i BDS-005 - objekti i lifecycle-i

### 7.1 Odvojeni objekti

| Objekat | Značenje | Ne sme biti |
| --- | --- | --- |
| `SlotHold` | Kratko tehničko držanje izabranog slota tokom slanja. | Potvrda, plaćena rezervacija ili javni termin. |
| `AppointmentRequest` | Korisnikov zahtev za početni termin ili promenu termina. | Appointment ili dokaz dostupnosti. |
| `Appointment` | Stvarno potvrđen termin. | Privremeno mesto u kalendaru koje čeka pregled. |

Predloženi izvedeni status slota:

| Status | Značenje |
| --- | --- |
| `available` | Kandidat je slobodan prema važećim pravilima. |
| `held` | Postoji aktivan `SlotHold`. |
| `pending_request` | Postoji aktivni početni zahtev koji blokira slot samo ako BDS-007B opcija A bude odobrena. |
| `booked` | Postoji potvrđen `Appointment`. |
| `blocked` | Postoji availability exception, buffer ili odobren external busy blok. |
| `expired` | Istorijski/diagnostic razlog za istek hold-a ili zahteva; po isteku se javna dostupnost ponovo računa, pa ovo nije trajni javni slot. |

### 7.2 Predloženi `AppointmentRequest` lifecycle - BDS-004

```ts
type AppointmentRequestStatus =
  | "submitted"
  | "under_review"
  | "alternative_proposed"
  | "awaiting_client"
  | "converted"
  | "declined"
  | "withdrawn"
  | "expired";
```

```text
submitted -> under_review | withdrawn | expired
under_review -> alternative_proposed | converted | declined | withdrawn | expired
alternative_proposed -> awaiting_client | declined | withdrawn | expired
awaiting_client -> converted | declined | withdrawn | expired
converted | declined | withdrawn | expired -> terminal
```

`alternative_proposed` znači da su alternativne opcije trajno kreirane. Kada se one objave klijentu, zahtev prelazi u `awaiting_client`. `converted` je terminalni dokaz da je transakcijski napravljen potvrđen Appointment; nije sinonim za "verovatno će biti potvrđeno".

### 7.3 Predloženi `Appointment` lifecycle - BDS-005

```ts
type AppointmentStatus =
  | "confirmed"
  | "completed"
  | "no_show"
  | "cancelled";
```

```text
confirmed -> completed | no_show | cancelled
completed | no_show | cancelled -> terminal
```

Ko je otkazao, razlog, vreme, policy version i eventualni naslednik pri pomeranju čuvaju se kao minimalni audit/event podaci. Ne pretvaraju se u mnogobrojne javne status enum vrednosti.

### 7.4 Dozvoljene rutinske mutacije - predlog za R2 RBAC

| Akter | Dozvoljeno ponašanje |
| --- | --- |
| Posetilac / klijent | šalje početni zahtev; povlači sopstveni nepotvrđeni zahtev kroz bezbedan identitet ili token; bira ponuđenu alternativu. |
| Klijent sa potvrđenim terminom | šalje `reschedule` zahtev ili zahtev za otkazivanje; ne menja sam aktivni Appointment. |
| Dodeljeni terapeut | počinje review, potvrđuje, odbija, predlaže alternativu, prihvata promenu i označava `completed` / `no_show`. |
| Org admin / ovlašćena trijaža | upravlja nedodeljenim review-om i radi override samo uz obavezan audit razlog. |
| Superadmin | read-only health/metadata; nema rutinske booking mutacije. |

Konačna tenant RBAC/ABAC pravila dolaze uz R2 M2.1, ali ne smeju proširiti ova ograničenja bez eksplicitne odluke.

## 8. BDS-006, BDS-007A i BDS-007B - alternative i slot nakon slanja

### BDS-006 - Alternative Proposal

Terapeut može ponuditi jednu ili više alternativnih opcija sa rokom. Klijent može prihvatiti najviše jednu. Prihvatanje mora biti serverski atomsko:

```text
one valid alternative accepted
-> AppointmentRequest converted
-> exactly one Appointment confirmed
-> all sibling alternatives closed
```

Istekla, povučena ili već zatvorena opcija ne može biti prihvaćena. Klijent koji zakasni dobija neutralnu poruku i najbliže dozvoljene opcije kada postoje.

### BDS-007A - Atomic submission contention hold

**Status:** `APPROVED`

```text
selected slot -> technical hold -> submit + validation -> AppointmentRequest
```

Hold:

- važi samo za `slot_request`, ne za obični `request`;
- nije Appointment, potvrda, plaćena rezervacija ni poruka "termin je rezervisan";
- PostgreSQL je krajnji autoritet; Redis može biti pomoćni contention sloj;
- jedna uspešna konkurentna putanja može nastaviti za isti slot;
- retry koristi idempotency key, a neuspešno ili napušteno slanje automatski oslobađa hold;
- uspešnim slanjem prelazi u stanje koje određuje BDS-007B.

Predlog "najviše 10 minuta za završetak forme" je **kandidat konfiguracije**, ne zaključena vrednost. D-034 ostaje važeći: stvarni TTL se potvrđuje u R2 tehničkom dizajnu i testiranju flow-a.

### BDS-007B - Slot posle uspešnog zahteva

**Predložena opcija A - pending unavailable:** prvi validno poslati početni zahtev privremeno uklanja slot iz javne ponude do review odluke ili isteka pending roka.

```text
available -> held -> pending_request -> booked
pending_request -> alternative_proposed | declined | withdrawn | expired -> available
held -> expired -> available
```

Ova opcija sprečava da više korisnika očekuje isti termin. Ne postaje `APPROVED` dok BDS-008 ne zaključi review rok, reminder/escalation, ponašanje posle breach-a, reopen i vezu sa Notify Me. Opcija B (više kandidata za isti slot) se ne implementira bez zasebne odluke.

## 9. BDS-008 i BDS-009 - review, Notify Me i atomic claim

### BDS-008 - Review SLA

Predlog za Anju i operativni tim:

| Tačka | Predlog |
| --- | --- |
| Target review | 12 radnih sati |
| Prvi reminder terapeutu | posle 4 radna sata |
| Drugi reminder | posle 8 radnih sati |
| Escalation vlasniku | posle 12 radnih sati |
| Request expiry | 3 radna dana |

Pre odobrenja treba popuniti business calendar: radne sate, vikende, praznike, vremensku zonu, zamenu tokom odsustva i ponašanje pending slota nakon SLA breach-a. Rokovi se ne izmišljaju u kodu.

### BDS-009A - Atomic offer claim

**Status:** `APPROVED`

```text
WAITLIST_OFFER offered -> claimed
every later valid claim -> already_claimed + nearest_available_slots
```

Ponuda nosi jedinstven token, vezu sa klijentom i slotom, expiry, idempotency key, status i vreme claim-a. Dva istovremena prihvatanja ne smeju oba dobiti isti slot.

### BDS-009B - Notify Me policy

Preporučeni default je sekvencijalna privatna ponuda:

```text
waiting -> offered -> claimed
                   -> declined
                   -> expired -> next FIFO entry
```

- FIFO je početni redosled;
- postoji najviše jedna aktivna ponuda po slotu;
- predloženi rok ponude je četiri radna sata i ne teče van dozvoljenog notification perioda;
- neuspešan claim prikazuje najbliže dozvoljene alternative;
- email i push poruke ne nose Intake odgovore, slobodan tekst ni druge osetljive podatke.

Broadcast first-claim ostaje buduća tenant opcija. Booking Engine emituje događaj, Waitlist domen određuje redosled, a Notification Engine samo isporučuje obaveštenje.

## 10. BDS-010 - otkazivanje i pomeranje

### BDS-010A - zaključan reschedule ugovor

Klijent šalje `AppointmentRequest(type = "reschedule")`. Stari Appointment ostaje `confirmed` dok novi zahtev ne bude prihvaćen. Pri atomskoj konverziji sistem:

1. pravi novi `Appointment(status = "confirmed")`;
2. zatvara prethodni Appointment kao `cancelled` uz reason code `rescheduled` i vezu sa naslednikom;
3. upisuje audit/event bez kopiranja osetljivog sadržaja.

### BDS-010B - otvorena cancellation politika

Klijent može povući nepotvrđen zahtev, zatražiti promenu potvrđenog termina i poslati zahtev za otkazivanje. Terapeut ili ovlašćeni org admin može potvrditi, odbiti, dati alternativu, otkazati uz razlog ili označiti attendance uz audit.

Pre R2 treba potvrditi S7: rok, kasno otkazivanje, broj promena, komunikacioni tekst, role override i eventualne posledice. R2 samo čuva verziju cancellation politike aktivne pri potvrdi; ne obračunava naknadu, penal ili refundaciju.

## 11. Obavezni događaji

```text
SLOT_HOLD_CREATED
SLOT_HOLD_EXPIRED
SLOT_RELEASED
APPOINTMENT_REQUEST_SUBMITTED
APPOINTMENT_REQUEST_REVIEW_STARTED
APPOINTMENT_ALTERNATIVE_PROPOSED
APPOINTMENT_REQUEST_CONVERTED
APPOINTMENT_REQUEST_DECLINED
APPOINTMENT_REQUEST_WITHDRAWN
APPOINTMENT_REQUEST_EXPIRED
APPOINTMENT_CONFIRMED
APPOINTMENT_RESCHEDULE_REQUESTED
APPOINTMENT_RESCHEDULED
APPOINTMENT_CANCELLED
APPOINTMENT_COMPLETED
APPOINTMENT_NO_SHOW
WAITLIST_OFFER_CREATED
WAITLIST_OFFER_CLAIMED
WAITLIST_OFFER_EXPIRED
BOOKING_REVIEW_SLA_BREACHED
```

Payload nosi stabilne ID-jeve, timestamp, actor/reference i minimalne operativne metapodatke. Ne nosi slobodan tekst, kontakt podatke, Intake odgovore, temu ili klinički sadržaj. Appointment mutation, audit/event i outbox zapis nastaju transakcijski.

## 12. Granice domena i release scope

| Domen | Odgovornost | Ne odlučuje |
| --- | --- | --- |
| Booking Engine | slot, hold, request, alternative, confirmed Appointment i concurrency | matching prioritete, redosled waitlist-e ili slanje email-a |
| Intake & Matching | guidance, preporuka i preference | booking dostupnost, dodelu termina ili potvrdu |
| Waitlist | čekanje, redosled, offer lifecycle | stvarnu dostupnost ili atomic booking conversion |
| Notification Engine | isporuka neutralne poruke, retry i dedupe | ko dobija slot ili šta je dostupno |
| Reminder Scheduler | podsetnik, escalation i SLA signal | kliničku odluku terapeuta |
| Calendar adapter | free/busy signal i mirror potvrđenog termina kada bude odobren | source of truth ili privatne detalje eksternog događaja |

Booking domen ne čuva anamnezu, dijagnozu, kliničku belešku, transkript ni zaključak o mentalnom stanju. `client_note`, ako postoji, služi samo logistici i mora biti ograničen i isključen iz logova, analitike, pretrage i email sadržaja. Za adult booking pre implementacije treba potvrditi obavezne vrste potvrda, verziju teksta, retention i sigurnosni izlaz. Maloletnici, radionice i B2B ostaju `disabled` u početnom R2 scope-u dok ne dobiju zasebne politike. Paketi, krediti, pretplate, naplata, refundacije, fakture i B2B billing su `BLOCKED` do R5.

## 13. Definition of Done za R1.6

R1.6 je završen kada:

1. svaka odluka koja ostaje u R2 scope-u ima `APPROVED`, `CHANGE_REQUESTED`, `OPEN` sa eksplicitnim fallback-om ili `BLOCKED`;
2. state machine-i nemaju nedozvoljene ili nejasne prelaze;
3. svaka mutacija ima dozvoljenu ulogu, audit granicu, idempotency i atomic concurrency pravilo;
4. TTL, SLA i business calendar dobiju izričito odobrenje ili se pogođena funkcija izbacuje iz R2 scope-a;
5. Booking, Intake, Matching, Notification i Waitlist granice ostanu odvojene;
6. nema R2 tabela, endpoint-a, UI-ja ili finansijske logike iz R5;
7. adult consent, retention i safety granice dobiju legal/clinical potvrdu, a maloletnici, B2B i radionice ostanu disabled dok ne dobiju sopstvene politike;
8. Anja dobije kratak poslovni list `R1_6_BOOKING_BUSINESS_APPROVAL_SHEET_v0.1.md` sa odgovorom `Odobravam / Želim izmenu`;
9. tehnička verzija postane stabilan ulaz za R2 plan review.

Trenutno su tačke 2.1-2.3 i BDS-007A/BDS-009A zaključane. Poslovna potvrda početne matrice, BDS-007B, BDS-008, BDS-009B i BDS-010B još nedostaje.

## 14. Predloženi redosled R2 nakon R1.6

Ovo su capability koraci unutar formalnog R2 plana, ne paralelna značenja R2 ili zamena za postojeće M2.1-M2.8 milestone-e:

```text
R2.1 Booking Core
-> R2.2 Availability
-> R2.3 Request Review
-> R2.4 Notify Me (samo kada BDS-007B/BDS-008/BDS-009B budu odobreni)
-> R2.5 Adaptive Booking Widget
```

`R2.4 Notify Me` odgovara opcionom M2.8 / package 2B iz master plana. Identity, tenant scoping i role kontrole iz M2.1 ostaju preduslov za sve mutacije Booking Core-a.
