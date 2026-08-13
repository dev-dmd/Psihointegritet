# Psihointegritet — izvori sadržaja, demo i starter paketi v1.0

**Cilj:** platforma mora biti potpuno prezentabilna na engleskom i srpskom, bez izmišljanja
stručnih, kliničkih ili pravnih tvrdnji i bez praznih ekrana koji ne pokazuju proizvod.

## 1. Jedan izvor istine ne znači jedan ogroman fajl

Preporučena struktura:

```text
frontend/src/content/
  schema.ts
  registry.ts
  server.ts
  use-content.ts
  resolve-field.ts
  packs/
    psihointegritet/
      en/
        index.ts
        public.ts
        workspace.ts
        research.ts
        guidance.ts
        compass.ts
        booking.ts
      sr-Latn/
        ...isti domeni...
    mental-health-starter/
      en/...
      sr-Latn/...
    blank/
      index.ts
```

Jedini dozvoljeni javni pristup:

```ts
getFallbackContent({ packId, locale });
useFallbackContent();
resolveContentField({ override, fallback });
```

Komponente ne importuju direktno `packs/**`, ne pozivaju `pickContent()` i ne biraju locale
u modulskoj konstanti.

## 2. Tri početna paketa

### 2.1 `psihointegritet`

Kompletan demonstracioni i stvarni početni sadržaj za `psihointegritet.com`:

- landing i sve postojeće javne stranice;
- Hero, banneri, CTA i footer;
- profili terapeuta;
- usluge, cene, trajanja i formati;
- rad sa kompanijama;
- roditelji i adolescenti;
- primeri za Intake, Research i Kompas;
- workspace showcase podaci;
- engleska i srpska verzija istog strukturnog oblika.

Ovaj paket nije automatski starter za druge centre jer sadrži identitet, tim, cene i tvrdnje
Psihointegriteta.

### 2.2 `mental-health-starter`

Neutralan početni paket za novu organizaciju:

- objašnjava šta svaka sekcija treba da postigne;
- koristi dobru SEO strukturu i jasne CTA putanje;
- prati semantički HTML i pristupačnost;
- ne izmišlja terapeute, kvalifikacije, licence, gradove, cene ili pravni status;
- ne daje kliničke tvrdnje, dijagnoze ni obećanja ishoda;
- nije kopija Psihointegriteta sa promenjenim nazivom.

Primer neutralne poruke može biti stvaran javni tekst:

```text
Professional support tailored to your needs.

Learn about the center's approach, available services and the professionals
who provide them, then choose the next step that feels right for you.
```

CMS pomoć poput „ovde unesite korist za korisnika” ne prikazuje se javno. Ona pripada
`helpText`/`editorGuidance`, odvojeno od fallback copy-ja.

### 2.3 `blank`

Prazan tenant dobija:

- strukturne sekcije i sistemske oznake;
- CMS uputstva i validaciju;
- dobre empty state prikaze;
- ništa što izgleda kao objavljena stručna ili poslovna tvrdnja.

`blank` nije podrazumevana preporuka. Preporučeni onboarding je neutralan starter paket,
jer korisniku štedi vreme i pokazuje namenu sistema.

## 3. Ko sme da napiše koji sadržaj

| Sadržaj | Codex sme sam | Potreban materijal/odobrenje |
| --- | --- | --- |
| Sistemska dugmad, tabovi, statusi i empty states | Da | Product review |
| Jasne korisničke error poruke | Da | Product/UX review |
| Neutralni starter SEO/CTA copy | Da | Product review pre release-a |
| Prevod postojećeg potvrđenog copy-ja | Da, kao draft | Vlasnik odobrava značenje i ton |
| Biografije i stručna zvanja imenovanih terapeuta | Ne izmišljati | Pisani vlasnički izvor i approval |
| Cene, trajanja, formati i pravila usluge | Ne izmišljati | Poslovna odluka/izvor |
| Intake pitanja i matching capability | Samo prevesti postojeći ugovor | Stručna potvrda |
| Safety/escalation tekst | Ne menjati semantiku | Stručni i legal approval |
| Research pitanja | Može demo primer, jasno označen | Stvarnu anketu odobrava vlasnik |
| Kompas stručni članak/e-book | Ne proglašavati finalnim | Tekst stručnog autora i review |
| Preporuke knjiga, filmova, videa | Ne predstavljati kao stručnu preporuku bez izvora | Urednički approval |
| Pravni tekst i saglasnosti | Ne pisati finalno | Pravnik/vlasnik |

## 4. Odgovor na pitanje „da li Codex samo prevodi ili dobija dokumente”

Koristi se mešoviti model:

### Codex odmah radi

- sistemski UI na oba jezika;
- error katalog na oba jezika;
- kompletan neutralni starter paket;
- prevod postojećeg fallback sadržaja koji je očigledno proizvodni/demo copy;
- CMS `helpText`, SEO smernice, CTA smernice, character limit i preview objašnjenja;
- demo strukturu i bezbedne, jasno označene showcase podatke.

### Dokumenti se dostavljaju pre finalnog domen-specifičnog sadržaja

U `documentations/PLATFORM-CONTENT/` treba organizovati:

```text
PLATFORM-CONTENT/
  README.md
  public-site/
    en/
    sr-Latn/
  therapists/
  services/
  intake-matching/
  research/
  compass/
  companies/
  legal/
```

Svaki dokument ima metadata zaglavlje:

```yaml
content_id: homepage.hero
locale: en
source: owner | clinician | legal | platform
status: draft | in_review | approved | published | archived
approvals_required: [business, clinical]
updated_at: 2026-08-13
```

Dokumenti su ulaz za migraciju i review; runtime ne čita Markdown/PDF iz
`documentations/PLATFORM-CONTENT`.

Za binarne vlasničke izvore metadata se vodi u susednom `CONTENT_GAPS.yaml` manifestu.
Status `approved` se nikada ne zaključuje na osnovu samog prisustva fajla.

## 5. Demo i stvarni podaci ne smeju biti pomešani

Preporučena konfiguracija:

```ts
type DemoDataMode = "showcase" | "empty" | "off";
```

- `showcase` prikazuje read-only primere sa jasnom oznakom `Demo podaci` ili
  `Primer prikaza`;
- `empty` prikazuje smislen empty state i objašnjava kako podaci nastaju;
- `off` prikazuje samo stvarne DB podatke.

Ne upisivati izmišljene Research odgovore u produkcione agregate. Ako stvarnih odgovora nema,
panel može prikazati odvojenu showcase karticu koja ne ulazi u broj stvarnih odgovora.

Isto važi za:

- prihode i poslovnu analitiku;
- klijente i termine;
- Intake slučajeve;
- kompanijske fondove;
- Diagnostic incidente.

## 6. Field-level tenant override

Za aktivni tenant zapis:

Postojeći slot-level `inherit | override | hidden` ostaje. Na nivou polja važi:

```text
postojeća primitivna vrednost      → custom; prikazati kako je unesena
missing, null ili postojeći ""    → inherit; fallback istog ui_locale i paketa
eksplicitni { mode: "hidden" }    → ne prikazivati opciono display polje
```

Required H1, accessibility polja, neophodni CTA/accessibility label i SEO fallback ne mogu
biti skriveni. Ugovor ostaje u postojećem JSON-u; nema nove DB kolone ni masovne migracije.

Ne radi se language detection. Ne postoji upozorenje da je admin uneo srpski tekst dok mu
je sistem na engleskom. Ne postoji automatski prevod. To je autorska sloboda i odgovornost
tenanta.

## 7. UX redosled posle i18n osnove

Ovaj milestone ne redizajnira poslovne workflow-e.

1. Završiti locale, fallback, poruke i error contract.
2. Poseban slice: maksimalno pojednostaviti Kompas unos bez promene domena i lifecycle-a.
3. Poseban slice: pojednostaviti CMS uređivanje stranica i sekcija.
4. Poseban slice: Services CRUD i Availability/Booking unos.

I18n refaktor sme da izdvoji copy, tipove i adaptere potrebne za budući UX, ali ne sme usput
da vrati nestalo dugme, promeni redosled Booking unosa ili prepravi Kompas flow.

## 8. Provisioning granica

Aktuelni C2(a) runtime bira paket iz proverene deployment organization konfiguracije. To
nije organization DB polje i nije korisnički izbor. `psihointegritet` je mapiran samo na
verifikovane Psihointegritet deployment slugove.

Izbor `mental-health-starter` ili `blank` za novu organizaciju i trajno skladištenje tog
izbora pripadaju zasebnom budućem provisioning slice-u. Taj slice mora odlučiti da li se
paket materijalizuje u početne CMS revizije ili ostaje provisioning receipt, definisati
idempotency/audit i review status, i dokazati da ponovno pokretanje ne prepisuje tenantove
izmene. Do tada nema `packId` kolone, javnog pack parametra ni runtime tenant switchera.
