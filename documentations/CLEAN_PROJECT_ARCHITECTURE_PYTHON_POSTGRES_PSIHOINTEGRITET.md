# PSIHOintegritet SaaS platforma

## Arhitektonske granice, backend standardi i multi-tenant infrastruktura

```yaml
document:
  name: PSIHOintegritet SaaS Architecture
  version: "0.2"
  status: architecture-baseline
  date: "2026-08-01"
  language: sr-Latn
  backend: Python FastAPI
  database: PostgreSQL
  architecture: Modular Monolith
  tenancy: Shared Database with PostgreSQL RLS
```

---

# 1. Svrha dokumenta

Ovaj dokument definiše obaveznu tehničku arhitekturu za razvoj Psihointegritet platforme i njen budući razvoj u multi-tenant SaaS proizvod.

Dokument obuhvata:

* Python FastAPI backend;
* PostgreSQL bazu podataka;
* PostgreSQL Row-Level Security;
* multi-tenant izolaciju;
* Clerk autentifikaciju;
* role i permission model;
* CMS i upravljanje sadržajem;
* terapeute i profile terapeuta;
* Kompas i preporuke sadržaja;
* request-first rezervaciju termina;
* rad sa kompanijama;
* saglasnosti i maloletna lica;
* Redis;
* Upstash QStash;
* Resend email sistem;
* dijagnostičke provere;
* audit logove;
* AI asistivne funkcionalnosti;
* razdvajanje production, staging, feature i test okruženja;
* CI/CD standarde;
* pravila za skaliranje platforme.

Ovaj dokument predstavlja arhitektonski autoritet za backend i infrastrukturu, osim kada je određena oblast detaljnije uređena posebnim ADR dokumentom.

Kada postoji konflikt između ovog dokumenta i usvojenog ADR-a, ADR ima prednost.

---

# 2. Kontekst proizvoda

Psihointegritet se razvija kao digitalni centar za mentalno zdravlje na srpskom jeziku, sa mogućnošću kasnijeg širenja na druge organizacije, centre i terapeutske timove.

Prvi tenant platforme je organizacija Psihointegritet.

Platforma nije projektovana samo kao jedan statični sajt. Ona mora postepeno da podrži:

* javni sajt;
* CMS;
* profile terapeuta;
* oblasti podrške;
* sadržaj za odrasle;
* sadržaj za roditelje;
* sadržaj za adolescente;
* rad sa kompanijama;
* kontakt forme;
* zahteve za termin;
* Kompas;
* personalizovane preporuke sadržaja;
* programe i radionice;
* klijentske naloge;
* terapeutske naloge;
* administratorski panel;
* organizacije sa više terapeuta;
* više tenant-a;
* buduće SaaS pakete i pretplate.

Arhitektura mora omogućiti ovaj razvoj bez ponovnog pisanja osnovnog sistema.

---

# 3. Arhitektonski principi

## 3.1 Modularni monolit

Backend se razvija kao modularni monolit.

To znači:

* jedna glavna FastAPI aplikacija;
* jedan deployment backend servisa u početnim fazama;
* jedna PostgreSQL baza po okruženju;
* jasno odvojeni poslovni domeni;
* stroge granice između domena;
* bez direktnog deljenja internih ORM modela između domena;
* bez kružnih import-a;
* mogućnost kasnijeg izdvajanja pojedinih modula u posebne servise.

Modularni monolit je izabran zato što pruža:

* jednostavniji deployment;
* lakše transakcije;
* manje infrastrukturne složenosti;
* brži razvoj prve verzije;
* lakše održavanje;
* dovoljno jasne granice za kasnije skaliranje.

Mikroservisi nisu početna arhitektura.

Modul se izdvaja u poseban servis tek kada za to postoji konkretan razlog, kao što su:

* nezavisno skaliranje;
* nezavisan release ciklus;
* poseban bezbednosni nivo;
* veoma veliki broj pozadinskih poslova;
* poseban tim koji održava domen;
* infrastrukturno ograničenje modularnog monolita.

---

## 3.2 Domain-Driven Design granice

Kod se organizuje prema poslovnim domenima, a ne prema generičkim tehničkim kategorijama.

Ne sme postojati jedan globalni direktorijum sa svim:

* modelima;
* servisima;
* šemama;
* repository klasama;
* rutama.

Svaki domen mora posedovati sopstvene:

* modele;
* poslovna pravila;
* servise;
* API šeme;
* repository implementacije;
* događaje;
* testove.

---

## 3.3 PostgreSQL je autoritet za trajno stanje

PostgreSQL je jedini autoritativni izvor trajnog poslovnog stanja.

Redis, QStash, frontend cache i memorija procesa ne predstavljaju autoritet za:

* rezervacije;
* korisničke dozvole;
* objavljeni sadržaj;
* saglasnosti;
* tenant članstvo;
* status zahteva;
* finansijske podatke;
* audit podatke.

Redis može ubrzati sistem, ali ne sme biti jedino mesto na kome postoji poslovno važan podatak.

---

## 3.4 Bezbednost po dizajnu

Izolacija tenant-a ne sme zavisiti samo od toga da li je programer dodao:

```python
.where(Model.tenant_id == tenant_id)
```

PostgreSQL Row-Level Security predstavlja dodatnu obaveznu zaštitu na nivou baze.

Aplikacija i dalje treba eksplicitno da filtrira i validira tenant kontekst, ali greška u jednom SQLAlchemy upitu ne sme automatski dovesti do curenja podataka drugog tenant-a.

---

## 3.5 Eksplicitnost ispred skrivene automatizacije

Kritične odluke moraju biti vidljive u:

* kodu;
* migracijama;
* ADR dokumentima;
* testovima;
* konfiguraciji.

Zabranjeno je oslanjanje na skrivenu automatsku logiku koja menja bazu bez eksplicitnog migracionog zapisa.

Posebno:

* RLS pravila se definišu u Alembic migracijama;
* statusi se definišu u jednom kanonskom registru;
* dozvole se definišu u permission registru;
* background job mora imati eksplicitnu idempotency strategiju;
* AI model se bira kroz konfiguraciju, a ne hardkodovanjem kroz poslovni kod.

---

# 4. Tehnološki stack

## 4.1 Frontend

* Next.js;
* React;
* TypeScript;
* Tailwind CSS;
* React Query;
* Zod;
* OpenAPI generisani TypeScript klijent;
* Clerk frontend SDK;
* Vercel deployment.

Frontend ne pristupa direktno PostgreSQL bazi.

Frontend komunicira sa backendom isključivo preko FastAPI HTTP API-ja.

---

## 4.2 Backend

* Python 3.12 ili noviji podržani runtime;
* FastAPI;
* Pydantic v2;
* SQLAlchemy 2.x;
* asyncpg;
* Alembic;
* HTTPX;
* structlog ili standardizovani JSON logging adapter;
* pytest;
* pytest-asyncio;
* mypy strict;
* Ruff.

Sve verzije biblioteka moraju biti eksplicitno zaključane kroz dependency lock fajl.

Automatsko korišćenje najnovije verzije biblioteke bez verifikacije nije dozvoljeno.

---

## 4.3 Baza podataka

* PostgreSQL 16 ili novija kompatibilna verzija;
* Railway PostgreSQL;
* UUID primarni ključevi;
* `timestamptz` za datume i vreme;
* JSONB samo za opravdane fleksibilne strukture;
* pgvector kao opciona ekstenzija za kasnije semantičko pretraživanje;
* Row-Level Security za tenant tabele;
* Alembic za sve promene šeme.

SQLite se ne koristi za integracione testove poslovne logike koja zavisi od PostgreSQL funkcionalnosti.

---

## 4.4 Cache i kratkotrajno stanje

* Railway Redis;
* asinhroni `redis.asyncio` klijent;
* cache;
* rate limiting;
* kratkotrajni idempotency podaci;
* distribuirani lock samo kao optimizacija;
* invalidacija cache-a posle uspešne transakcije.

Redis nije autoritet za konačnu potvrdu rezervacije.

---

## 4.5 Zakazani i retry poslovi

* Upstash QStash;
* potpisani webhook zahtevi;
* retry;
* odloženi poslovi;
* zakazana obaveštenja;
* obrada transactional outbox događaja;
* periodične dijagnostičke provere.

Svaki QStash handler mora biti:

* autentifikovan;
* idempotentan;
* tenant-aware;
* bezbedan za ponovljeno izvršavanje.

---

## 4.6 Autentifikacija

* Clerk;
* odvojene Clerk konfiguracije za development, staging i production;
* verifikacija tokena preko Clerk javnih ključeva;
* kratkotrajni Bearer token za FastAPI API;
* server-side provera tenant članstva;
* server-side provera dozvola.

Custom HS256 JWT sistem nije primarni autentifikacioni sistem platforme.

Backend ne sme verovati proizvoljnom `tenant_id` koji frontend pošalje kroz:

* request body;
* query parametar;
* `X-Tenant-Id` header;
* lokalno skladište;
* URL bez dodatne validacije.

---

## 4.7 Email

* Resend za slanje sistemskih email poruka;
* Zoho Mail za poslovni inbox;
* webhook obrada statusa isporuke;
* retry preko QStash-a;
* idempotency ključevi;
* template verzionisanje;
* minimalno uključivanje osetljivih podataka u email.

Email subject ne treba da sadrži detalje o mentalnom zdravlju korisnika.

---

## 4.8 Deployment

* Vercel za frontend;
* Railway za FastAPI backend;
* Railway PostgreSQL;
* Railway Redis;
* Upstash QStash;
* Resend;
* Clerk;
* Zoho Mail.

Početna arhitektura koristi jedan FastAPI servis po okruženju.

Kasnije se mogu izdvojiti:

* worker servis;
* AI worker;
* media processor;
* search servis;
* notification worker.

---

# 5. Okruženja

Platforma mora imati najmanje sledeća logička okruženja:

1. local development;
2. automated test;
3. feature ili preview;
4. staging;
5. production.

## 5.1 Obavezno razdvajanje podataka

Production baza se nikada ne koristi za:

* lokalni razvoj;
* automatske testove;
* feature grane;
* Vercel preview deployment;
* staging.

Svako okruženje mora imati odvojene:

* PostgreSQL baze;
* Redis instance ili strogo odvojene Redis namespace-ove;
* Clerk ključeve;
* QStash konfiguraciju;
* Resend konfiguraciju;
* API URL-ove;
* secrets;
* webhook potpise;
* podatke.

Preporučena struktura:

| Okruženje  | Frontend         | Backend            | PostgreSQL            | Redis            |
| ---------- | ---------------- | ------------------ | --------------------- | ---------------- |
| Local      | localhost        | localhost          | local/test DB         | local Redis      |
| Test       | CI runner        | CI runner          | privremeni PostgreSQL | privremeni Redis |
| Feature    | Vercel preview   | feature backend    | feature DB            | feature Redis    |
| Staging    | staging domen    | staging Railway    | staging DB            | staging Redis    |
| Production | production domen | production Railway | production DB         | production Redis |

Vercel preview deployment ne sme automatski dobijati production backend URL.

---

# 6. Predložena struktura backend projekta

```text
app/
├── main.py
├── bootstrap/
│   ├── application.py
│   ├── lifespan.py
│   └── routers.py
│
├── core/
│   ├── config.py
│   ├── database.py
│   ├── redis.py
│   ├── auth.py
│   ├── tenancy.py
│   ├── permissions.py
│   ├── errors.py
│   ├── logging.py
│   ├── telemetry.py
│   ├── idempotency.py
│   ├── pagination.py
│   └── security.py
│
├── shared/
│   ├── types.py
│   ├── enums.py
│   ├── events.py
│   ├── clock.py
│   └── protocols.py
│
├── domains/
│   ├── tenants/
│   ├── identity_access/
│   ├── therapist_directory/
│   ├── support_catalog/
│   ├── cms/
│   ├── legal_consent/
│   ├── contact/
│   ├── booking/
│   ├── compass/
│   ├── organizations/
│   ├── communications/
│   ├── notifications/
│   ├── diagnostics/
│   ├── search/
│   ├── ai_assist/
│   └── audit/
│
├── infrastructure/
│   ├── outbox/
│   ├── qstash/
│   ├── resend/
│   ├── clerk/
│   ├── storage/
│   └── observability/
│
└── workers/
    ├── routes.py
    ├── handlers.py
    └── scheduler.py

migrations/
├── env.py
├── script.py.mako
└── versions/

tests/
├── unit/
├── integration/
├── api/
├── security/
├── tenancy/
├── migrations/
└── e2e/
```

---

# 7. Standardna struktura jednog domena

Svaki veći domen koristi sledeću internu strukturu:

```text
domains/booking/
├── api/
│   ├── router.py
│   ├── schemas.py
│   └── dependencies.py
│
├── domain/
│   ├── entities.py
│   ├── enums.py
│   ├── events.py
│   ├── errors.py
│   └── policies.py
│
├── application/
│   ├── commands.py
│   ├── queries.py
│   ├── services.py
│   └── ports.py
│
├── infrastructure/
│   ├── models.py
│   ├── repository.py
│   └── mappers.py
│
└── tests/
```

Za jednostavne domene dozvoljena je sažetija struktura:

```text
domains/contact/
├── router.py
├── schemas.py
├── models.py
├── repository.py
├── service.py
└── tests/
```

Struktura se ne komplikuje bez potrebe, ali granice između:

* API-ja;
* poslovne logike;
* baze;
* spoljnog provajdera

moraju ostati jasne.

---

# 8. Poslovni domeni

## 8.1 Tenants

Domen `tenants` upravlja SaaS organizacijama.

Odgovornosti:

* kreiranje tenant-a;
* tenant status;
* tenant konfiguracija;
* tenant domeni;
* tenant branding;
* feature flags;
* subscription plan;
* tenant timezone;
* tenant locale;
* politika čuvanja podataka;
* dozvoljene funkcionalnosti.

Primer tabela:

```text
tenants
tenant_domains
tenant_settings
tenant_features
tenant_branding
tenant_subscriptions
```

`tenants` je globalna tabela i nema `tenant_id`.

`tenant_domains` je globalna tabela zato što služi za pronalaženje tenant-a pre nego što tenant kontekst postoji.

---

## 8.2 Identity and Access

Domen `identity_access` povezuje Clerk identitet sa internim korisnikom i članstvom u tenant-u.

Odgovornosti:

* interna reprezentacija korisnika;
* Clerk user ID mapiranje;
* tenant membership;
* role;
* permissions;
* membership status;
* pozivi u organizaciju;
* deaktivacija pristupa;
* audit promena dozvola.

Primer tabela:

```text
users
tenant_memberships
tenant_invitations
role_definitions
permission_definitions
membership_permission_overrides
```

Jedan korisnik može biti član više tenant-a.

Clerk identitet nije isto što i tenant članstvo.

Činjenica da korisnik ima validan Clerk nalog ne znači da ima pristup određenom tenant-u.

---

## 8.3 Therapist Directory

Domen `therapist_directory` upravlja javnim i internim podacima terapeuta.

Odgovornosti:

* profil terapeuta;
* biografija;
* oblasti rada;
* jezici;
* lokacije;
* online ili uživo rad;
* usluge;
* okvirne cene;
* dostupnost za nove zahteve;
* status objavljivanja;
* profesionalne kvalifikacije;
* redosled prikaza.

Primer tabela:

```text
therapists
therapist_profiles
therapist_locations
therapist_languages
therapist_support_topics
therapist_service_offerings
therapist_media
therapist_publication_settings
```

Javni profil terapeuta ne sme direktno izlagati interni ORM model.

---

## 8.4 Support Catalog

Domen `support_catalog` predstavlja kanonski katalog oblasti podrške.

Primeri oblasti:

* stres i preopterećenost;
* odnosi i bliskost;
* anksioznost;
* samopouzdanje;
* roditeljstvo;
* adolescenti;
* životne promene;
* emocionalna podrška;
* partnerski odnosi;
* lični razvoj;
* burnout;
* komunikacija;
* porodični odnosi.

Domen sadrži:

```text
support_topics
support_topic_relations
support_topic_groups
support_topic_aliases
support_topic_content_links
support_topic_therapist_links
```

`support_topic_relations` omogućava povezivanje tema.

Na primer:

```text
stres-i-preopterecenost -> može-biti-povezano-sa -> burnout
burnout -> može-uticati-na -> odnosi-i-bliskost
odnosi-i-bliskost -> može-biti-povezano-sa -> komunikacija
```

Ova struktura omogućava da Kompas ne prikazuje sve informacije kao jednu pretrpanu stranicu, već da sastavi rezultat od više jasno odvojenih sekcija.

---

## 8.5 CMS

Domen `cms` upravlja:

* stranicama;
* sekcijama;
* blokovima;
* člancima;
* programima;
* radionicama;
* videom;
* PDF materijalima;
* preporučenim knjigama;
* kategorijama;
* oznakama;
* autorima;
* revizijama;
* objavljivanjem;
* povlačenjem sadržaja.

Primer tabela:

```text
cms_entries
cms_entry_revisions
cms_publications
cms_blocks
cms_categories
cms_tags
cms_entry_tags
cms_authors
cms_media_links
cms_review_findings
```

CMS lifecycle mora koristiti kanonski status model definisan ADR-om D-029.

Ovaj dokument ne uvodi dodatne lifecycle statuse.

Posebno:

* `validation_failed` nije CMS status;
* `review_required` nije CMS status;
* neuspešna validacija predstavlja rezultat provere;
* potreba za review-om predstavlja nalaz ili zahtevanu capability;
* statusi se ne dupliraju u različitim domenima.

Severity nalaza koristi kanonske vrednosti iz ADR-a D-032:

```text
info
warning
error
```

Izvedene klase kao što su:

```text
BLOCK
REVIEW_REQUIRED
PASSED
```

predstavljaju interpretaciju rezultata, a ne novi severity enum.

---

## 8.6 Legal and Consent

Domen `legal_consent` upravlja:

* politikom privatnosti;
* uslovima korišćenja;
* saglasnostima;
* verzijama pravnih dokumenata;
* dokazom prihvatanja;
* roditeljskim ili starateljskim odnosom;
* povlačenjem saglasnosti;
* politikama obrade podataka.

Primer tabela:

```text
legal_documents
legal_document_versions
legal_publications
consent_templates
consent_records
consent_withdrawals
guardian_relationships
data_processing_purposes
```

Saglasnost mora biti vezana za tačnu verziju dokumenta.

`consent_records` je append-only zapis.

Postojeći zapis saglasnosti se ne menja kada se objavi nova verzija dokumenta.

Nova verzija dokumenta zahteva novi zapis saglasnosti kada je to poslovno ili pravno potrebno.

---

## 8.7 Contact

Domen `contact` upravlja javnim upitima.

Vrste upita:

* opšti kontakt;
* zahtev za termin;
* upit kompanije;
* pitanje roditelja;
* prijava za program ili radionicu;
* zahtev za dodatne informacije.

Primer tabela:

```text
contact_inquiries
contact_inquiry_messages
contact_inquiry_status_history
contact_inquiry_assignments
```

Kontakt forma mora prikupljati samo podatke potrebne za konkretan tok.

Nije dozvoljeno tražiti detaljne i nepotrebne zdravstvene podatke kroz javnu kontakt formu.

---

## 8.8 Booking

Domen `booking` upravlja zahtevima i kasnijim terminima.

Prva faza koristi request-first model.

Korisnik ne bira automatski potvrđen slobodan slot.

Tok prve faze:

1. korisnik šalje zahtev;
2. zahtev se vezuje za tenant;
3. zahtev se dodeljuje terapeutu ili administratoru;
4. terapeut pregleda zahtev;
5. terapeut potvrđuje termin ili predlaže alternativu;
6. korisnik prihvata alternativu kada je potrebno;
7. sistem šalje potvrdu;
8. termin se evidentira.

Primer tabela:

```text
booking_requests
booking_request_preferences
booking_request_assignments
booking_proposals
appointments
appointment_participants
appointment_status_history
appointment_notifications
```

Alternativni termin treba modelovati kao poseban `booking_proposal`, a ne nužno kao novi status zahteva.

Tačan booking lifecycle mora postojati u jednom kanonskom registru.

---

## 8.9 Compass

Domen `compass` upravlja strukturisanim tokom usmeravanja korisnika ka relevantnoj podršci i sadržaju.

Kompas nije dijagnostički alat.

Kompas ne postavlja medicinske ili psihološke dijagnoze.

Kompas koristi:

* pitanja;
* odgovore;
* teme;
* pravila;
* relacije između tema;
* uređivački odobren sadržaj;
* terapeutske oblasti rada;
* programske preporuke.

Primer tabela:

```text
compass_flows
compass_flow_versions
compass_questions
compass_answer_options
compass_rules
compass_sessions
compass_session_answers
compass_result_sets
compass_result_sections
compass_result_items
```

Rezultat Kompasa mora biti sastavljen od više sekcija.

Primer:

```text
Rezultat
├── Glavna tema: stres i preopterećenost
│   ├── objašnjenje
│   ├── preporučeni tekstovi
│   └── preporučeni video
│
├── Povezana tema: burnout
│   ├── kako je povezana sa stresom
│   ├── preporučeni materijali
│   └── kada razmotriti podršku
│
├── Uticaj na odnose i bliskost
│   ├── urednički odobreno objašnjenje
│   └── povezani sadržaj
│
├── Predlog narednih koraka
│
└── Terapeuti koji rade sa ovim oblastima
```

Kompas rezultat ne sme biti jedan generički AI tekst.

Sastavljanje rezultata mora biti determinističko i zasnovano na verzionisanim pravilima.

AI kasnije može pomoći uredniku u:

* označavanju sadržaja;
* predlaganju relacija;
* predlaganju sažetaka;
* klasifikaciji tema.

AI predlog ne postaje automatski objavljen sadržaj.

---

## 8.10 Organizations

Domen `organizations` upravlja radom sa kompanijama i drugim organizacijama.

Početna faza:

* upit kompanije;
* kontakt osoba;
* oblast interesovanja;
* broj zaposlenih kao okvirni podatak;
* vrsta programa;
* uvodni konsultativni sastanak;
* interni status upita.

Kasnije:

* kompanijski ugovori;
* programi za zaposlene;
* rezervisani kapaciteti;
* prioritetni termini;
* benefit paketi;
* radionice;
* izveštavanje na agregatnom nivou.

Primer tabela:

```text
organizations
organization_contacts
organization_inquiries
organization_programs
organization_agreements
organization_eligibility_rules
organization_benefit_tokens
organization_aggregate_reports
```

Poslodavac ne sme dobijati pristup individualnim detaljima razgovora zaposlenog.

Izveštaji za kompanije moraju biti:

* agregirani;
* minimalni;
* bez identifikovanja pojedinca;
* usklađeni sa ugovorom i saglasnostima.

---

## 8.11 Communications and Notifications

Domeni `communications` i `notifications` upravljaju:

* email porukama;
* sistemskim obaveštenjima;
* template-ima;
* statusima isporuke;
* retry pokušajima;
* zakazanim podsetnicima;
* internim notifikacijama;
* komunikacijom u vezi zahteva za termin.

Primer tabela:

```text
message_templates
message_template_versions
outbound_messages
message_deliveries
notification_preferences
scheduled_notifications
notification_attempts
```

Poruke moraju biti generisane iz verzionisanih template-a.

Slanje email-a se ne izvršava unutar glavne DB transakcije.

Glavna transakcija upisuje outbox događaj, a poseban handler šalje email nakon uspešnog commit-a.

---

## 8.12 Diagnostics

Domen `diagnostics` sadrži read-only sistemske provere.

Dijagnostička provera:

* čita podatke;
* detektuje anomaliju;
* zapisuje nalaz;
* predlaže postupak popravke;
* ne menja automatski poslovne podatke.

Primeri provera:

* tenant tabela bez aktivnog RLS-a;
* zapis bez tenant-a;
* cross-tenant relacija;
* objavljena stranica bez aktivne revizije;
* rezervacija bez status istorije;
* saglasnost bez verzije dokumenta;
* terapeut povezan sa obrisanom temom;
* neuspešno slanje email-a bez retry zapisa;
* QStash posao bez idempotency ključa;
* objavljeni Kompas rezultat koji referencira neobjavljen sadržaj.

Ako se provera ne može izvršiti, rezultat mora biti:

```text
failed
```

Nije dozvoljeno prijaviti nula anomalija kada provera nije uspešno izvršena.

---

## 8.13 Audit

Domen `audit` beleži bezbednosno i poslovno značajne događaje.

Primeri:

* promena role;
* promena permissions;
* objavljivanje sadržaja;
* povlačenje sadržaja;
* promena zahteva za termin;
* pristup osetljivom zapisu;
* izvoz podataka;
* promena saglasnosti;
* deaktivacija korisnika;
* promena tenant konfiguracije;
* platform admin operacija.

Primer tabele:

```text
audit_events
```

Audit događaj sadrži najmanje:

```text
id
tenant_id
actor_id
actor_type
action
resource_type
resource_id
occurred_at
request_id
metadata
```

Audit log ne sme sadržati:

* access token;
* refresh token;
* kompletnu email poruku;
* detaljne privatne beleške;
* nefiltriran request body;
* lozinku;
* API secret.

---

# 9. Klasifikacija tabela

Sve tabele moraju biti klasifikovane kao:

1. globalne;
2. tenant-bound;
3. operativne;
4. audit;
5. privremene.

## 9.1 Globalne tabele

Globalne tabele postoje na nivou platforme.

Primeri:

```text
tenants
tenant_domains
users
platform_feature_definitions
permission_definitions
global_country_catalog
```

Globalne tabele ne nasleđuju tenant bazni model.

---

## 9.2 Tenant-bound tabele

Tenant-bound tabela sadrži:

```text
tenant_id UUID NOT NULL
```

Primeri:

```text
cms_entries
therapists
booking_requests
appointments
contact_inquiries
legal_documents
compass_sessions
organizations
```

Nad tenant tabelama mora biti aktiviran RLS.

---

## 9.3 Operativne tabele

Operativne tabele služe infrastrukturi.

Primeri:

```text
outbox_events
idempotency_keys
scheduled_jobs
webhook_deliveries
diagnostic_runs
```

Ako operativni zapis pripada tenant-u, mora sadržati `tenant_id` i koristiti RLS.

---

# 10. Standardni SQLAlchemy modeli

## 10.1 Osnovni model

```python
from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, MetaData, Uuid, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


NAMING_CONVENTION = {
    "ix": "ix_%(table_name)s_%(column_0_name)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class TenantMixin:
    tenant_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        nullable=False,
        index=True,
    )
```

`tenant_id` se postavlja eksplicitno iz pouzdanog server-side tenant konteksta.

Ne preporučuje se skriveni `server_default` za `tenant_id`, zato što može sakriti grešku u poslovnoj logici.

RLS `WITH CHECK` pravilo predstavlja poslednju zaštitu od pogrešnog tenant upisa.

---

## 10.2 Primer tenant modela

```python
from uuid import UUID

from sqlalchemy import String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, TenantMixin, TimestampMixin


class Therapist(Base, TenantMixin, TimestampMixin):
    __tablename__ = "therapists"

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
    )

    public_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    slug: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
```

Tenant jedinstveni constraint mora uključiti `tenant_id`.

Primer:

```python
from sqlalchemy import UniqueConstraint

__table_args__ = (
    UniqueConstraint(
        "tenant_id",
        "slug",
        name="uq_therapists_tenant_slug",
    ),
)
```

---

# 11. Cross-tenant foreign key zaštita

Samo RLS nije dovoljan da spreči svaku pogrešnu relaciju.

Tenant relacije treba, gde je opravdano, dodatno zaštititi kompozitnim ključevima.

Primer:

```sql
ALTER TABLE therapists
ADD CONSTRAINT uq_therapists_tenant_id_id
UNIQUE (tenant_id, id);
```

Tabela usluge može zatim imati:

```sql
FOREIGN KEY (tenant_id, therapist_id)
REFERENCES therapists (tenant_id, id);
```

Na ovaj način nije moguće da zapis tenant-a A referencira terapeuta tenant-a B, čak ni ako aplikaciona logika napravi grešku.

---

# 12. Tenant rezolucija

Tenant kontekst zavisi od vrste zahteva.

Postoje četiri osnovna režima:

1. javni zahtev;
2. autentifikovani tenant zahtev;
3. background job;
4. platform administracija.

---

## 12.1 Javni zahtev

Primeri:

* javna početna stranica;
* javni profil terapeuta;
* javni članak;
* javni kontakt;
* javni zahtev za termin;
* javni Kompas.

Tenant se pronalazi iz:

* hostname-a;
* custom domena;
* tenant subdomain-a;
* server-side route konfiguracije.

Primer:

```text
psihointegritet.rs
www.psihointegritet.rs
staging.psihointegritet.rs
```

Backend prvo izvršava globalni lookup u `tenant_domains`, a zatim postavlja tenant kontekst.

Frontend ne određuje tenant slanjem proizvoljnog UUID-a.

---

## 12.2 Autentifikovani zahtev

Tok:

1. backend verifikuje Clerk token;
2. dobija interni `user_id`;
3. identifikuje traženi tenant kroz pouzdanu rutu ili server-side kontekst;
4. proverava aktivno tenant članstvo;
5. izračunava role i permissions;
6. formira `RequestContext`;
7. otvara RLS transakciju.

---

## 12.3 Background job

Svaki background job mora sadržati:

* `tenant_id`;
* tip posla;
* resource ID;
* idempotency key;
* verziju payload-a;
* correlation ID.

Worker:

1. proverava QStash potpis;
2. validira payload;
3. proverava idempotency;
4. postavlja tenant kontekst;
5. izvršava posao unutar RLS transakcije;
6. zapisuje rezultat;
7. potvrđuje uspeh.

---

## 12.4 Platform administracija

Platform administrator ne koristi običan tenant endpoint za cross-tenant pretragu.

Platform operacije moraju biti:

* posebno autorizovane;
* posebno auditovane;
* ograničene;
* eksplicitne;
* bez automatskog DB `BYPASSRLS` pristupa u regularnom runtime procesu.

Kada platform administrator radi nad jednim tenant-om, sistem treba da postavi taj tenant kontekst i koristi iste RLS granice.

Cross-tenant izveštaji moraju koristiti posebno projektovan i auditovan servis.

---

# 13. RequestContext

Autentifikacija, tenant i dozvole objedinjeni su u tipizovani kontekst zahteva.

```python
from dataclasses import dataclass
from enum import StrEnum
from uuid import UUID


class ActorType(StrEnum):
    ANONYMOUS = "anonymous"
    USER = "user"
    WORKER = "worker"
    PLATFORM_ADMIN = "platform_admin"


@dataclass(frozen=True, slots=True)
class RequestContext:
    request_id: UUID
    tenant_id: UUID
    actor_type: ActorType
    actor_id: UUID | None
    membership_id: UUID | None
    role: str | None
    permissions: frozenset[str]
```

`RequestContext` se prosleđuje servisima ili dependency sloju.

`ContextVar` se može koristiti za:

* request ID;
* strukturisani logging;
* trace podatke.

`ContextVar` ne treba da bude jedini izvor bezbednosnog autoriteta.

---

# 14. FastAPI request pipeline

Globalni middleware koji zahteva Bearer token za svaku rutu nije odgovarajući za Psihointegritet zato što platforma ima javne stranice i forme.

Umesto jednog blanket middleware-a koriste se odvojene dependency grupe.

## 14.1 Javni tenant dependency

```python
from fastapi import Depends, Request

from app.core.tenancy import PublicTenantResolver
from app.shared.context import RequestContext


async def get_public_context(
    request: Request,
    resolver: PublicTenantResolver = Depends(),
) -> RequestContext:
    return await resolver.resolve_from_host(
        hostname=request.url.hostname,
        request_headers=request.headers,
    )
```

---

## 14.2 Autentifikovani tenant dependency

```python
from fastapi import Depends, Request

from app.core.auth import ClerkAuthenticator
from app.core.tenancy import MembershipResolver
from app.shared.context import RequestContext


async def get_member_context(
    request: Request,
    authenticator: ClerkAuthenticator = Depends(),
    membership_resolver: MembershipResolver = Depends(),
) -> RequestContext:
    identity = await authenticator.authenticate(request)

    return await membership_resolver.resolve(
        identity=identity,
        request=request,
    )
```

---

## 14.3 Permission dependency

```python
from collections.abc import Callable
from fastapi import Depends, HTTPException, status

from app.shared.context import RequestContext


def require_permission(
    permission: str,
) -> Callable[..., RequestContext]:
    async def dependency(
        context: RequestContext = Depends(get_member_context),
    ) -> RequestContext:
        if permission not in context.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Nemate dozvolu za ovu operaciju.",
            )

        return context

    return dependency
```

Primer:

```python
@router.post("/cms/entries")
async def create_entry(
    payload: EntryCreate,
    context: RequestContext = Depends(
        require_permission("cms.entry.create")
    ),
) -> EntryResponse:
    ...
```

---

# 15. SQLAlchemy asinhrona sesija i RLS

## 15.1 Engine

```python
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings


engine: AsyncEngine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
)

SessionFactory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)
```

Pool vrednosti moraju biti prilagođene Railway connection limitu.

Ne sme se nekritički koristiti veliki pool samo zato što aplikacija podržava asinhroni rad.

---

## 15.2 Tenant transakcija

`SET LOCAL` mora biti izvršen unutar aktivne transakcije.

Preporučena implementacija koristi `set_config`.

```python
from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import SessionFactory
from app.shared.context import RequestContext


async def tenant_session(
    context: RequestContext,
) -> AsyncGenerator[AsyncSession, None]:
    async with SessionFactory() as session:
        async with session.begin():
            await session.execute(
                text(
                    """
                    SELECT set_config(
                        'app.current_tenant_id',
                        :tenant_id,
                        true
                    )
                    """
                ),
                {"tenant_id": str(context.tenant_id)},
            )

            if context.actor_id is not None:
                await session.execute(
                    text(
                        """
                        SELECT set_config(
                            'app.current_actor_id',
                            :actor_id,
                            true
                        )
                        """
                    ),
                    {"actor_id": str(context.actor_id)},
                )

            yield session
```

Treći argument funkcije `set_config` je `true`, što znači da konfiguracija važi lokalno samo za trenutnu transakciju.

Posle commit-a ili rollback-a tenant kontekst ne ostaje na pooled konekciji.

---

# 16. PostgreSQL RLS

## 16.1 Helper funkcija u bazi

```sql
CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
    SELECT NULLIF(
        current_setting('app.current_tenant_id', true),
        ''
    )::uuid
$$;
```

---

## 16.2 RLS pravilo

Za tenant tabelu:

```sql
ALTER TABLE cms_entries
ENABLE ROW LEVEL SECURITY;

ALTER TABLE cms_entries
FORCE ROW LEVEL SECURITY;

CREATE POLICY cms_entries_tenant_select
ON cms_entries
FOR SELECT
USING (
    tenant_id = app.current_tenant_id()
);

CREATE POLICY cms_entries_tenant_insert
ON cms_entries
FOR INSERT
WITH CHECK (
    tenant_id = app.current_tenant_id()
);

CREATE POLICY cms_entries_tenant_update
ON cms_entries
FOR UPDATE
USING (
    tenant_id = app.current_tenant_id()
)
WITH CHECK (
    tenant_id = app.current_tenant_id()
);

CREATE POLICY cms_entries_tenant_delete
ON cms_entries
FOR DELETE
USING (
    tenant_id = app.current_tenant_id()
);
```

Odvojene politike su duže od jedne `FOR ALL` politike, ali su:

* jasnije;
* lakše za audit;
* lakše za kasnije proširenje;
* bezbednije za tabele sa različitim pravilima čitanja i izmene.

---

## 16.3 Database role pravila

Potrebne su najmanje sledeće DB uloge:

### Migration owner

Koristi se samo za migracije.

Može:

* menjati šemu;
* kreirati funkcije;
* kreirati RLS politike;
* menjati indekse.

Ne koristi se u regularnom FastAPI runtime-u.

### Application runtime role

Koristi je FastAPI.

Mora:

* imati samo potrebne privilegije;
* biti bez `BYPASSRLS`;
* ne biti vlasnik tenant tabela;
* poštovati RLS;
* ne moći da menja šemu.

### Worker runtime role

Može biti ista ograničena runtime uloga ili posebna uloga.

Ne sme automatski imati `BYPASSRLS`.

---

# 17. Alembic migracije

RLS se ne generiše skrivenim prolaskom kroz sve modele na kraju `migrations/env.py`.

Takav pristup se ne koristi zato što:

* RLS promena nije jasno vidljiva u revision fajlu;
* downgrade nije deterministički;
* migracija zavisi od trenutnog stanja svih modela;
* stare migracije mogu promeniti ponašanje posle izmene koda;
* review migracije ne prikazuje stvarnu DB promenu;
* može doći do neočekivane izmene već postojećih politika.

RLS mora biti eksplicitno uključen u verzionisanu Alembic migraciju.

---

## 17.1 Alembic helper

```python
from alembic import op


def enable_tenant_rls(table_name: str) -> None:
    op.execute(
        f"""
        ALTER TABLE {table_name}
        ENABLE ROW LEVEL SECURITY
        """
    )

    op.execute(
        f"""
        ALTER TABLE {table_name}
        FORCE ROW LEVEL SECURITY
        """
    )

    op.execute(
        f"""
        CREATE POLICY {table_name}_tenant_select
        ON {table_name}
        FOR SELECT
        USING (
            tenant_id = app.current_tenant_id()
        )
        """
    )

    op.execute(
        f"""
        CREATE POLICY {table_name}_tenant_insert
        ON {table_name}
        FOR INSERT
        WITH CHECK (
            tenant_id = app.current_tenant_id()
        )
        """
    )

    op.execute(
        f"""
        CREATE POLICY {table_name}_tenant_update
        ON {table_name}
        FOR UPDATE
        USING (
            tenant_id = app.current_tenant_id()
        )
        WITH CHECK (
            tenant_id = app.current_tenant_id()
        )
        """
    )

    op.execute(
        f"""
        CREATE POLICY {table_name}_tenant_delete
        ON {table_name}
        FOR DELETE
        USING (
            tenant_id = app.current_tenant_id()
        )
        """
    )
```

Helper prima isključivo konstantno ime tabele iz migracionog koda.

Ne sme se pozivati sa korisničkim inputom.

---

## 17.2 Primer migracije

```python
def upgrade() -> None:
    op.create_table(
        "booking_requests",
        sa.Column(
            "id",
            sa.Uuid(),
            nullable=False,
        ),
        sa.Column(
            "tenant_id",
            sa.Uuid(),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(length=50),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_booking_requests_tenant_id",
        "booking_requests",
        ["tenant_id"],
        unique=False,
    )

    enable_tenant_rls("booking_requests")


def downgrade() -> None:
    op.execute(
        """
        DROP POLICY IF EXISTS
        booking_requests_tenant_delete
        ON booking_requests
        """
    )

    op.execute(
        """
        DROP POLICY IF EXISTS
        booking_requests_tenant_update
        ON booking_requests
        """
    )

    op.execute(
        """
        DROP POLICY IF EXISTS
        booking_requests_tenant_insert
        ON booking_requests
        """
    )

    op.execute(
        """
        DROP POLICY IF EXISTS
        booking_requests_tenant_select
        ON booking_requests
        """
    )

    op.drop_table("booking_requests")
```

---

# 18. Tipizacija

## 18.1 Python

Sve javne funkcije moraju imati anotacije tipova.

Obavezno:

```bash
mypy app/ --strict
```

Nekontrolisana upotreba `Any` nije dozvoljena.

Za JSON vrednosti treba koristiti eksplicitne tipove.

```python
from typing import TypeAlias

JsonPrimitive: TypeAlias = str | int | float | bool | None
JsonValue: TypeAlias = (
    JsonPrimitive
    | list["JsonValue"]
    | dict[str, "JsonValue"]
)
```

`Any` je dozvoljen samo na strogo izolovanoj integracionoj granici kada biblioteka ne pruža tipove i kada je vrednost odmah validirana ili konvertovana u poznat tip.

---

## 18.2 Pydantic

Ulazne i izlazne šeme moraju biti odvojene.

```python
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BookingRequestCreate(BaseModel):
    preferred_therapist_id: UUID | None = None
    preferred_channel: str
    message: str = Field(min_length=1, max_length=3000)


class BookingRequestUpdate(BaseModel):
    assigned_therapist_id: UUID | None = None


class BookingRequestResponse(BaseModel):
    id: UUID
    status: str
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )
```

API odgovor ne treba automatski da izlaže `tenant_id` javnom klijentu, osim kada postoji konkretna potreba.

---

## 18.3 Zabranjeno vraćanje ORM modela

FastAPI ruta mora definisati `response_model`.

```python
@router.post(
    "/requests",
    response_model=BookingRequestResponse,
)
async def create_booking_request(
    payload: BookingRequestCreate,
) -> BookingRequestResponse:
    ...
```

---

# 19. API standardi

## 19.1 Verzije

API koristi verzionisani prefiks:

```text
/api/v1
```

Primeri:

```text
/api/v1/public/pages/{slug}
/api/v1/public/therapists
/api/v1/public/contact
/api/v1/public/booking-requests
/api/v1/public/compass/sessions

/api/v1/admin/cms/entries
/api/v1/admin/therapists
/api/v1/admin/booking-requests

/api/v1/member/profile
/api/v1/member/appointments

/api/v1/internal/jobs/email-delivery
```

---

## 19.2 Razdvajanje javnih, administratorskih i internih ruta

Javne rute:

```text
/api/v1/public/*
```

Tenant administratorske rute:

```text
/api/v1/admin/*
```

Autentifikovane klijentske rute:

```text
/api/v1/member/*
```

Interni worker endpoint-i:

```text
/api/v1/internal/jobs/*
```

Platform administratorske rute:

```text
/api/v1/platform/*
```

---

## 19.3 Greške

Greške moraju imati stabilan kod.

```json
{
  "type": "booking_request_invalid",
  "title": "Zahtev nije validan",
  "status": 422,
  "detail": "Izabrana opcija nije dostupna.",
  "request_id": "a018728e-f123-4567-8901-123456789abc"
}
```

Frontend ne treba da zavisi od proizvoljnog teksta greške.

Treba da koristi:

```text
type
status
field_errors
```

---

## 19.4 Pagination

List endpoint-i koriste cursor pagination kada se očekuje veća količina podataka.

Primer:

```json
{
  "items": [],
  "next_cursor": null,
  "has_more": false
}
```

Offset pagination je dozvoljena za male administratorske liste.

---

## 19.5 Idempotency

Kritične create operacije podržavaju:

```text
Idempotency-Key
```

Primeri:

* kreiranje zahteva za termin;
* potvrda termina;
* prihvatanje alternativnog termina;
* slanje pozivnice;
* kreiranje kompanijskog upita;
* slanje email poruke;
* webhook obrada.

Idempotency zapis mora biti tenant-aware.

---

# 20. Booking arhitektura

## 20.1 Faza 1: request-first

U prvoj fazi ne postoji automatski kalendar sa autoritativnim slobodnim slotovima.

Zahtev može sadržati:

* željenog terapeuta;
* online ili uživo;
* okvirni dan;
* okvirno vreme;
* kontakt podatke;
* kratku poruku;
* da li zahtev šalje punoletna osoba ili roditelj/staratelj.

Zahtev nije isto što i potvrđen termin.

---

## 20.2 Booking proposal

Terapeut može poslati predlog:

```text
booking_proposal
```

Predlog sadrži:

* predloženi početak;
* predloženi kraj;
* kanal;
* lokaciju ili online način;
* rok za prihvatanje;
* status predloga;
* terapeuta;
* zahtev na koji se odnosi.

Korisnik može:

* prihvatiti;
* odbiti;
* zatražiti drugu opciju.

---

## 20.3 Faza 2: pravi slotovi i dostupnost

Kada se uvede automatsko upravljanje dostupnošću, PostgreSQL ostaje autoritet.

Primer zaštite od preklapanja:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE appointments
ADD CONSTRAINT appointments_no_overlap
EXCLUDE USING gist (
    tenant_id WITH =,
    therapist_id WITH =,
    tstzrange(
        starts_at,
        ends_at,
        '[)'
    ) WITH &&
)
WHERE (
    status IN ('held', 'confirmed')
);
```

Tačne vrednosti statusa moraju dolaziti iz kanonskog booking status registra.

---

## 20.4 Tehnički hold

Tehnički hold može biti uveden kasnije.

Hold mora imati:

```text
hold_expires_at
```

TTL hold-a:

* nije hardkodovan u poslovni kod;
* podešava se konfiguracijom;
* može zavisiti od tenant-a;
* mora imati maksimalnu dozvoljenu granicu;
* mora se proveravati i u bazi.

Redis može pomoći pri smanjenju konkurentnih pokušaja, ali PostgreSQL constraint određuje konačan rezultat.

---

## 20.5 Redis lock

Redis lock se koristi samo kao optimizacija.

Bezbedno oslobađanje lock-a mora biti atomsko kroz Lua skriptu ili ugrađeni Redis lock mehanizam.

Nije dozvoljen obrazac:

```python
current = await redis.get(key)

if current == token:
    await redis.delete(key)
```

bez atomske zaštite, zato što između `GET` i `DELETE` može doći do promene vlasnika lock-a.

---

# 21. Transactional Outbox

Spoljni sistemi se ne pozivaju pre commit-a glavne transakcije.

Primer:

1. kreira se booking request;
2. kreira se outbox događaj;
3. transakcija se commit-uje;
4. worker preuzima outbox događaj;
5. QStash ili Resend šalju poruku;
6. beleži se rezultat.

Tabela:

```text
outbox_events
```

Polja:

```text
id
tenant_id
event_type
aggregate_type
aggregate_id
payload
payload_version
occurred_at
available_at
processed_at
attempt_count
last_error
idempotency_key
```

Outbox događaj se kreira u istoj transakciji kao poslovna promena.

---

# 22. QStash standard

Svaki QStash payload mora imati verziju.

```json
{
  "job_type": "send_booking_request_received_email",
  "payload_version": 1,
  "tenant_id": "uuid",
  "resource_id": "uuid",
  "idempotency_key": "string",
  "correlation_id": "uuid"
}
```

Handler mora:

* proveriti potpis;
* validirati payload;
* odbiti nepoznatu verziju;
* proveriti da li je posao već izvršen;
* postaviti tenant kontekst;
* izvršiti transakciju;
* upisati rezultat;
* bezbedno podržati retry.

---

# 23. Redis standard

Dozvoljene namene:

* rate limiting;
* cache javnog sadržaja;
* cache tenant domain rezolucije;
* cache membership provere;
* kratkotrajni lock;
* deduplikacija;
* privremeni Kompas session token;
* privremeni challenge;
* frontend invalidation signal.

Nedozvoljene namene kao jedini autoritet:

* potvrđen termin;
* trajna saglasnost;
* tenant članstvo;
* status objavljenog sadržaja;
* trajni Kompas rezultat;
* kompanijski ugovor;
* audit log.

Redis key mora uključiti namespace i okruženje.

Primer:

```text
psihointegritet:prod:tenant-domain:psihointegritet.rs
psihointegritet:prod:tenant:{tenant_id}:cms:page:{slug}
psihointegritet:prod:tenant:{tenant_id}:rate-limit:contact:{ip_hash}
```

Ne smeju se koristiti neograničeni Redis ključevi bez TTL-a, osim za strogo opravdane sistemske registre.

---

# 24. Cache invalidacija

Cache se invalidira tek posle uspešnog DB commit-a.

Primer:

1. CMS revizija se objavi;
2. transakcija se commit-uje;
3. outbox dobija `cms.entry.published`;
4. handler briše odgovarajuće Redis ključeve;
5. frontend dobija novu verziju pri narednom zahtevu.

Cache ključ treba da sadrži publication version ili revision ID kada je moguće.

---

# 25. CMS publication model

CMS sadržaj i njegova objavljena verzija nisu ista stvar.

Preporučeni model:

```text
cms_entry
├── stabilan identitet sadržaja
├── slug
├── tip
└── tenant

cms_entry_revision
├── konkretna verzija sadržaja
├── naslov
├── blokovi
├── autor
├── created_at
└── validation findings

cms_publication
├── entry_id
├── revision_id
├── published_at
├── published_by
└── channel
```

Objavljena verzija mora biti eksplicitna.

Izmena draft-a ne sme automatski promeniti sadržaj koji korisnik trenutno vidi.

---

## 25.1 Typed CMS blocks

CMS ne treba da čuva neograničen proizvoljni HTML kao osnovni format.

Koriste se tipizovani blokovi.

Primer:

```json
{
  "type": "text_section",
  "version": 1,
  "data": {
    "heading": "Stres i preopterećenost",
    "body": "..."
  }
}
```

Mogući blokovi:

```text
hero
text_section
therapist_cards
support_topic_cards
article_list
video
quote
book_recommendation
call_to_action
company_programs
faq
related_topics
legal_notice
```

Svaki blok ima:

* tip;
* verziju;
* Pydantic šemu;
* renderer na frontendu;
* migracionu strategiju.

---

# 26. Kompas pravila

Kompas mora biti verzionisan.

Objavljena verzija Kompasa sadrži:

* pitanja;
* opcije;
* bodovanje ili pravila;
* mapiranje tema;
* pravila za sekcije;
* pravila za terapeute;
* pravila za sadržaj;
* bezbednosna ograničenja;
* tekst objašnjenja.

Aktivna sesija mora pamtiti verziju toka sa kojom je započeta.

Promena Kompas pravila ne sme retroaktivno promeniti rezultat stare završene sesije.

---

## 26.1 Deterministički rezultat

Kompas rezultat mora moći da se reprodukuje iz:

* verzije toka;
* odgovora;
* verzije pravila;
* dostupnog objavljenog sadržaja.

Preporučeni proces:

```text
answers
  ↓
topic scoring
  ↓
primary topics
  ↓
related topic graph
  ↓
section composition rules
  ↓
published content filtering
  ↓
therapist capability matching
  ↓
result snapshot
```

`result snapshot` se čuva zato što se CMS sadržaj kasnije može promeniti.

---

## 26.2 Anonimni Kompas

Kompas može biti dostupan bez prijave.

Anonimna sesija koristi:

* nasumični session ID;
* potpisani kratkotrajni token;
* minimalne podatke;
* definisan rok čuvanja.

Anonimni korisnik ne mora biti primoran da kreira nalog pre dobijanja osnovnog rezultata.

Nalog se može ponuditi za:

* čuvanje rezultata;
* nastavak kasnije;
* personalizovane preporuke;
* slanje rezultata na email;
* rezervaciju podrške.

---

# 27. Maloletna lica i staratelji

Prema usvojenom poslovnom pravilu:

* maloletno lice ne otvara samostalno booking nalog;
* nalog i zahtev otvara roditelj ili staratelj;
* roditelj ili staratelj prisustvuje ili učestvuje u procesu prema pravilima usluge;
* odnos sa maloletnim licem mora biti eksplicitno evidentiran.

Potrebni entiteti:

```text
guardian_relationship
dependent_profile
guardian_consent
booking_participant
```

`guardian_relationship` mora sadržati:

* guardian user ID;
* dependent ID;
* tip odnosa;
* status verifikacije;
* vreme kreiranja;
* vreme povlačenja;
* ko je odobrio odnos;
* povezane saglasnosti.

Sistem ne treba da čuva više podataka o maloletniku nego što je neophodno za konkretan poslovni tok.

---

# 28. Osetljivi podaci

Platforma mora razlikovati najmanje:

1. javne podatke;
2. poslovne podatke;
3. lične podatke;
4. posebno osetljive podatke;
5. tehničke i bezbednosne podatke.

## 28.1 Javne informacije

Primeri:

* objavljeni profil terapeuta;
* javna biografija;
* objavljeni članak;
* javna cena;
* javna lokacija.

## 28.2 Lični podaci

Primeri:

* ime;
* email;
* telefon;
* korisnički nalog;
* kontakt osoba kompanije.

## 28.3 Posebno osetljivi podaci

Primeri:

* poruka u kojoj korisnik opisuje razlog traženja podrške;
* podaci vezani za maloletno lice;
* informacije iz intake procesa;
* privatna komunikacija.

Takvi podaci:

* ne smeju biti uključeni u logove;
* ne smeju biti uključeni u analytics event;
* ne smeju biti poslati AI provajderu bez eksplicitno odobrenog toka;
* ne smeju automatski biti uključeni u embedding bazu;
* ne smeju biti vidljivi zaposlenom bez odgovarajuće dozvole.

---

## 28.4 Terapeutske beleške

Kliničke ili detaljne beleške sa terapijskih sesija nisu deo početnog sistema.

Ako se kasnije uvedu, moraju biti projektovane kao poseban bezbednosni domen sa:

* dodatnim enkripcijskim zahtevima;
* strožim dozvolama;
* posebnim audit pravilima;
* posebnom politikom čuvanja;
* pravnom i stručnom revizijom;
* jasnim pravilima izvoza i brisanja.

Ne smeju se naknadno dodati kao obično tekstualno polje u `appointments` tabeli.

---

# 29. Enkripcija

Obavezno:

* TLS za komunikaciju;
* enkripcija diskova koju pruža infrastruktura;
* secrets samo kroz environment secret storage;
* bez secrets u repozitorijumu;
* bez tokena u logovima;
* bez produkcionih podataka u lokalnom development-u.

Za naročito osetljiva polja može se koristiti aplikaciona envelope enkripcija.

Enkriptovano polje mora imati:

```text
ciphertext
key_version
encryption_algorithm
```

Pretraga po enkriptovanim poljima zahteva poseban dizajn i ne rešava se improvizovanim dešifrovanjem cele tabele.

---

# 30. Role i permissions

Role nisu dovoljne za sve odluke.

Sistem koristi:

* role kao paket dozvola;
* permissions kao stvarni autoritet;
* membership status;
* ownership;
* resource-level policy.

Primer role:

```text
platform_admin
tenant_owner
tenant_admin
therapist
content_editor
reviewer
company_manager
client
guardian
```

Primer permissions:

```text
tenant.settings.read
tenant.settings.update

member.invite
member.remove
member.role.update

cms.entry.read
cms.entry.create
cms.entry.update
cms.entry.review
cms.entry.publish
cms.entry.delete

therapist.read
therapist.create
therapist.update
therapist.publish

booking.request.read
booking.request.assign
booking.request.propose
booking.request.confirm
booking.request.decline

legal.document.create
legal.document.publish

diagnostics.run
diagnostics.read

audit.read
```

Frontend skrivanje dugmeta nije bezbednosna kontrola.

Backend proverava permission za svaku zaštićenu operaciju.

---

# 31. Policy sloj

Pored permission-a mogu postojati dodatna poslovna pravila.

Primer:

```python
class BookingRequestPolicy:
    @staticmethod
    def can_view(
        *,
        context: RequestContext,
        assigned_therapist_id: UUID | None,
    ) -> bool:
        if "booking.request.read_all" in context.permissions:
            return True

        if (
            "booking.request.read_assigned" in context.permissions
            and assigned_therapist_id == context.actor_id
        ):
            return True

        return False
```

Policy ne pristupa direktno HTTP request-u.

Policy dobija tipizovane činjenice i vraća odluku.

---

# 32. AI sloj

AI funkcionalnosti su pomoćne, a ne autoritativne.

Dozvoljene početne namene:

* predlog CMS oznaka;
* predlog povezanih tema;
* sažimanje uredničkog sadržaja;
* predlog alternativnog naslova;
* pomoć u organizaciji biblioteke;
* predlog strukture članka;
* interni content QA;
* pomoć pri pretrazi javnog sadržaja.

Nedozvoljeno bez posebne stručne, pravne i bezbednosne faze:

* automatsko postavljanje dijagnoze;
* predstavljanje AI sistema kao terapeuta;
* samostalno donošenje odluke ko treba da dobije određeni tretman;
* automatsko slanje osetljivog intake sadržaja eksternom modelu;
* automatsko objavljivanje AI teksta bez stručne kontrole;
* automatska izmena saglasnosti ili pravnih dokumenata;
* autonomna promena booking statusa.

---

## 32.1 Provider abstraction

Poslovni kod ne zavisi direktno od konkretnog AI modela.

```python
from typing import Protocol, TypeVar

from pydantic import BaseModel


OutputT = TypeVar(
    "OutputT",
    bound=BaseModel,
)


class StructuredAIProvider(Protocol):
    async def generate_structured(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        output_schema: type[OutputT],
        model_profile: str,
    ) -> OutputT:
        ...
```

Konfiguracija određuje:

* provajdera;
* model;
* timeout;
* broj pokušaja;
* maksimalan broj tokena;
* dozvoljene podatke;
* cenu;
* fallback.

Model ime se ne hardkoduje kroz domen servis.

---

## 32.2 Prompt registry

Prompt mora imati:

```text
prompt_id
version
purpose
system_template
input_schema
output_schema
approved_by
approved_at
status
```

AI rezultat mora moći da se poveže sa:

* verzijom prompta;
* model profilom;
* vremenom izvršavanja;
* tenant-om;
* korisnikom koji je pokrenuo zahtev;
* input klasifikacijom;
* rezultatom validacije.

---

## 32.3 Structured outputs

AI rezultat se validira kroz Pydantic šemu.

Ne koristi se proizvoljan JSON string koji se odmah upisuje u bazu.

```python
from pydantic import BaseModel


class SuggestedContentTags(BaseModel):
    primary_topic_slugs: list[str]
    related_topic_slugs: list[str]
    confidence: float
    explanation: str
```

Rezultat koji ne prolazi validaciju nije uspešan rezultat.

---

# 33. pgvector i semantička pretraga

pgvector je opciona kasnija funkcionalnost.

Početni Kompas ne zavisi od vektorske pretrage.

Prvo se implementira:

* ručno uređena taksonomija;
* relacije tema;
* CMS tagovi;
* deterministička pravila;
* PostgreSQL full-text pretraga gde je potrebna.

pgvector se uvodi kada postoji konkretna potreba za:

* semantičkom pretragom biblioteke;
* pronalaženjem sličnog sadržaja;
* predlaganjem relevantnih objavljenih materijala.

---

## 33.1 Embedding pravila

Embedding se pravi samo od odobrenog sadržaja.

Ne pravi se embedding od:

* privatnih booking poruka;
* kontakt upita;
* maloletničkih podataka;
* privatne komunikacije;
* terapeutske beleške;
* saglasnosti;
* audit logova.

Dimenzija embeddinga zavisi od izabranog embedding modela.

Ne postoji univerzalna „Anthropic embedding dimenzija“.

Embedding profil mora sadržati:

```text
provider
model
model_version
dimensions
content_version
created_at
```

Promena modela ili dimenzije zahteva novu verziju embeddinga i reindeksiranje.

---

## 33.2 Primer modela

```python
from uuid import UUID

from pgvector.sqlalchemy import Vector
from sqlalchemy import String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, TenantMixin


class ContentEmbedding(Base, TenantMixin):
    __tablename__ = "content_embeddings"

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
    )

    content_entry_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        nullable=False,
    )

    embedding_profile: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    embedding: Mapped[list[float]] = mapped_column(
        Vector(1536),
        nullable=False,
    )
```

Broj `1536` u ovom primeru pripada konkretnom konfigurisanom embedding profilu i nije globalni standard platforme.

---

# 34. Pretraga

Pretraga se uvodi u fazama.

## Faza 1

* PostgreSQL pretraga po naslovu;
* slug;
* tagovi;
* kategorije;
* terapeut;
* oblast podrške.

## Faza 2

* PostgreSQL full-text search;
* normalizacija srpskog teksta;
* sinonimi;
* transliteracija;
* latinica i ćirilica;
* rangiranje.

## Faza 3

* semantička pretraga preko pgvector;
* hibridno rangiranje;
* urednički boost;
* tenant filter;
* publication filter.

RLS mora filtrirati tenant podatke pre vraćanja rezultata.

---

# 35. Email arhitektura

Email servis koristi adapter.

```python
from typing import Protocol


class EmailSender(Protocol):
    async def send(
        self,
        *,
        template_id: str,
        recipient: str,
        variables: dict[str, str],
        idempotency_key: str,
    ) -> str:
        ...
```

Domen ne importuje direktno Resend SDK.

Resend adapter implementira `EmailSender`.

Ovim se omogućava:

* testiranje bez stvarnog slanja;
* promena provajdera;
* lokalni fake sender;
* kontrolisan retry;
* centralno filtriranje sadržaja.

---

## 35.1 Email događaji

Primeri:

```text
contact.inquiry.received
booking.request.received
booking.request.assigned
booking.proposal.created
booking.proposal.accepted
appointment.confirmed
appointment.reminder_due
legal.document.reacceptance_required
tenant.invitation.created
```

Svaki event mora imati:

* verziju;
* tenant ID;
* resource ID;
* correlation ID;
* idempotency key.

---

# 36. Webhook standard

Svi webhook endpoint-i moraju:

* verifikovati potpis;
* proveriti timestamp kada provajder to podržava;
* imati zaštitu od replay napada;
* biti idempotentni;
* čuvati osnovni delivery zapis;
* ne verovati payload-u pre validacije;
* vratiti uspeh tek kada je događaj bezbedno prihvaćen.

Primer tabela:

```text
webhook_deliveries
webhook_processing_attempts
```

Neobrađeni payload može se čuvati samo ako je to neophodno i ako je prošao klasifikaciju osetljivosti.

---

# 37. Rate limiting

Rate limiting se primenjuje najmanje na:

* login pomoćne tokove;
* kontakt formu;
* zahtev za termin;
* Kompas session create;
* email slanje;
* invite endpoint;
* passwordless ili verification tokove;
* javnu pretragu.

Ključevi mogu biti kombinacija:

* IP hash;
* tenant ID;
* actor ID;
* endpoint;
* resource ID.

Primer:

```text
rate:{environment}:{tenant_id}:{endpoint}:{ip_hash}
```

Odgovor koristi:

```text
429 Too Many Requests
```

Rate limiting ne sme otkriti da li određeni email postoji u sistemu.

---

# 38. Observability

Sistem mora imati:

* strukturisane JSON logove;
* request ID;
* correlation ID;
* tenant ID;
* actor ID kada je bezbedno;
* trajanje zahteva;
* status koda;
* tip greške;
* QStash job ID;
* outbox event ID;
* database query timing za spore upite;
* health metrike.

Ne loguju se:

* tokeni;
* cookies;
* authorization header;
* kompletan request body;
* privatne poruke;
* detalji razloga traženja podrške;
* podaci maloletnika.

---

## 38.1 Health endpoint-i

```text
/health/live
/health/ready
```

`live` proverava da je proces aktivan.

`ready` proverava kritične zavisnosti potrebne za prihvatanje saobraćaja.

Production health odgovor ne sme izlagati:

* connection string;
* API ključeve;
* interne hostname-ove;
* stack trace;
* detalje šeme baze.

---

# 39. Dijagnostički engine

## 39.1 Diagnostic check contract

```python
from dataclasses import dataclass
from enum import StrEnum
from typing import Protocol


class DiagnosticSeverity(StrEnum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


@dataclass(frozen=True, slots=True)
class DiagnosticFinding:
    rule_id: str
    severity: DiagnosticSeverity
    summary: str
    remediation: str | None
    requires_approval: bool
    evidence: dict[str, str]


class DiagnosticCheck(Protocol):
    async def run(self) -> list[DiagnosticFinding]:
        ...
```

U stvarnoj implementaciji tip `evidence` može biti strožiji i specifičan za pravilo.

---

## 39.2 Diagnostic run

```text
diagnostic_runs
diagnostic_findings
```

Run sadrži:

```text
status
started_at
completed_at
check_version
tenant_id
triggered_by
failure_reason
finding_count
```

Dozvoljeni tehnički statusi run-a:

```text
running
succeeded
failed
```

Ako je deo provera preskočen, to mora biti eksplicitno evidentirano kroz rezultate ili poseban status definisan kanonskim ugovorom.

---

## 39.3 Bez automatske popravke

Diagnostic Engine ne menja podatke.

Kasnije se može dodati poseban Repair Engine.

Repair akcija mora imati:

* preview;
* plan promene;
* approval;
* audit;
* idempotency;
* rollback ili compensating strategiju;
* permission proveru.

---

# 40. Transaction granice

Jedna application komanda treba da ima jednu jasnu transakcionu granicu.

Primer:

```text
ConfirmBookingProposal
├── učitaj proposal
├── proveri permission
├── proveri status
├── proveri rok
├── kreiraj appointment
├── promeni proposal
├── promeni request
├── upiši audit
├── upiši outbox event
└── commit
```

Email se šalje posle commit-a.

Nije dozvoljeno držati DB transakciju otvorenu tokom:

* AI poziva;
* Resend poziva;
* Cloudinary ili storage upload-a;
* QStash HTTP poziva;
* sporog eksternog API poziva.

---

# 41. Repository pravila

Repository:

* izvršava DB upite;
* mapira ORM podatke;
* ne donosi HTTP odluke;
* ne šalje email;
* ne poziva AI;
* ne sadrži permission pravila;
* ne commit-uje proizvoljno samostalno ako transaction boundary pripada application servisu.

Service ili Unit of Work kontroliše commit.

---

# 42. Domain događaji

Domen može emitovati događaj.

Primer:

```python
from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True, slots=True)
class BookingRequestCreated:
    tenant_id: UUID
    booking_request_id: UUID
    created_by_actor_id: UUID | None
```

Domain događaj ne mora biti odmah spoljašnji event.

Application sloj odlučuje:

* da li se događaj obrađuje unutar procesa;
* da li se pretvara u outbox event;
* da li pokreće notification;
* da li se samo audit-uje.

---

# 43. OpenAPI ugovor

FastAPI OpenAPI schema predstavlja autoritet za frontend API klijent.

Pipeline:

```text
FastAPI schemas
    ↓
OpenAPI JSON
    ↓
generated TypeScript client
    ↓
frontend hooks
```

Frontend ne treba ručno da duplira backend DTO tipove.

Promena API ugovora mora pokrenuti:

* OpenAPI generisanje;
* TypeScript client generisanje;
* typecheck;
* contract test;
* pregled breaking promena.

---

# 44. CORS i domeni

CORS koristi eksplicitnu listu dozvoljenih origin-a.

Nije dozvoljeno u production-u:

```python
allow_origins=["*"]
```

uz credentials.

Dozvoljeni origin-i se formiraju iz:

* glavnog domena;
* administratorskog domena;
* staging domena;
* kontrolisanih tenant custom domena.

Custom domen mora biti verifikovan pre dodavanja na allowlist.

---

# 45. CSRF

Kada se API poziva Bearer tokenom u `Authorization` header-u, CSRF rizik je manji nego kod automatski poslatih session cookie-ja.

Ako se kasnije uvede cross-domain cookie autentifikacija, mora se dodati:

* CSRF token;
* SameSite politika;
* Secure cookie;
* Origin provera;
* Referer provera gde je opravdano.

Autentifikaciona arhitektura se ne menja neformalno bez bezbednosnog pregleda.

---

# 46. Content Security Policy

Frontend treba da koristi CSP prilagođen:

* Clerk-u;
* Resend ne utiče direktno na browser CSP;
* analytics provajderu;
* media storage-u;
* Vercel-u;
* dozvoljenim iframe sadržajima.

`unsafe-inline` i `unsafe-eval` ne dodaju se bez dokumentovanog razloga.

---

# 47. File i media storage

Binarni fajlovi se ne čuvaju direktno u PostgreSQL tabelama osim veoma malih i opravdanih podataka.

Koristi se storage adapter.

```python
from typing import Protocol


class ObjectStorage(Protocol):
    async def create_upload_target(
        self,
        *,
        tenant_id: str,
        content_type: str,
        max_size_bytes: int,
    ) -> str:
        ...

    async def delete_object(
        self,
        *,
        object_key: str,
    ) -> None:
        ...
```

Konkretan provajder može kasnije biti:

* Cloudinary;
* S3-compatible storage;
* drugi odobreni servis.

Baza čuva:

```text
object_key
content_type
size
checksum
storage_provider
created_at
tenant_id
```

Upload mora imati:

* dozvoljeni MIME tip;
* maksimalnu veličinu;
* proveru ekstenzije;
* checksum;
* tenant namespace;
* virus scan kada se uvedu korisnički dokumenti.

---

# 48. Brisanje i zadržavanje podataka

Svaki domen mora definisati:

* koliko dugo se podatak čuva;
* da li se briše;
* da li se anonimizuje;
* da li postoji zakonski ili ugovorni razlog čuvanja;
* kako se tretiraju backup-i;
* ko može pokrenuti brisanje.

Soft delete nije automatski obavezan za sve tabele.

Soft delete se koristi kada postoji poslovni razlog.

Audit i saglasnosti mogu imati drugačiju retention politiku od običnih CMS draft-ova.

---

# 49. Tenant export

Platforma mora kasnije podržati kontrolisan izvoz tenant podataka.

Izvoz mora biti:

* autorizovan;
* auditovan;
* tenant-scoped;
* asinhron;
* vremenski ograničen;
* zaštićen potpisanim download linkom;
* bez podataka drugih tenant-a.

Export servis ne koristi nekontrolisani `SELECT *`.

Svaki domen definiše koje podatke izvozi.

---

# 50. Backup i restore

Potrebno je definisati:

* automatske backup-e;
* retention backup-a;
* enkripciju;
* pristup backup-u;
* restore proceduru;
* periodični restore test;
* incident proceduru.

Backup koji nikada nije testiran kroz restore ne smatra se potvrđenom disaster recovery zaštitom.

Production podaci se ne vraćaju u staging bez anonimizacije i eksplicitnog odobrenja.

---

# 51. Testiranje

## 51.1 Unit testovi

Unit testovi pokrivaju:

* domain policies;
* lifecycle odluke;
* Kompas pravila;
* permission kalkulaciju;
* booking state transition;
* content validation;
* diagnostic pravila;
* idempotency odluke.

Unit test ne treba da zahteva PostgreSQL kada testira čistu poslovnu funkciju.

---

## 51.2 PostgreSQL integracioni testovi

Integracioni testovi koriste pravi PostgreSQL.

Obavezne oblasti:

* migracije;
* RLS;
* transakcije;
* constraint-i;
* exclusion constraint;
* JSONB;
* pgvector kada se uvede;
* outbox;
* composite foreign key;
* concurrency.

SQLite nije zamena za ove testove.

---

## 51.3 RLS testovi

Za svaku tenant tabelu mora postojati test koji dokazuje:

1. tenant A vidi svoje redove;
2. tenant A ne vidi redove tenant-a B;
3. tenant A ne može da insert-uje red tenant-a B;
4. tenant A ne može da update-uje red tenant-a B;
5. tenant A ne može da obriše red tenant-a B;
6. zahtev bez tenant konteksta ne dobija tenant podatke;
7. runtime DB role nema `BYPASSRLS`.

---

## 51.4 API testovi

API testovi pokrivaju:

* 401 kada nema autentifikacije;
* 403 kada nema permission;
* 404 kada resurs nije dostupan u tenant kontekstu;
* validaciju input-a;
* idempotency;
* pagination;
* public tenant resolution;
* custom domain resolution;
* rate limiting;
* webhook signature;
* QStash signature.

Za resurs drugog tenant-a često je bezbednije vratiti `404` nego potvrditi da resurs postoji kroz `403`.

---

## 51.5 Concurrency testovi

Booking testovi moraju simulirati paralelne zahteve.

Potrebno je dokazati da:

* ne mogu nastati dva potvrđena termina koji se preklapaju;
* retry ne kreira duplikat;
* Redis lock failure ne ugrožava DB integritet;
* istekao hold ne može biti potvrđen;
* dva prihvatanja istog predloga ne kreiraju dva appointment-a.

---

## 51.6 Migration testovi

CI mora testirati:

```text
empty database
    ↓
alembic upgrade head
    ↓
schema verification
```

Takođe treba testirati upgrade sa poslednje podržane production revizije na novu reviziju.

---

# 52. CI pipeline

Kod se smatra spremnim za integraciju tek kada prođu svi obavezni gate-ovi.

Preporučeni pipeline:

```bash
uv sync --frozen

ruff format --check app tests
ruff check app tests

mypy app --strict

pytest tests/unit
pytest tests/integration
pytest tests/api
pytest tests/security
pytest tests/tenancy

alembic upgrade head
alembic check

python scripts/export_openapi.py
python scripts/check_openapi_diff.py
```

U CI pipeline-u se ne koristi:

```bash
ruff check --fix
```

CI proverava kod, ali ga ne menja.

Automatske ispravke se mogu koristiti lokalno:

```bash
ruff check app tests --fix
ruff format app tests
```

---

# 53. Coverage

Coverage procenat nije jedini kriterijum.

Kritične oblasti moraju imati punu scenario pokrivenost:

* tenant isolation;
* permissions;
* booking concurrency;
* consent versioning;
* public/private content separation;
* outbox idempotency;
* webhook replay protection;
* Kompas deterministic result;
* diagnostic failure behavior.

Visok coverage bez testiranja bezbednosnih scenarija nije dovoljan.

---

# 54. Coding standardi

Obavezno:

* asinhroni I/O;
* potpuna tipizacija;
* male funkcije;
* eksplicitni exception tipovi;
* bez generičkog `except Exception` osim na infrastrukturnoj granici;
* bez `pass` u production poslovnom toku;
* bez skrivenog commit-a;
* bez hardkodovanih secrets;
* bez hardkodovanih model imena u domenu;
* bez direktnog provajder SDK-a u domen sloju;
* bez vraćanja ORM modela;
* bez globalnog mutable state-a;
* bez import ciklusa.

---

# 55. Exception standard

Domen koristi sopstvene exception tipove.

```python
class BookingError(Exception):
    pass


class BookingProposalExpiredError(BookingError):
    pass


class BookingProposalAlreadyResolvedError(BookingError):
    pass


class BookingConflictError(BookingError):
    pass
```

API sloj mapira domain exception u HTTP odgovor.

Domen servis ne podiže direktno `HTTPException`.

---

# 56. Konfiguracija

Konfiguracija koristi Pydantic Settings.

```python
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    environment: str
    database_url: str
    redis_url: str

    clerk_issuer: str
    clerk_jwks_url: str

    resend_api_key: str
    qstash_current_signing_key: str
    qstash_next_signing_key: str

    allowed_origins: list[str]

    database_pool_size: int = Field(
        default=10,
        ge=1,
        le=50,
    )

    database_max_overflow: int = Field(
        default=5,
        ge=0,
        le=50,
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="forbid",
    )
```

Aplikacija mora fail-fast da se zaustavi ako nedostaje kritična konfiguracija.

---

# 57. Lifespan

FastAPI koristi lifespan za infrastrukturne resurse.

```python
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI


@asynccontextmanager
async def lifespan(
    app: FastAPI,
) -> AsyncIterator[None]:
    await initialize_database_checks()
    await initialize_redis()
    await validate_external_configuration()

    yield

    await close_redis()
    await dispose_database_engine()
```

Nije dozvoljeno kreiranje novih Redis ili HTTP klijenata za svaki pojedinačni zahtev kada mogu bezbedno da se dele kroz application lifespan.

---

# 58. FastAPI application factory

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.bootstrap.lifespan import lifespan
from app.bootstrap.routers import register_routers
from app.core.config import settings


def create_application() -> FastAPI:
    app = FastAPI(
        title="Psihointegritet Platform API",
        version="0.2.0",
        lifespan=lifespan,
        docs_url=(
            "/docs"
            if settings.environment != "production"
            else None
        ),
        redoc_url=None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=[
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS",
        ],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "Idempotency-Key",
            "X-Request-ID",
        ],
    )

    register_routers(app)

    return app


app = create_application()
```

Tenant autentifikacija se ne rešava jednim globalnim middleware-om koji blokira sve javne rute.

Rute koriste odgovarajući public, member, admin ili worker dependency.

---

# 59. Deployment proces

## 59.1 Staging

Promena prvo ide na staging.

Proces:

1. CI prolazi;
2. staging migracija se izvršava;
3. staging backend se deploy-uje;
4. staging frontend se deploy-uje;
5. smoke test;
6. RLS diagnostic;
7. booking flow test;
8. CMS publish test;
9. email sandbox test;
10. odobrenje za production.

---

## 59.2 Production

Pre production migracije:

* backup stanje mora biti provereno;
* migracija mora biti testirana;
* breaking promena mora imati deployment plan;
* frontend i backend kompatibilnost mora biti potvrđena;
* rollback ili roll-forward strategija mora biti definisana.

Migracija baze se ne pokreće iz više paralelnih backend instanci.

Koristi se jedan kontrolisani migration job.

---

# 60. Expand and contract migracije

Breaking promena se izvodi u fazama.

Primer preimenovanja kolone:

1. dodati novu kolonu;
2. backend upisuje u staru i novu;
3. izvršiti backfill;
4. frontend i backend prebaciti na novu;
5. prestati sa upisom u staru;
6. proveriti podatke;
7. ukloniti staru kolonu u kasnijoj migraciji.

Ne vrši se trenutno brisanje kolone koju aktivna verzija aplikacije još koristi.

---

# 61. Feature flags

Feature flags mogu biti:

* globalni;
* po tenant-u;
* po planu;
* po okruženju.

Primeri:

```text
cms_enabled
booking_requests_enabled
compass_enabled
company_programs_enabled
client_accounts_enabled
advanced_booking_enabled
ai_content_assist_enabled
```

Feature flag ne sme biti jedina bezbednosna kontrola.

Čak i kada je funkcionalnost isključena u UI-ju, backend mora proveriti:

* permission;
* tenant feature;
* lifecycle stanje;
* poslovna pravila.

---

# 62. SaaS paketi

Arhitektura treba da omogući buduće planove bez ugrađivanja cena direktno u domene.

Primer capability pristupa:

```text
cms.basic
cms.advanced
booking.request_first
booking.live_availability
compass.basic
compass.personalized
companies.inquiries
companies.programs
ai.content_assist
analytics.advanced
```

Plan mapira capability-je.

Domen proverava capability, a ne ime komercijalnog paketa.

Nije dozvoljeno:

```python
if tenant.plan == "premium":
    ...
```

u poslovnom domenu.

Dozvoljeno:

```python
if not tenant_capabilities.has(
    "booking.live_availability"
):
    raise CapabilityRequiredError(...)
```

---

# 63. Faze implementacije

## Faza A — Foundation

* FastAPI aplikacija;
* Pydantic Settings;
* PostgreSQL;
* SQLAlchemy async;
* Alembic;
* Clerk integracija;
* OpenAPI generisani klijent;
* Redis;
* osnovni logging;
* odvojena okruženja;
* health endpoint-i;
* tenant foundation;
* RLS foundation.

---

## Faza B — Javni sajt i CMS

* početna stranica;
* oblasti podrške;
* tim;
* profili terapeuta;
* kompanije;
* kontakt;
* legal stranice;
* CMS dokumenti;
* publication model;
* slanje email-a;
* audit osnovnih promena.

---

## Faza C — Therapist Directory i kompanije

* uređivanje terapeuta;
* oblasti rada;
* lokacije;
* cene;
* statusi dostupnosti;
* kompanijski upiti;
* interni workflow;
* CTA i forme.

---

## Faza D — Request-first booking

* booking request;
* terapeutska dodela;
* booking proposal;
* potvrda;
* odbijanje;
* email obaveštenja;
* audit;
* idempotency;
* status istorija.

---

## Faza E — Kompas

* taksonomija tema;
* relacije tema;
* flow verzije;
* pitanja;
* pravila;
* rezultat po sekcijama;
* sadržaj;
* terapeuti;
* anonimne sesije;
* čuvanje rezultata kasnije.

---

## Faza F — Korisnički nalozi

* klijentski nalog;
* istorija zahteva;
* termini;
* sačuvani Kompas rezultat;
* dokumenti i saglasnosti;
* guardian nalog;
* profil zavisnog lica.

---

## Faza G — Napredni booking

* kalendar terapeuta;
* dostupnost;
* slotovi;
* tehnički hold;
* PostgreSQL overlap zaštita;
* otkazivanje;
* promena termina;
* podsetnici;
* Google Calendar integracija ako bude odobrena.

---

## Faza H — Programi i kompanijski paketi

* ugovori;
* programi;
* zaposleni;
* pseudonimni benefit tokeni;
* radionice;
* rezervisani kapaciteti;
* agregatni izveštaji.

---

## Faza I — AI asistivne funkcionalnosti

* content tagging;
* related topic suggestions;
* CMS quality assist;
* semantička pretraga;
* prompt registry;
* model registry;
* human review;
* cost control;
* audit.

---

## Faza J — SaaS širenje

* tenant onboarding;
* tenant branding;
* custom domeni;
* planovi;
* capability sistem;
* subscription billing;
* data export;
* tenant lifecycle;
* dodatne organizacije.

---

# 64. Arhitektonske zabrane

Sledeće odluke su zabranjene bez novog ADR-a:

* direktan frontend pristup PostgreSQL bazi;
* production baza za staging ili preview;
* tenant ID iz request body-ja kao bezbednosni autoritet;
* regularni runtime DB korisnik sa `BYPASSRLS`;
* čuvanje potvrđene rezervacije samo u Redis-u;
* automatsko menjanje podataka kroz Diagnostic Engine;
* slanje email-a pre DB commit-a;
* automatsko objavljivanje AI sadržaja;
* čuvanje privatnih booking poruka u pgvector indeksu;
* hardkodovanje AI modela kroz domen kod;
* skriveno automatsko generisanje RLS pravila iz Alembic `env.py`;
* generički globalni auth middleware koji blokira javne rute;
* korišćenje frontend role kao autoriteta;
* deljenje ORM modela preko domenskih granica;
* jedna ogromna `services.py` datoteka za celu aplikaciju;
* commit iz repository metode bez definisane transaction granice;
* nekontrolisana upotreba `Any`;
* čuvanje tokena ili osetljivog request body-ja u logovima;
* uvođenje kliničkih beleški kao običnog tekstualnog polja;
* automatsko povezivanje maloletnika bez guardian workflow-a;
* modelovanje Kompasa kao jednog generičkog AI prompta.

---

# 65. Obavezni arhitektonski testovi pre production-a

Pre prve production verzije moraju postojati testovi za:

```text
[ ] public tenant resolution
[ ] custom domain tenant resolution
[ ] Clerk token verification
[ ] inactive membership rejection
[ ] permission rejection
[ ] tenant A cannot read tenant B
[ ] tenant A cannot write tenant B
[ ] tenant A cannot reference tenant B resource
[ ] public endpoint returns only published content
[ ] draft content cannot leak publicly
[ ] booking request idempotency
[ ] booking proposal double acceptance
[ ] outbox event created in same transaction
[ ] failed email retry
[ ] QStash replay protection
[ ] consent version binding
[ ] guardian relationship enforcement
[ ] diagnostic failure is not reported as zero findings
[ ] logs do not include authorization header
[ ] preview environment does not use production DB
```

---

# 66. Kanonske arhitektonske odluke

Ovaj dokument usvaja sledeće odluke:

## A-001

Backend je Python FastAPI modularni monolit.

## A-002

Glavna baza je PostgreSQL.

## A-003

Multi-tenancy koristi shared database model sa `tenant_id` i PostgreSQL RLS zaštitom.

## A-004

Clerk je autoritet za autentifikaciju, ali interna baza je autoritet za tenant članstvo i permissions.

## A-005

Javni tenant se rešava preko verifikovanog domena ili server-side rute.

## A-006

Frontend nikada nije autoritet za tenant ID, role ili permission.

## A-007

CMS koristi revision i publication model.

## A-008

CMS lifecycle koristi postojeći kanonski D-029 status model.

## A-009

Diagnostic severity koristi `info`, `warning` i `error` prema D-032.

## A-010

Diagnostic Engine je read-only.

## A-011

Booking u prvoj fazi koristi request-first model.

## A-012

PostgreSQL constraint je autoritet za sprečavanje preklapanja budućih termina.

## A-013

Redis lock je samo optimizacija.

## A-014

Transactional Outbox povezuje poslovne transakcije sa email i background poslovima.

## A-015

QStash handler-i su potpisani, idempotentni i tenant-aware.

## A-016

Kompas je deterministički, verzionisan i urednički kontrolisan.

## A-017

Kompas nije dijagnostički alat.

## A-018

AI je pomoćni sloj i nema autonomni autoritet nad objavljivanjem, dijagnozom, booking-om ili saglasnostima.

## A-019

pgvector je opciona buduća funkcionalnost i ne predstavlja osnovu prve verzije Kompasa.

## A-020

Production, staging, feature i test podaci moraju biti strogo odvojeni.

## A-021

Maloletno lice ne otvara samostalni booking nalog; proces vodi roditelj ili staratelj.

## A-022

Kliničke beleške nisu deo početnog sistema.

## A-023

RLS pravila se uvode eksplicitnim Alembic migracijama.

## A-024

Platform admin operacije moraju biti posebno autorizovane i auditovane.

## A-025

SaaS planovi se u poslovnom kodu predstavljaju capability sistemom, a ne proverom naziva paketa.

---

# 67. Definition of Done

Backend zadatak nije završen samo zato što endpoint radi lokalno.

Zadatak je završen kada:

```text
[ ] poslovna pravila su implementirana
[ ] input i output šeme su tipizovane
[ ] permission provera postoji
[ ] tenant kontekst je postavljen
[ ] RLS je uključen ako postoji nova tenant tabela
[ ] Alembic migracija postoji
[ ] downgrade ili roll-forward plan postoji
[ ] unit testovi prolaze
[ ] PostgreSQL integracioni testovi prolaze
[ ] cross-tenant test postoji
[ ] audit događaj postoji kada je potreban
[ ] outbox događaj postoji kada je potrebna spoljna akcija
[ ] idempotency postoji kada postoji retry rizik
[ ] logovi ne sadrže osetljive podatke
[ ] OpenAPI schema je ažurirana
[ ] frontend klijent je regenerisan
[ ] dokumentacija je ažurirana
[ ] svi CI gate-ovi su zeleni
```

---

# 68. Završni arhitektonski stav

Psihointegritet se ne razvija kao skup nepovezanih stranica, formi i endpoint-a.

Platforma se razvija kao dugoročni modularni SaaS sistem u kome su:

* tenant granice eksplicitne;
* podaci izolovani;
* sadržaj verzionisan;
* saglasnosti dokazive;
* booking transakcije bezbedne;
* maloletnička pravila ugrađena u domen;
* kompanijski podaci odvojeni od individualnih podataka;
* AI funkcionalnosti ograničene i kontrolisane;
* background poslovi pouzdani;
* produkciono okruženje odvojeno;
* promene baze migracione i auditabilne;
* dijagnostika read-only;
* poslovni domeni spremni za postepeni rast.

Ova arhitektura omogućava da trenutni javni Psihointegritet sajt preraste u platformu sa CMS-om, Kompasom, booking sistemom, kompanijskim programima, klijentskim nalozima i dodatnim tenant organizacijama bez rušenja ili ponovnog pisanja osnovnih tehničkih slojeva.

