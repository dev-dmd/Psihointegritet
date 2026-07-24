# Production Intake & Matching Engine v0.1

**Status:** implementirano iza feature flag-ova; produkciona aktivacija čeka obavezna odobrenja
**Datum:** 2026-07-22  
**Dopunjeno:** 2026-07-23 — eksplicitna guest-first napomena, eligibility/uzrasna referentna tabela za već implementiran maloletnički tok (§1.4) i inkluzivna LGBTQIA+ napomena (§2, §2.1, §6)
**Prethodnik:** `PSIHOINTEGRITET_INTAKE_MATCHING_ENGINE_v0.1.md` je staging/demo specifikacija.  
**Granica:** produkcijski Intake & Matching Engine dolazi pre R2 Booking Engine-a, ali ne implementira slotove, plaćanje, waitlist ni Notification Scheduler.

## 1. Cilj i redosled

Frontend v1 je dokazao javni flow, deterministička pravila i UX. Produkcijska verzija premešta odluke, perzistenciju i konkurentnu bezbednost iza stabilnih adaptera, bez ponovnog dizajniranja gotovog javnog UI-ja.

```text
R1.4.i Content Governance code gate
  -> Production Intake & Matching Engine
  -> R2 Booking, Scheduling & Payments boundary (payments remain R5)
  -> R3 Content Engine / CMS
```

Pre-R2 odluke o reminderima, Notify Me, slot dostupnosti i atomic claim-u teku paralelno sa Intake radom, ali se ne implementiraju u Intake domen.

### 1.1 Product-led saradnja i kriterijum za funkcionalnosti

Psihointegritet tim ne treba da osmišljava tehničku specifikaciju niti da unapred poznaje sve mogućnosti web aplikacije. Razvojni tim priprema konkretno, preporučeno rešenje zasnovano na korisničkoj vrednosti, jednostavnosti i održivosti, a Anja i stručni tim potvrđuju ili koriguju delove koji zavise od njihove stručne prakse, poslovnih pravila i pravnih obaveza.

Osnovni princip je:

> Ne čekamo da stručni tim izmisli digitalni proizvod. Predlažemo najbolje podrazumevano rešenje, prikazujemo ga kroz konkretan flow ili prototip, a zatim platformu prilagođavamo potvrđenoj praksi Psihointegriteta.

Skoro sve je tehnički moguće. Ključno pitanje nije samo da li funkcionalnost može da se napravi, već:

1. koji konkretan problem rešava;
2. da li smanjuje broj izgubljenih korisnika;
3. da li korisniku ubrzava i pojednostavljuje sledeći korak;
4. da li terapeutu ili vlasniku štedi vreme i ručni rad;
5. da li uvodi stručni, pravni, privacy ili operativni rizik;
6. koliko koštaju razvoj, infrastruktura i dugoročno održavanje;
7. može li se vrednost prvo proveriti prototipom ili feature flag-om;
8. kojim pokazateljem se meri da li je funkcionalnost uspela.

Na osnovu tog filtera svaka funkcionalnost ima jednu klasifikaciju:

| Kategorija      | Značenje                                                                          |
| --------------- | --------------------------------------------------------------------------------- |
| `Core`          | Neophodna je da platforma ispuni osnovnu svrhu.                                   |
| `Recommended`   | Donosi veliku vrednost uz opravdan trošak i rizik.                                |
| `Later`         | Postaje korisna sa većim brojem klijenata, terapeuta ili tenanata.                |
| `Experimental`  | Prvo se proverava kroz demo, prototip ili kontrolisani feature flag.              |
| `Not justified` | Tehnički je moguća, ali trenutno nema dovoljno korisničke ili poslovne vrednosti. |

Stručnom timu se zato ne postavljaju otvorena tehnička pitanja poput „Kako želite da Intake radi?". Umesto toga dobija konkretan predlog sa očekivanim ponašanjem, posledicama i izborom **Odobravam** / **Želim izmenu**. Na primer:

> Predlažemo da korisnik bez ostavljanja podataka prođe pet kratkih pitanja, odmah dobije preporuku, cenu i sledeći korak. Kontakt ostavlja tek kada želi da pošalje zahtev. Tim dobija strukturisan pregled umesto nepreglednog email-a. Da li ovaj model odgovara vašoj praksi i gde želite korekciju?

Standardni tok odlučivanja je:

```text
Proposal -> prototip -> stručna korekcija -> odluka
  -> implementacija iza feature flag-a -> merenje -> poboljšanje
```

Razvojni tim preuzima odgovornost za proizvodni koncept, automatizaciju, arhitekturu i UX. Psihointegritet potvrđuje stručne granice, odgovornosti terapeuta, poslovna pravila, pravne tekstove i način rada sa korisnicima. Time stručni tim nije opterećen tehničkim mogućnostima, ali ostaje donosilac odluke tamo gde je njegova stručnost obavezna.

### 1.2 Pre-IM Decision Sheet v0.1

**Status:** preporučeni razvojni default-i. Produkcijska aktivacija prikupljanja kontakta, odgovora i slobodnog teksta zahteva potvrdu Legal + Clinical + Product.

Platforma može razvijati i testirati ceo tok iza feature flag-a pre tih odobrenja. Dok je `intake_sensitive_submission_enabled=false`, korisnik može dobiti lokalnu, determinističku preporuku bez kontakta, ali sistem ne pravi `IntakeCase` niti perzistira odgovore u produkciji.

| ID | Odluka | Preporučeni početni default |
| --- | --- | --- |
| IMD-001 | Nastanak `IntakeCase` | Ne nastaje završetkom upitnika. Nastaje tek kada korisnik izabere **Pošalji zahtev** ili **Neka tim pregleda**, unese kontakt i prihvati obavezne potvrde obrade. |
| IMD-002 | Evidencija potvrda i saglasnosti | Čuvati tip potvrde/saglasnosti, verziju teksta, jezik, vreme, izvor i eventualno povlačenje. Marketing je potpuno odvojen i opcion. AI obrada slobodnog teksta kasnije dobija zasebnu potvrdu. Pravnik potvrđuje koje stavke su saglasnost, a koje obavezna potvrda informisanja/pravila. |
| IMD-003 | Retention | Anonimni server-side guidance, samo kada je zaista kreiran: 24 sata. Poslat, ali nekonvertovan zahtev: predlog 90 dana. Povučeni ili zatvoreni zahtev: predlog 30 dana. Slobodan tekst se briše pre osnovnog audit zapisa. Konačne rokove potvrđuje pravnik. |
| IMD-004 | Slobodan tekst | Opcion, najviše 1.000 karaktera, bez dokumenata. Ne ulazi u logove, analitiku, pretragu ili email obaveštenja. Pre preuzimanja slučaja terapeuti vide samo da tekst postoji; puni tekst vide ovlašćena trijaža i dodeljeni terapeut. |
| IMD-005 | Human-support eskalacija | Pravila su deterministička i ne zavise samo od AI-ja. Kada sistem ne može pouzdano da preporuči terapeuta, korisnik dobija jasan put ka ljudskom pregledu. Platforma ne stvara utisak neprekidnog praćenja niti garantuje hitan odgovor. |
| IMD-006 | Pristup i audit | Nedodeljena lista prikazuje minimum podataka. Dodeljeni terapeut dobija potreban detalj. Superadmin podrazumevano vidi samo metadata/health. Audit beleži pristup osetljivom sadržaju, claim, reassign, promene statusa, brisanje i verziju potvrde, bez kopiranja sadržaja. |
| IMD-007 | Matching fallback | Team review kada nema odgovarajućeg terapeuta, svi su pauzirani, odgovori su nedovoljni ili konfliktni, postoji nepodržana kombinacija ili korisnik sam traži pregled tima. Izjednačeni kandidati mogu se prikazati kao 2–3 razumljive opcije. |
| IMD-008 | Kapacitet terapeuta | `acceptanceStatus` (`accepting` / `limited` / `paused`) je odvojen od `presenceStatus` (`active` / `temporarily_absent`). Uzrast, usluga, format i lokacija su hard constraints. `limited` utiče na rangiranje, `paused` i odsustvo isključuju terapeuta iz automatske preporuke. Budući `availabilitySummary` pripada Booking Engine-u. |
| IMD-009 | Maloletni korisnici | Upitnik pita starosnu grupu, ne pun datum rođenja. Roditelj/staratelj može poslati zahtev; adolescent od 16 ili 17 godina ide na kontrolisani team review bez automatskog traženja kontakta roditelja. Tok za mlađe od 16 ostaje kontrolisan i ne objavljuje novu uslugu bez Legal + Clinical publish gate-a. |
| IMD-010 | Response SLA i poslovni kalendar | Predlog: interni cilj je 12 radnih sati, javni maksimum jedan radni dan, vremenska zona `Europe/Belgrade`. Tačan raspored radnih dana, praznika, escalation i vlasnik review-a čekaju operativnu potvrdu. `reviewDueAt` je modelovan, ali se ne računa kao obećanje dok se kalendar ne odobri. |

Tehnički default-i koji prate ove odluke:

- retenciju sprovodi automatizovani purge posao kroz `expires_at`; audit čuva minimalan dokaz akcije, nikad tekst ili odgovore;
- kreiranje zahteva je idempotentno, kako dvoklik i retry ne bi napravili dupli `IntakeCase`;
- kontakt, strukturisani odgovori, slobodan tekst i audit nalaze se u odvojenim modelima sa zasebnim pravilima pristupa;
- analitika sme da meri samo generički napredak kroz flow, nikad odgovor, kategoriju podrške, slobodan tekst, preporuku ili matching rezultat.

### 1.3 Anjina validacija Intake pravila, 2026-07-22

**Izvor:** `documentations/anja-intake-case.pdf`. Odgovori potvrđuju osnovni IM-1 pravac i konkretizuju tri oblasti: maloletnički tok, odvojene operativne statuse terapeuta i safety/human-review proceduru.

| Oblast | Zaključak | Implementaciona posledica |
| --- | --- | --- |
| Nastanak slučaja i slobodan tekst | Potvrđeno | `IntakeCase` nastaje tek pri slanju zahteva; kratak opcioni tekst nije dijagnostički alat niti se šalje email-om. |
| Maloletnici | Potvrđeno uz Legal gate | Roditelj/staratelj, adolescent 16–17 i informativni put su odvojene grane. Puno ime deteta se ne traži pre prihvatanja slučaja. Pravna osnova, poverljivost i uključivanje roditelja nisu pretpostavljeni kodom. |
| Deca mlađa od 16 | Novi controlled scope | Ne objavljuje se nova javna usluga niti cena. Put može završiti samo informacijom ili team review-om dok Marija, Clinical i Legal ne potvrde uslugu, granice, cenu, trajanje i saglasnost. |
| Safety/human support | Stručno potvrđeno | Deterministički signal prikazuje lokalizovano obaveštenje da platforma nije hitna služba i uspešan zahtev prebacuje na prioritetni human review. Anonimni korisnik nikad ne dobija utisak da je tim obavešten. |
| Terapeutski statusi | Potvrđeno | `acceptanceStatus`, `presenceStatus`, `absenceUntil`, uzrasne grupe, capability-ji, formati i lokacije postaju odvojena interna konfiguracija. Slotovi i `no_current_slots` ostaju R2. |
| Imena i javni termini | Bez izmene sada | Kanonsko ime ostaje **Marjan Janković**, jer ga koriste postojeći javni profil i Anjin PDF. Javni naziv usluge ostaje **Bračno savetovanje**. Capability `addiction_related_support` ostaje interni i scope-pending; ne otvara novu javnu temu. |

Obavezni gate-ovi pre produkcijskog aktiviranja novih grana:

1. Legal potvrđuje maloletnički tok, roditeljsku/starateljsku potvrdu, poverljivost za 16–17 i finalni safety tekst.
2. Svaki terapeut potvrđuje sopstvene capability-je, uzrasne granice, formate i lokacije; Marija posebno potvrđuje eventualni rad sa decom mlađom od 16.
3. Product/operations imenuje vlasnika human review-a, radne dane, praznike, escalation i reminder politiku.

### 1.4 Implementacioni status, 2026-07-22

Prvi produkcioni Intake slice je implementiran, ali je po default-u zatvoren za unos osetljivih podataka.

| Oblast | Stanje | Implementirano ponašanje |
| --- | --- | --- |
| `IntakeCase` i privatnost | Završeno iza flag-a | PostgreSQL modeli odvajaju kontakt, strukturisane odgovore, slobodan tekst, potvrde, dodele i audit. Slobodan tekst je ograničen na 1.000 karaktera i nije prikazan u nedodeljenom redu. |
| Legal gate | Završeno | Sam `intake_sensitive_submission_enabled=true` nije dovoljan. Backend prihvata zahtev tek kada su podešene i očekivane verzije obaveštenja o obradi i potvrde da zahtev nije termin. |
| Idempotentno slanje | Završeno | `Idempotency-Key` plus fingerprint zahteva sprečavaju dupli `IntakeCase`; isti retry vraća isti slučaj, drugačiji payload sa istim ključem vraća konflikt. |
| Deterministički matching | Završeno | Backend `StaticMatchingAdapter` primenjuje hard gate za `acceptanceStatus`, `presenceStatus`, capability, uzrast, format i lokaciju; `limited` je samo rangirajući signal. Interni score nije deo javnog ugovora. |
| Javni flow | Završeno iza flag-a | Podnosilac prvo bira odrasli / roditelj-staralac / adolescent 16–17 / informacije. Svaka grana ima samo potrebna pitanja bez kontakta; aktivan backend tok zatim nudi **Pošaljite zahtev** ili **Neka tim pregleda zahtev**. Stari `/zakazi` demo ostaje fallback dok je novi flow isključen. |
| Maloletni tok | Završeno uz publish gate | Uzrast je grupa, ne datum rođenja. Roditelj/staralac unosi samo svoj kontakt, svest deteta i status podnošenja, uz opcionalnu kratku napomenu; adolescent 16–17 nema slobodan tekst i ide na kontrolisani team review. Za mlađe od 16 sistem ne objavljuje javnu uslugu, cenu ni preporuku terapeuta. |
| Safety/human review | Završeno uz Legal gate | Usko determinističko pravilo prikazuje hitno obaveštenje lokalno; tek poslati zahtev dobija bounded safety kategoriju, vreme, verziju pravila i `priority` bez kopiranja slobodnog teksta u audit ili queue. |
| Team Queue | Završeno iza flag-a | Zaštićene rute zahtevaju validiran Clerk JWT, internog korisnika i aktivno PostgreSQL članstvo. Lista izlaže samo minimum metadata, uključujući neobavezujuću preferenciju terapeuta; `claim` je `SELECT ... FOR UPDATE` mutacija, a `reassign` je admin-only sa reason code i audit događajem. |
| Frontend ugovor | Završeno | FastAPI OpenAPI ugovor i generisani TypeScript tipovi obuhvataju javni matching, submission, queue, claim i reassign. |

Aktivni backend endpointi:

```text
GET  /api/v1/public/intake/capabilities
POST /api/v1/public/intake/match
POST /api/v1/public/intake/cases
GET  /api/v1/intake/cases/queue
POST /api/v1/intake/cases/{case_id}/claim
POST /api/v1/intake/cases/{case_id}/reassign
```

Pre stvarnog produkcionog uključivanja treba završiti samo operativne ulaze, ne menjati domen:

1. Legal + Clinical + Product odobravaju dva stvarna teksta i njihove verzije.
2. Podešavaju se `INTAKE_DATA_PROCESSING_NOTICE_VERSION` i `INTAKE_REQUEST_ACKNOWLEDGEMENT_VERSION`, zatim odgovarajući frontend flagovi i backend flagovi.
3. Primeni se migracija, a za svakog člana tima kreiraju `InternalUser`, `OrganizationMembership` i veza terapeuta na `TherapistMatchingProfile.assigned_user_id`.
4. Backend dobija stvarni Clerk issuer, JWKS URL i, po potrebi, audience. Frontend metadata služi samo za prikaz; backend članstvo je autoritet za queue.
5. Infrastruktura raspoređuje postojeći retention purge posao. Scheduler, SLA za review i korisničke notifikacije nisu deo ovog slice-a.

Nedodeljeni red trenutno ima stvarnu listu i atomsko preuzimanje. Administrativni izbor ciljnog profila za `reassign` je već zaštićen API ugovorom; finalni selector dolazi kada se stvarni staff profili povežu sa Clerk identitetima.

## 2. Granice domena

- `GuidanceSession` je anoniman, kratak i bez imena/kontakta; napušten guidance ne kreira klijenta.
- `IntakeCase` nastaje tek uz kontakt, potrebne saglasnosti i zahtev za termin ili pregled tima.
- Matching daje kontrolisane preporuke i explanation codes; ne vraća interni score, chain-of-thought ni dijagnostičku procenu.
- Booking Engine je jedini vlasnik slotova, hold-ova, zahteva za termin i potvrđenih termina.
- Waitlist domen određuje redosled čekanja; Notification Engine samo šalje događaje; Reminder Scheduler podseća na nerešen zahtev.
- B2B se na prvom razdvajanju šalje u Company Configurator, nikada u therapist matching.
- Posetilac bez naloga (guest) može da pregleda javni sadržaj, koristi osnovni javni matching, pošalje upit ili zahtev za termin i prijavi interesovanje za javnu radionicu/program. Slanje zahteva ne znači potvrđen termin; prijava interesa ne znači potvrđeno mesto. Nalog se traži tek kada potvrđena usluga, uplata, zaštićen sadržaj ili lični prostor to zaista zahtevaju — Intake sam po sebi ne uvodi raniji zahtev za nalog.

Ne uvoditi `Client` ili termin "pacijent" samo zato što je korisnik završio upitnik.

### 2.1 Eligibility, uzrast i inkluzivnost (referenca na već implementiran tok)

Tabela ispod je čitljiv sažetak ponašanja koje §1.3/§1.4 već opisuju kao implementirano; ne uvodi novo pravilo.

| Put | Javno ponašanje | Implementirano stanje |
| --- | --- | --- |
| Odrasla osoba 18+ | šalje sopstveni zahtev | normalan Intake → Matching → team review tok, bez ograničenja slobodnog teksta |
| Roditelj/staratelj | traži podršku za sebe ili prijavljuje zahtev za dete | unosi svoj kontakt, uzrast deteta kao grupu (ne pun datum rođenja), svest/saglasnost deteta i status podnošenja |
| Adolescent 16–17 | ograničen, uzrasno prilagođen tok | bez slobodnog teksta, ide na kontrolisani team review (`controlledMinorFlow`) |
| Osoba mlađa od 16 | nema javni self-service izbor usluge, cene, terapeuta ili termina | sistem ne objavljuje javnu uslugu, cenu ni preporuku terapeuta; put završava informacijom ili team review-om do Legal + Clinical publish gate-a (§1.3) |
| Informativni posetilac | istražuje bez obaveze zakazivanja | `GuidanceSession` bez imena/kontakta; napušten guidance ne kreira `IntakeCase` |

Psihointegritet eksplicitno prima LGBTQIA+ osobe bez stigme. To nije posebna cena, usluga ili eligibility klasa. Intake i Matching:

- ne zahtevaju podatak o seksualnoj orijentaciji ili rodnom identitetu da bi osoba poslala zahtev;
- ne zaključuju identitet na osnovu izabrane teme, oblasti podrške ili slobodnog teksta;
- primenjuju iste `acceptanceStatus`, cene i request-first statuse bez diskriminatornog rutiranja;
- mogu ponuditi opciono neutralno polje „Kako želite da vam se obraćamo?" u javnom Intake toku;
- tretiraju LGBTQIA+ capability terapeuta (§6) kao dodatni signal relevantnosti, ne kao hard filter koji isključuje ostale relevantne terapeute ili usluge.

## 3. Modeli i privatnost

Implementirani modeli:

```text
GuidanceSession
IntakeCase
IntakeAnswer
IntakeContact
IntakeFreeText
IntakeAssignment
IntakeAssignmentEvent
ConsentRecord
TherapistMatchingProfile
IntakeAuditEvent
```

Javni tok modeluje `started -> completed -> recommendation_ready -> submitted -> expired`.
Timski tok modeluje `unassigned -> claimed -> booking_started -> converted -> closed`; `reassign` je auditovana promena vlasništva dok slučaj ostaje u statusu `claimed`.

Pre produkcijskog uključivanja Legal + Clinical + Product potvrđuju retention anonimnog toka i odbijenih zahteva, brisanje slobodnog teksta, audit minimum, pristup, brisanje na zahtev i lokalizovani safety/human-support tekst.

## 4. Deterministički adapter

`matching.ts` ostaje referenca za postojeća pravila i test paritet. UI prelazi na stabilan ugovor:

```ts
interface MatchingAdapter {
  evaluate(input: MatchingInput): MatchingResult;
}
```

Prvi adapter je backend-owned deterministički evaluator. `StaticMatchingAdapter` služi samo za test/paritet; `AiAssistedMatchingAdapter` je kasniji, odvojeni feature flag. `MatchingResult` vraća service/therapist ID-jeve, explanation codes, `requiresHumanReview`, `controlledMinorFlow` i `ruleVersion`.

## 5. Timski red i konkurentnost

Timski red pokazuje samo minimum: vreme zahteva, uslugu, format, lokaciju, starosnu grupu, preporuke, neobavezujuću preferenciju terapeuta, oznaku da je potreban pregled tima i postojanje slobodnog teksta. Ne izlaže kontakt ni sam slobodan tekst.

`Claim` je atomska serverska mutacija. Jedan terapeut dobija slučaj; drugi dobija konfliktni odgovor i osvežava red, bez otkrivanja dodatnih podataka. `Reassign` zahteva dozvolu, novog terapeuta, razlog i neizmenjiv `IntakeAssignmentEvent` sa prethodnim i novim vlasnikom.

Superadmin ostaje metadata/health-first i nema podrazumevan pristup slobodnom tekstu.

## 6. Preference, kapacitet i flagovi

`TherapistMatchingProfile` je interni profil, odvojen od javne biografije. Sadrži usluge, capability-je, uzrast, formate, lokacije, `acceptanceStatus`, `presenceStatus`, datum povratka, preference, isključenja, soft capacity i matching prioritet.

LGBTQIA+ podrška može biti capability tek kada je terapeut eksplicitno potvrdi; to je dodatni rangirajući signal kao i druge capability-je iz §6, nikad hard filter koji ostale relevantne terapeute ili usluge proglašava nedostupnim.

Intake čita `CapacityAdapter`; prvi adapter je statički, a kasniji `BookingCapacityAdapter` čita samo sažetak dostupnosti. Intake nikada ne čita slot tabele, kalendare ni buffere direktno.

`intake_matching_preview` ostaje staging/demo flag. Produkcijski flagovi su odvojeni:

```text
intake_matching_enabled
intake_sensitive_submission_enabled
intake_team_queue_enabled
intake_ai_assist_enabled
intake_data_processing_notice_version
intake_request_acknowledgement_version
```

Osetljivo slanje je efektivno isključeno dok su `intake_sensitive_submission_enabled` ili bilo koja od dve verzije teksta prazni. Frontend koristi isti princip samo za prikaz; backend je krajnji autoritet.

## 7. AI assist je kasniji slice

AI može strukturisati opcion tekst kroz allowlist kategorija i schema validaciju, ali nikada ne postavlja dijagnozu, ne zaobilazi hard constraint, ne potvrđuje terapeuta/termin, ne menja preference i ne izlaže skriveno rezonovanje.

Interni confidence signal nije risk kategorija, ne prikazuje se klijentu i ne sme sam odlučiti o pristupu podršci. Bez eksplicitne saglasnosti i posebnog flaga, tok ide deterministički ili na team review.

## 8. Implementacioni redosled

1. **IM-1 Intake Core:** završeno — FastAPI modeli/migracija, state machine, consents, retention granice, API i generisani TypeScript client.
2. **IM-2 Deterministički engine:** završeno — backend adapter, rule versioning, explanation codes, fallback i testovi hard constraints.
3. **IM-3 Team Queue:** završeno za osnovni vertikalni slice — nedodeljeni slučajevi, atomic claim, reassign endpoint, assignment history, RBAC i Control Center prikaz bez osetljivog sadržaja.
4. **IM-4 Therapist configuration:** delimično — statički profil, capacity adapter i flagovi postoje; administrativni editor dolazi nakon povezivanja stvarnih staff profila.
5. **IM-5 Client status:** naredni Intake slice — poslati zahtevi i status bez anamneze ili osetljivih dokumenata; booking detalji dolaze uz R2.
6. **IM-6 AI assist:** kasnije, samo posle privacy/consent odluke, sa fallback-om i bezbednosnim testovima.

Svaki slice ide vertikalno: DB model -> FastAPI endpoint -> generated client -> React Query hook -> panel -> mutacija -> testovi. Ne graditi ceo backend pa panel naknadno.

## 9. Pre-R2 i R2 granica

Pre-R2 mora definisati review SLA, remindere, escalation, istek, post-submission slot dostupnost, Notify Me redosled, offer TTL, notification dedupe i atomic claim. Preporučeni Notify Me default je sekvencijalna privatna ponuda; broadcast first-claim ostaje buduća tenant opcija.

R2 zatim implementira Booking Core i reusable internal Booking Widget kao headless domen + flow controller + renderer + surface adapter. Booking preuzima već rešene requester role, uzrasnu grupu, `requiresHumanReview`/`controlledMinorFlow` i eligibility odluke iz Intake-a; ne rekonstruiše ih iz UI-ja. Eksterni iframe/SDK nije deo prvog R2 slice-a. Packages, krediti, pretplate, plaćanja i refundacije pripadaju R5.
