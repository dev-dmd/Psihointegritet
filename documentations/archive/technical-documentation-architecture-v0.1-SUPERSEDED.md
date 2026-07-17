> ## ⛔ SUPERSEDED — v0.1, arhivirano 2026-07-17
>
> **Status:** istorijski kontekst. **Nikada ne uzimati odluke iz ovog dokumenta** (master plan §0).
>
> **Zamenjuje ga:** `technical-documentation-architecture-v0.3.md` (aktivna arhitektura).
>
> **Zašto je arhiviran:** opisuje potpuno drugačiju arhitekturu — Next.js bez zasebnog backend-a,
> Drizzle ORM i Auth.js. Projekat danas koristi **FastAPI modularni monolit + SQLAlchemy 2 + Alembic + Clerk**.
> Ako agent pomeša ova dva dokumenta, dobija se pogrešan stack.
>
> **Šta i dalje vredi pročitati:** rezonovanje o booking modelu i privatnosti — ideje su prenete u v0.3.

---

# Psihointegritet Digitalni centar

## MVP tehnička dokumentacija i arhitektura — v0.1

## Final recommendation

Next.js + TypeScript
PostgreSQL + Drizzle
Auth.js database sessions
Vercel
Resend
Upstash Redis + QStash
TanStack Query only in interactive application parts
Cloudinary + private object storage
Vitest + Playwright

## Read more

1. Sažetak tehničkih odluka
   Oblast Odluka za MVP
   Arhitektura Modularni monolit
   Frontend Next.js App Router + React + TypeScript
   Backend Next.js Route Handlers, Server Actions i application layer
   Hosting Vercel
   Baza PostgreSQL
   ORM Drizzle ORM + SQL migracije
   Autentifikacija Auth.js, database sessions, secure HTTP-only cookies
   OAuth Opcionalno kasnije; nije potreban za prvi MVP
   Tenant model organization/practice kao tenant, terapeut kao član organizacije
   Validacija Zod na svim ulaznim granicama
   Email Resend + React Email
   Poslovi i podsetnici Upstash QStash + Vercel Cron za proveru/reconciliation
   Push VAPID + web-push, kao opcioni sloj posle email podsetnika
   Keš/rate limit Upstash Redis
   Javni mediji Cloudinary
   Privatni PDF/audio materijali S3-compatible private storage sa signed URL
   Testovi Vitest + Playwright + accessibility testovi
   Plaćanje Bez obaveznog online plaćanja u početnom MVP-u

2. Osnovni arhitektonski princip

Za MVP treba napraviti modularni monolit, ne mikroservise.

Browser / PWA
│
▼
Next.js aplikacija na Vercelu
├── Public website
├── Client account
├── Therapist dashboard
├── Psihointegritet admin
├── Route Handlers / Webhooks / Jobs
└── Domain i application moduli
│
▼
PostgreSQL
│
┌───────┼────────┐
▼ ▼ ▼
Resend QStash Object storage

To omogućava da kasnije izdvojiš, na primer:

AI i knowledge servis u FastAPI;
notification engine;
payment service;
media processing;
poseban API za mobilnu aplikaciju.

3. Next.js ili FastAPI
   Odluka: Next.js full-stack za MVP

Za prvu verziju bih koristio:

Server Components za javne stranice i SEO sadržaj;
application services za poslovnu logiku;
Server Actions za mutacije iz iste aplikacije;
Route Handlers za webhooks, job endpointove, push subscriptions i budući javni API;
TanStack Query samo tamo gde postoje interaktivni dashboard podaci i optimistička ažuriranja.

4. PostgreSQL ili MongoDB
   Odluka: PostgreSQL

Ovaj domen je izrazito relacioni:

organizacija ima terapeute;
terapeut ima više usluga;
uslugu može nuditi više terapeuta;
terapeut ima recurring availability;
termin pripada klijentu, terapeutu, usluzi i organizaciji;
radionica ima sesije i prijavljene polaznike;
korisnik može biti član više organizacija sa različitim ulogama;
plaćanja, refundacije i enrollment zahtevaju transakcije;
pristup podacima zavisi od organizacije i uloge.

PostgreSQL daje:

strane ključeve i relacione integritete;
transakcije;
Row-Level Security;
range tipove;
database constraints za sprečavanje duplih termina;
kasnije full-text search i pgvector.

PostgreSQL podržava exclusion constraints nad vremenskim opsezima, što je veoma korisno za booking: baza može odbiti drugi termin koji se preklapa za istog terapeuta, čak i kada dva zahteva stignu istovremeno.

ORM

Preporuka:

PostgreSQL

- Drizzle ORM
- drizzle-kit migrations

Drizzle je SQL-first, podržava PostgreSQL, generisanje i izvršavanje migracija i prilagođen je serverless okruženjima.

Baza treba da ima:

pooled URL za aplikacioni saobraćaj;
direct URL za migracije;
staging i production odvojene baze;
automatske backup-e;
EU region, nakon provere ugovora o obradi podataka i lokacije podataka.

Ne bih još zaključavao projekat za jednog DB provajdera. Standardni PostgreSQL omogućava migraciju između Neon, Supabase, Railway Postgres ili drugog managed provajdera.

5. Multi-tenant arhitektura
   Važna odluka: terapeut nije automatski tenant

Za početnu Psihointegritet verziju tenant treba da bude:

Organization / Practice / Centar

Psihointegritet je jedna organizacija, a terapeuti su njeni članovi.

Organization: Psihointegritet
├── Anja – therapist
├── Terapeut 2
├── Terapeut 3
├── Usluge
├── Radionice
├── Sadržaji
└── Zajednički booking i administracija

Ako se kasnije priključi nezavisna praksa:

Organization: Drugi centar
├── Terapeut A
└── Terapeut B

URL struktura MVP-a

Za prvi proizvod:

/
/pronadji-podrsku
/terapeuti
/terapeuti/[slug]
/usluge/[slug]
/podrska/[topicSlug]
/radionice
/radionice/[slug]
/resursi
/resursi/[slug]
/o-nama

6.  JWT, sessions i OAuth

JWT i OAuth nisu direktne alternative.

OAuth je način prijavljivanja preko spoljnog identity providera, kao što su Google ili Apple.
JWT je format tokena.
Database session je način čuvanja aktivne prijave na serveru.
Odluka za MVP

Koristiti:

Auth.js;
database session;
session ID u secure HTTP-only cookie-ju;
email i lozinku;
potvrdu email adrese;
reset lozinke;
session revoke;
MFA za terapeute i administratore.

Auth.js podržava i JWT i database session strategiju. Za ovu aplikaciju database sessions su bolji jer se sesija može odmah povući kada se terapeut deaktivira, promeni uloga ili se primeti sumnjiv pristup.

Cookie postavke:

HttpOnly: true
Secure: true
SameSite: Lax
Path: /
Domain: ne postavljati šire nego što je potrebno

Sesijski podaci ne treba da sadrže informacije o razlogu dolaska, terapeutskim temama ili zakazanim uslugama. OWASP preporučuje secure session cookies, jaku zaštitu lozinki i MFA za osetljive naloge.

OAuth

Google OAuth može biti dodat kasnije kao opcioni način prijave, ali ga ne bih postavljao kao jedinu ili primarnu mogućnost.

JWT kasnije

JWT ima smisla za:

Next.js → FastAPI service-to-service pristup;
mobilni API;
kratkotrajne signed tokens;
private download URL;
jednokratne akcije.

7. Uloge i autorizacija

Predložene uloge:

Uloga Pristup
Visitor Javni sadržaj, terapeuti, usluge, guided selection
Client Svoji termini, prijave, materijali i podešavanja
Therapist Svoj profil, usluge, dostupnost, dodeljeni termini
Content editor Blog, vodiči, radionice i javni sadržaj
Organization admin Tim, sadržaj, usluge, termini i organizacija
Platform admin Organizacije, sistem, support i tehnička administracija

Autorizacija mora da proverava:

Da li je korisnik prijavljen?
Da li ima odgovarajuću ulogu?
Da li pripada organizaciji?
Da li sme da vidi baš taj resurs?
Da li je operacija dozvoljena u trenutnom statusu?

Ne sme se proveravati samo:

if (session.user.role === "therapist")

Mora se proveriti i da je termin dodeljen tom terapeutu i da je iz iste organizacije.

8. Predlog modela podataka
   Identity i organizacije
   organizations
   organization_domains
   users
   auth_accounts
   auth_sessions
   memberships
   client_profiles
   therapist_profiles
   therapist_credentials

therapist_credentials služi za javno predstavljene edukacije, sertifikate i status interne verifikacije. Ne treba automatski tvrditi da platforma izdaje ili garantuje licence ako pravni proces za to ne postoji.

Teme i usluge
topics
therapist_topics
services
therapist_services
service_formats

Primer:

topic: partnerski-odnosi
service: partnersko savetovanje
therapist: Anja
format: online / uživo
duration: 60 min
price: 5.000 RSD
Booking
availability_rules
availability_exceptions
appointment_holds
appointments
appointment_events
cancellation_policies
Guided selection
guidance_sessions
guidance_answers
recommendation_rules
recommendation_results

Naziv modula bih namerno postavio kao guidance, a ne clinical_triage.

Sadržaj
articles
article_authors
content_categories
media_assets
resources
resource_access_grants
Radionice i programi
programs
program_sessions
program_facilitators
enrollments
attendance_records
Notifikacije
notification_preferences
notification_jobs
notification_deliveries
push_subscriptions
email_events
Privatnost i bezbednost
consents
privacy_requests
audit_logs
security_events
Tabele koje napraviti kao rezervu, ali ne uključivati u MVP UI
payment_orders
payment_events
conversations
messages
progress_entries
knowledge_documents
knowledge_chunks
outbox_events
feature_flags

One ne moraju sve biti migrirane prvog dana. Bitno je da moduli i imenovanje ne blokiraju njihovo kasnije dodavanje.

9. Booking engine
   Podaci o vremenu

Sve datume u bazi čuvati u UTC.

Dodatno čuvati:

organization.timezone
therapist.timezone
client.timezone
appointment.bookingTimezone

Koristiti IANA vrednosti:

Europe/Belgrade
Europe/Vienna
America/Toronto
Australia/Sydney

To je posebno važno zbog dijaspore.

Availability model

Terapeut podešava recurring availability:

Ponedeljak 09:00–14:00
Utorak 14:00–20:00
Četvrtak 10:00–16:00

Izuzeci:

godišnji odmor
privatna obaveza
dodatni radni dan
poseban termin
Booking flow

1. Korisnik bira terapeuta ili dobija preporuke
2. Bira uslugu
3. Sistem računa validne slotove
4. Klik na slot pravi appointment hold
5. Hold traje npr. 10 minuta
6. Korisnik unosi minimalne kontakt podatke
7. Kreira nalog ili potvrđuje email
8. Termin prelazi u requested ili confirmed
9. Kreiraju se notification jobs
10. Korisnik dobija potvrdu
    Statusi
    draft
    held
    requested
    confirmed
    reschedule_requested
    cancelled_by_client
    cancelled_by_therapist
    completed
    no_show
    Sprečavanje double-booking problema

Zaštita treba da postoji na tri nivoa:

frontend više ne prikazuje zauzet slot;
booking servis proverava dostupnost u transakciji;
PostgreSQL exclusion constraint sprečava preklapanje kao poslednja zaštita.

10. Guided selection — bez dijagnostike

Prvi upitnik ne treba da koristi AI.

Koristi deterministička pravila:

razlog dolaska
vrsta podrške
online / uživo
jezik
vremenska zona
raspoloživost
odrasla osoba / par / roditelj

Primer pravila:

partnerski odnos

- želi rad u paru
- online
- večernji termin

→ prikaži terapeute koji:
rade sa parovima,
nude online format,
imaju večernju dostupnost

Rezultat prikazuje 2–4 opcije i objašnjava zašto su prikazane.

Ne koristiti:

„najbolji terapeut za vas“;
„na osnovu simptoma utvrdili smo“;
„vaša procena pokazuje“;
automatsku dijagnozu;
procenu rizika bez stručnog protokola.
Slobodno tekstualno polje

Ne bih ga imao u prvom upitniku.

Čak i odgovor na pitanje „zbog čega tražite podršku“ može otkriti podatke o zdravstvenom ili emocionalnom stanju. Podaci koji se odnose na zdravlje spadaju u posebno zaštićenu kategoriju, a srpski Zakon o zaštiti podataka primenjuje se na automatizovanu obradu podataka o ličnosti.

Guided-selection rezultat može ostati anoniman dok korisnik ne odluči da zakaže. Anonimne sesije treba automatski brisati posle kratkog perioda koji se definiše retention politikom.

11. Privatnost i sigurnost podataka
    MVP ne čuva
    dijagnoze;
    terapijske beleške;
    transkripte seansi;
    detaljne dnevnike emocija;
    snimke seansi;
    neograničen terapeut-klijent chat;
    procene ili zaključke o mentalnom stanju;
    medicinsku dokumentaciju.

MVP čuva samo:

identitet i kontakt potreban za uslugu;
rezervaciju;
izabranu uslugu;
status termina;
consent evidenciju;
program na koji je korisnik prijavljen;
minimalnu istoriju neophodnu korisniku i terapeutu.
Obavezne mere
Kontrola pristupa
tenant scoping;
RBAC;
resource ownership;
RLS kao dodatna zaštita;
MFA za staff;
periodični session revoke.
Podaci
TLS svuda;
enkripcija managed baze i storage-a;
application-level encryption za buduća posebno osetljiva polja;
signed URL za privatne materijale;
backup i test vraćanja backup-a;
definisana retention i deletion politika.
Aplikacija
Zod validacija;
parameterized SQL kroz ORM;
Content Security Policy;
HSTS;
X-Content-Type-Options;
Referrer-Policy;
zaštita od CSRF-a;
rate limit;
request body limiti;
zaštita file upload-a;
webhook signature verifikacija;
idempotency keys;
redigovanje podataka iz logova.

OWASP ASVS može biti security checklist projekta, a bezbednosni događaji i administrativne promene moraju imati audit trag.

Pravna dokumentacija pre javnog lansiranja
Politika privatnosti;
Uslovi korišćenja;
Cookie politika;
pravila zakazivanja i otkazivanja;
objašnjenje guided-selection procesa;
saglasnosti i pravni osnov obrade;
lista obrađivača podataka;
proces pristupa, ispravke, izvoza i brisanja podataka;
security incident procedura;
procena da li je potrebna formalna DPIA;
ugovori o obradi podataka sa dobavljačima.

Ovo treba da pregleda pravnik koji poznaje srpske propise i, zbog korisnika iz dijaspore, primenjivost GDPR-a. Ovo nije deo koji treba rešavati generički generisanim tekstom bez pravne revizije.

12. Sadržaj i media storage
    Javni materijali

Za:

fotografije terapeuta;
hero slike;
javne covere;
blog slike;

može se koristiti Cloudinary.

Privatni materijali

Za:

PDF vodiče dostupne samo polaznicima;
audio sadržaje;
e-bookove;
materijale između susreta;

koristiti private S3-compatible storage:

bucket private
→ aplikacija proverava pravo pristupa
→ izdaje kratkotrajni signed URL
→ korisnik preuzima datoteku

Ne čuvati privatne fajlove kao javne Cloudinary URL-ove.

Content editor

Za pilot sadržaj možeš krenuti sa sadržajem u kodu/MDX-u da se ne blokira razvoj.

Nakon pilot lansiranja:

minimalni CMS;
draft/published status;
author;
version history;
preview;
structured rich text;
sanitizovan render.

13. Email, push i background jobs
    Email je primarni kanal

Koristiti Resend za:

potvrdu emaila;
zahtev za termin;
potvrđen termin;
promenjen termin;
otkazivanje;
podsetnik;
prijavu na radionicu;
reset lozinke.

Resend ima direktnu Next.js integraciju preko Node SDK-a.

Scheduling

Preporučeni model:

QStash za konkretno odložene poruke i retry;
Vercel Cron za reconciliation, npr. proveru neuspelih ili propuštenih poslova;
notification job u bazi kao izvor istine.

QStash podržava delayed delivery, schedule i retry, dok Vercel Cron poziva Vercel Functions prema rasporedu.

Push notifikacije

VAPID + web-push ostaviti za MVP 1.1.

Push API zahteva service worker i eksplicitnu korisničku pretplatu.

Service worker:

sluša push;
prikazuje notification;
ne treba da ima fetch caching u prvoj verziji;
ne sme biti uslov za pouzdan appointment reminder.

Email ostaje obavezan kanal, push je dodatni.

14. Plaćanja
    Preporuka: ne integrisati PayPal i Payoneer zajedno u prvom MVP-u

To bi odmah uvelo:

dva checkout flow-a;
dve vrste webhook-a;
dva reconciliation procesa;
refund logiku;
različite valute i provizije;
accounting komplikacije;
merchant onboarding;
dispute scenarije.
Najčistiji MVP

Za terapiju:

rezervacija na platformi
→ plaćanje direktno terapeutu / centru
→ platforma ne obrađuje online uplatu

Za radionice:

prijava
→ instrukcije za bankovnu uplatu
→ admin potvrđuje uplatu

Ovo omogućava validaciju booking i programskog flow-a bez čekanja payment ugovora.

PayPal kao privremena opcija

PayPal zvanično nudi poslovnim korisnicima u Srbiji mogućnost primanja PayPal i kartičnih uplata na sajtu.

Ako Anja želi online plaćanje pre domaće banke:

jedan PayPal Business nalog;
prvo samo radionice i online programe;
eventualno dijaspora;
bez split payout-a;
bez automatskog deljenja prihoda terapeutima;
tek nakon potvrde knjigovođe i provere PayPal uslova za konkretan pravni subjekt.
Payoneer

Payoneer ima Checkout proizvod, ali u javno dostupnoj zvaničnoj dokumentaciji koju sam pronašao nema dovoljno jasne potvrde da će Psihointegritet kao trgovac iz Srbije biti prihvaćen za taj proizvod. Dostupnost naloga i cross-border uplata nije isto što i odobren Payoneer Checkout merchant nalog.

Zato:

Payoneer ne treba da bude tehnička pretpostavka MVP arhitekture.

Kasnija domaća integracija

Kada dobije odgovarajući merchant ugovor sa bankom ili gateway-em:

hosted checkout;
kartični podaci nikada ne prolaze kroz naš server;
payment intent/order pre redirecta;
potpisan webhook;
idempotent processing;
refund evidencija;
valuta i poreski podaci;
usklađivanje sa računima i fiskalnim obavezama.

15. Predloženi tehnološki stack
    Osnovni
    Next.js
    React
    TypeScript strict
    Tailwind CSS
    Headless UI
    Heroicons
    Framer Motion
    Zod
    Data i backend
    PostgreSQL
    Drizzle ORM
    drizzle-kit
    Auth.js
    Upstash Redis
    Upstash QStash
    Forme i vreme
    React Hook Form
    @hookform/resolvers
    date-fns
    date-fns-tz
    rrule

rrule koristiš za recurring availability, dok date-fns-tz rešava prikaz i konverziju termina kroz različite vremenske zone.

Client data
@tanstack/react-query

Ne bih obmotavao ceo javni sajt QueryProviderom bez potrebe. Koristiti ga u:

therapist dashboardu;
client appointments;
booking wizardu;
admin listama;
optimističkim izmenama.

Public landing, blog i profil terapeuta treba pretežno da budu Server Components.

Lokalizacija
next-intl

Od početka predvideti:

sr-Latn
sr-Cyrl kasnije
en kasnije

Sadržaj može početi samo na srpskom latinicom, ali ruta i data model ne treba da blokiraju buduće prevode.

Email i push
resend
@react-email/components
web-push
Media
Cloudinary za javne slike
S3/R2 SDK za privatne materijale
Observability
Sentry ili ekvivalent
structured logger
audit log u PostgreSQL-u

Sentry mora imati PII scrubbing i ne sme primati razlog dolaska, tekst upitnika ili privatne poruke.

Testovi
Vitest
Testing Library
Playwright
@axe-core/playwright
Opcioni alati
sanitize-html ili kontrolisani rich-text renderer
nanoid / UUIDv7
OpenAPI generator iz Zod schema kasnije

16. Organizacija koda
    src/
    ├── app/
    │ ├── (public)/
    │ │ ├── page.tsx
    │ │ ├── terapeuti/
    │ │ ├── podrska/
    │ │ ├── usluge/
    │ │ ├── radionice/
    │ │ └── resursi/
    │ │
    │ ├── (auth)/
    │ │ ├── prijava/
    │ │ ├── registracija/
    │ │ └── verifikacija/
    │ │
    │ ├── (client)/
    │ │ └── moj-prostor/
    │ │
    │ ├── (staff)/
    │ │ ├── terapeut/
    │ │ └── administracija/
    │ │
    │ └── api/
    │ ├── auth/
    │ ├── v1/
    │ ├── webhooks/
    │ ├── jobs/
    │ └── push/
    │ │
    │ │
    │ └── (superadmin)/
    │ └── superadmin/
    │ ├── layout.tsx
    │ ├── page.tsx
    │ ├── diagnostics/
    │ ├── organizations/
    │ ├── users/
    │ ├── therapists/
    │ ├── appointments/
    │ ├── content/
    │ ├── notifications/
    │ ├── audit/
    │ ├── security/
    │ └── system/
    │
    ├── modules/
    │ ├── identity/
    │ ├── organizations/
    │ ├── therapists/
    │ ├── topics/
    │ ├── services/
    │ ├── booking/
    │ ├── guidance/
    │ ├── content/
    │ ├── programs/
    │ ├── notifications/
    │ ├── privacy/
    │ └── payments/
    │
    ├── infrastructure/
    │ ├── db/
    │ ├── email/
    │ ├── push/
    │ ├── queue/
    │ ├── storage/
    │ ├── payments/
    │ └── observability/
    │
    ├── shared/
    │ ├── auth/
    │ ├── security/
    │ ├── schemas/
    │ ├── errors/
    │ └── ui/
    │
    └── proxy.ts

### Superadmin nije isto što i administrator Psihointegriteta

backend/src/
├── modules/
│ ├── diagnostics/
│ ├── organizations/
│ ├── identity/
│ ├── therapists/
│ ├── booking/
│ └── notifications/
└── api/v1/
└── superadmin/
├── diagnostics.py
├── organizations.py
├── users.py
├── audit.py
└── system.py

Svaki poslovni modul:

booking/
├── domain/
├── application/
├── infrastructure/
├── schemas/
├── queries/
├── commands/
└── ui/

Pravilo:

UI ne sadrži booking poslovnu logiku, a Route Handler ne piše direktno komplikovane SQL upite.

17. Event/outbox priprema za buduće engines

Odmah uvesti domain events, čak i ako ih obrađuje isti monolit:

user_registered
therapist_profile_published
appointment_requested
appointment_confirmed
appointment_rescheduled
appointment_cancelled
appointment_completed
program_enrollment_created
resource_access_granted
payment_completed

outbox_events tabela:

id
organization_id
event_type
aggregate_type
aggregate_id
payload
created_at
processed_at
attempts

Booking transakcija:

create appointment

- create appointment event
- create outbox event

Sve u istoj DB transakciji.

Kasnije Notification Engine, AI layer, analytics ili membership sistem slušaju iste događaje bez menjanja booking jezgra.

18. Slojevi koje sada preskačemo, ali ostavljamo prostor
    Communication Engine

Kasnije:

administrativne poruke;
komunikacija oko termina;
materijali između susreta;
jasno radno vreme i očekivano vreme odgovora;
razdvajanje administrativne komunikacije od terapijskog sadržaja.
Learning/Resource Engine

Kasnije:

PDF;
audio;
video;
moduli;
napredak kroz program;
dodela materijala klijentu.
AI layer

Kasnije:

navigacija kroz platformu;
Q&A isključivo nad verifikovanim sadržajem;
odgovori sa izvorima;
pomoć u pronalaženju odgovarajuće stranice, programa ili terapeuta;
pomoć pri zakazivanju;
nikakva dijagnostika;
nikakva zamena za terapeuta.
Marketplace

Kasnije:

onboarding spoljnog terapeuta;
verifikacija;
ugovori;
članarine;
provizije;
review/moderation;
payout;
dispute procedure.
Adolescenti

Poseban modul tek posle:

pravne provere saglasnosti;
stručnih safeguarding protokola;
pravila roditeljskog/starateljskog pristupa;
kriznih procedura;
odvojenog content i UX modela.
