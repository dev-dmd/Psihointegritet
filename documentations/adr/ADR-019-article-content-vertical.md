# ADR-019 — Article vertikala: tip, telo, autorstvo i objava

**Status:** Accepted  
**Datum:** 2026-08-03  
**Vlasnik tehničke odluke:** Milan Dražić (CTO)  
**Vlasnik stručnih podataka:** Anja Stamenković i ovlašćeni stručni tim  
**Povezano:** D-046 · D-047 · D-048 · ADR-016 · ADR-017 (+ Amandman 1) · ADR-018 · **ADR-021** · ADR-022 · ADR-025 · `KOMPAS_TODO.md` K3A · `CMS_TODO.md`

---

## 1. Kontekst

`ContentType` danas namerno nema `article`. To piše u kodu (`modules/content/models.py:68`) i čuva se testom `test_article_is_not_a_cms_core_content_type` (`backend/tests/unit/test_content_models.py:89-95`). Razlog je bio dobar: bez stvarnog teksta svaki model članka bio bi nagađanje.

Taj razlog je 2026-08-03 prestao da važi. Anja i stručni tim predali su prvi članak, `anksioznost-nije-vas-neprijatelj.docx`. Dokument je propušten kroz stvarni `convert_docx_bytes` i to je pokazalo činjenice koje bi se pretpostavkom promašile:

| Činjenica | Posledica po model |
| --- | --- |
| 505 reči, 3217 znakova, 16 pasusa → 13 RichDoc blokova | telo je red veličine članka, ne kartice; postojeći `richParagraph` limit (1200) je premali |
| naslov je **bold pasus**, u dokumentu ima **0 heading blokova** | uvoz ne sme da traži `Heading 1` da bi našao naslov |
| četiri pitanja su **nenumerisana** lista (`numFmt=bullet`) | mapiranje koje traži `ordered: true` ne bi našlo ništa |
| oba citata su **inline tekst** u pasusu 5, `QuoteBlock` ne postoji | pravilo za citate mora da gleda tekst, ne blok tip |
| vežba uzemljenja i tvrdnja o nervnom sistemu su u istom pasusu | praktičan blok i tvrdnja koja traži stručnu proveru su isti tekst |

Tekst ima najmanje pet uloga: prepoznavanje iskustva, stručno objašnjenje, pitanja za samorefleksiju, praktičan postupak i završna poruka sa vezom ka psihoterapiji. Sistem se prilagođava takvom prirodnom tekstu — Anja ne piše prema tehničkim slotovima.

---

## 2. Odluka

**Uvodi se `ContentType.ARTICLE` sa šablonom `article_detail`, čije je telo segmentirano po receptu `article-v1` iz ADR-021. Članak se objavljuje na `/znanje/<slug>`, nosi kontrolisani javni potpis autora, traži stručno i poslovno odobrenje, i ne sme ga odobriti osoba koja ga je napisala.**

---

## 3. Identitet i ruta

- Jedan `ContentEntry` po članku; jedinstvenost već garantuje `uq_content_entry_slug` (`models.py:118-125`).
- Javna ruta je `/znanje/<slug>`, kao nova grana ispod postojeće `/znanje` stranice. Ime `znanje` je već rezervisano prema custom pravnim dokumentima (`contracts/fixtures/reserved-custom-document-slugs.v1.json`), pa nema sudara sa `app/(public)/[documentSlug]`.
- **Članci izlaze iz `SYSTEM_CONTENT_TEMPLATES` allowlist-a.** Taj registar je zatvorena lista od dvanaest sistemskih stranica i ostaje netaknut; uvodi se zaseban put identiteta za članke, sa sopstvenim pravilima za slug i rezervisanim imenima. Allowlist ostaje **jedini** način da nešto postane sistemska definicija.

Odbačeno: dodavanje svakog članka u allowlist. Broj članaka je neograničen, a allowlist je namerno konačan skup poznatih stranica.

---

## 4. Model tela — segmentirani slotovi

Telo ide u postojeći `ContentRevision.slot_data`, ne u novu kolonu.

| Razlog | Detalj |
| --- | --- |
| Content Health radi bez ijedne nove linije | `authored_content_findings` šeta `SLOT_SPEC_REGISTRY[template]`; `RichFieldSpec` odmah donosi `RICH-001…006`, `LIMIT-001` i `MODEL-003` |
| Parity dokaz već postoji | `contracts/fixtures/slot-schema.v1.json` je serijalizovan registar sa dvostranim testom (Python + TS) |
| Nula DDL-a | `slot_data` je i uveden tako da nov slot ne traži migraciju (`models.py:178-181`) |

Odbačeno: prvoklasna `body` kolona po uzoru na `LegalDocumentRevision.body`. Bila bi nevidljiva za Content Health prolaz, nema fixture ni TS blizanca, i ostala bi trajno `NULL` za svih dvanaest sistemskih stranica, tri usluge, tri terapeuta i sedam programa — tačno onaj „placeholder column” koji modul zabranjuje u svom docstring-u.

Sekcije recepta `article-v1`, redosled renderovanja je redosled tabele:

| Sekcija | Obavezna | Sadržaj |
| --- | --- | --- |
| `hero` | da | naslov, opcioni uvodni pasus za karticu |
| `byline` | da | kontrolisana referenca na objavljeni `therapist` entry |
| `body_intro` | da | RichDoc |
| `questions` | ne | uvodna rečenica + lista pitanja |
| `practice` | ne | naslov + koraci |
| `body_outro` | ne | RichDoc |
| `sources` | ne | repeater `{ citation, url }` |
| `cta` | ne | najviše dva kontrolisana CTA-a |

`questions` i `practice` su `standaloneCapable` po receptu. Da bi Kompas preporučio takav blok nezavisno od članka, autor ga mora **eksplicitno označiti** kao samostalno upotrebljiv na toj reviziji. Bez te potvrde blok postoji u tekstu, ali ne i kao zasebna preporuka.

---

## 5. Autor naspram operatera

Dva različita pojma koja se ne smeju spojiti:

- **Javni potpis** je kontrolisana referenca na objavljeni `therapist` entry, čuvana u `byline` slotu. To je stručno autorstvo i prikazuje se javno.
- **Operater** je `created_by_user_id` / `updated_by_user_id` na reviziji. To je evidencija ko je tehnički uneo i menjao tekst i **nikada se ne prikazuje javno**.

Anja sme da unese tekst koji je napisala Marija; potpis tada nosi Marija, evidencija Anju.

**Tehnički dug, svesno prihvaćen:** v1 koristi postojeći `CtaFieldSpec` sa `target_type=THERAPIST` za potpis, jer validacija već zahteva `therapist:` prefiks a editor već ima birač cilja. Semantički to nije CTA. Čist put je nova vrsta polja `reference`, koja košta oba registra, fixture, oba validatora i editor. Prelazak je aditivan i radi se kad se pojavi drugi slučaj reference.

---

## 6. Izvori i citati

`sources` je opcioni repeater i **nikada nije obavezan šemom**. Obavezno polje bi teralo autora da izmisli citat da bi objavio tekst.

Umesto toga, citat ili atribucija bez izvora proizvodi savetodavni nalaz koji traži stručno odobrenje (§8). U stvarnom članku to su Perlsov „jaz između sada i kasnije” i Andrićev citat — oba bez izvora u predatoj verziji.

---

## 7. SEO i JSON-LD

Članak dobija `schema.org/Article` sa `headline`, `datePublished`, `dateModified`, `author` (razrešeno iz potpisa), `publisher` i `mainEntityOfPage`.

**Izričito se ne koristi `MedicalWebPage` ni `MedicalCondition`.** Postojeća pravila `JSONLD-001`/`JSONLD-003` zabranjuju markup koji tvrdi ono što vidljivi model ne nosi, a medicinski tipovi bi predstavljali kliničku tvrdnju koju platforma nije pregledala kao takvu.

Vreme čitanja se **računa** iz dužine teksta, nikad ne unosi ručno.

---

## 8. Provera koja ne sudi o istini

Automatska provera ne odlučuje da li je stručna tvrdnja tačna. Ona prepoznaje mesta koja mora da pročita čovek sa stručnom kapabilnošću i **traži odobrenje umesto da blokira objavu**.

Mehanizam već postoji i nema nijednog korisnika: `dynamic_approvals` / `effective_required_approvals` (`modules/content/publication.py:228-245`) čitaju `requires_approval` sa nalaza, ali ga `_finding()` (`health.py:92-106`) ne ume da postavi. Nova porodica `EDIT-0xx` je prvi producent, sve `severity="warning"` sa `requires_approval=clinical`:

`EDIT-001` apsolutne formulacije · `EDIT-002` tvrdnje o telu i nervnom sistemu · `EDIT-003` praktična uputstva · `EDIT-004` citat bez izvora · `EDIT-005` atribucija bez izvora · `EDIT-006` sadržaj bez publike ili teme.

Sva pravila su izmerena na stvarnom članku i sva se okidaju. Detalji obrazaca i zamki su u `CONTENT_HEALTH_RULES_v0.2.md`.

---

## 9. Odobrenja i pravilo četiri oka

Objava traži **stručno (`clinical`) i poslovno (`business`) odobrenje**, isto kao za profil terapeuta. `EDIT-0xx` nalazi to ne menjaju nego dodatno potvrđuju.

Pravilo:

1. Autor ili urednik pravi nacrt i bira kolegu kome šalje tekst.
2. Kolega odobrava ili vraća sadržaj sa napomenom.
3. Objava je moguća tek kada postoje sva tražena odobrenja.
4. **Autor i poslednji sadržajni urednik ne mogu dati odobrenje sopstvenoj reviziji.**
5. Isti kolega sme da bude i recenzent i objavljivač — samo ne autor te revizije.
6. Svaka izmena posle odobrenja poništava odobrenja.

**Obim v1: samo `ContentType.ARTICLE`.** Ostalih šest tipova ostaje kako jeste, jer na produkciji trenutno postoji jedan `org_admin` i pravilo bi zaključalo uređivanje sistemskih stranica. Proširenje na sav CMS sadržaj čeka da se O-18 zatvori i biće zasebna odluka.

Tri postojeća defekta moraju biti ispravljena pre nego što pravilo ima smisla, jer bi ga inače tiho izigrala: upis `updated_by_user_id` pri odobrenju i pri objavi (recenzent time postaje „poslednji urednik”) i preživljavanje odobrenja kroz ciklus `in_review → draft → izmena → in_review`.

---

## 10. Pristup

Samo `public`. `registered` i `staff_only` postoje kao taxonomy vrednosti, ali nemaju entitlement evaluator; čekaju R5 po D-048. Članak iza registracije nije deo ove vertikale.

---

## 11. Kompas

Članak ulazi u postojeći deterministički Engine bez novog rangiranja: tačna primarna tema ima prednost, pa sekundarna, pa oblast kao širi fallback; publika, cilj i put dodatno određuju prikaz. Prikazuju se samo objavljene i potpuno kategorizovane revizije, razlog preporuke nastaje iz odobrenih veza, a isti sadržaj se deduplikuje između sekcija.

Dve granice se moraju pomeriti usklađeno, jer postoje **dva** allowlist-a: backend eligibility (`modules/content/compass_service.py:222-225`) i frontend projekcija kartice (`frontend/src/lib/compass/taxonomy-view.ts:100-113`). Ispravka samo jednog znači da članak prođe proveru i tiho nestane pre prikaza.

Segment označen kao samostalno upotrebljiv ulazi u sekciju „Praktični alati” sa dubokim linkom na sidro u članku.

---

## 12. Šta ovaj ADR ne uvodi

Zakazanu objavu · serije i kolekcije članaka · članak↔članak „pročitajte i ovo” relacije (postojeće relacije su samo ka uslugama i programima) · AI pisanje ili automatsko predlaganje metapodataka · drugi šablon članka · autorski redosled sekcija (ADR-021 §9).

Članci su van `ContentEntity` modela na frontendu, pa ih TypeScript `content:check` CLI ne pokriva. Autoritet za njih je backend Content Health; `ROUTE-001` i sitemap pravila i dalje važe za samu rutu. Proširenje `ContentEntity` kasnije je aditivno.

---

## 13. Odbačene alternative

| Alternativa | Zašto ne |
| --- | --- |
| Koristiti postojeći `static_information` | Njegova dva prozna slota su `UnmodeledSlot`, pa svaki autorski unos tela proizvodi `MODEL-003` grešku. Ukupno autorski prostor je 380 znakova, a identitet je vezan za zatvoren allowlist. |
| Inline telo bez segmenata | Jednostavnije, ali Kompas ne bi mogao da preporuči praktičan blok — a to je bila eksplicitna stručna potreba iz Anjinog dokumenta. |
| Zahtevati tri različite osobe po tekstu | Za tim od troje ljudi to znači da jedan izostanak zaustavlja objavu. Pravilo četiri oka daje istu zaštitu od samopotvrđivanja uz izvodljiv tok. |
| Pustiti automatsku proveru da blokira sporne tvrdnje | Provera nema stručnu kompetenciju i lažno pozitivan nalaz bi zaustavio tačan tekst. Zato traži čitaoca, ne ispravku. |
