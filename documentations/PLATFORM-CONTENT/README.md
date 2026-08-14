# Platform content source registry

Ovaj direktorijum čuva vlasničke, stručne i pravne izvore iz kojih se pripremaju content
paketi. Runtime aplikacije ne čita ove fajlove. Prisustvo dokumenta nije approval.

## Organizacija

```text
public-site/en/       vlasnički izvor za engleski javni sajt
public-site/sr-Latn/  vlasnički izvor za srpski javni sajt
therapists/           biografije, zvanja i stručni profili
services/             usluge, cene, trajanja, formati i pravila
intake-matching/      pitanja, matching i safety semantika
research/             stvarna Research pitanja i opcije
compass/              stručni Kompas tekstovi i urednički izvori
companies/            B2B ponuda i pravila programa
legal/                pravni tekstovi i saglasnosti
```

Prazan direktorijum znači da izvor još nije dostavljen; ne daje dozvolu da se sadržaj
izmisli. `CONTENT_GAPS.yaml` je registar dostavljenih izvora, praznina, statusa i traženih
odobrenja.

## Obavezna metadata

Tekstualni izvor treba da ima zaglavlje; za PDF/DOCX i druge binarne izvore isti podaci se
vode u `CONTENT_GAPS.yaml`:

```yaml
content_id: homepage.hero
locale: en
source: owner | clinician | legal | platform
status: draft | in_review | approved | published | archived | missing
approvals_required: [business, clinical]
updated_at: 2026-08-13
```

`content_id` je stabilan identitet sadržajne celine, ne naziv fajla. `locale` je `en`,
`sr-Latn` ili `not_applicable`. `source` opisuje autoritet izvora. Samo dokumentovan approval
sme da promeni status u `approved` ili `published`.

## Granica odgovornosti

Codex može pripremiti sistemske prevode, user-safe greške, neutralni starter copy, CMS help,
SEO/CTA smernice i jasno označene showcase podatke. Biografije i zvanja, usluge/cene/pravila,
Intake/safety semantika, stručni Kompas tekstovi, stvarna Research pitanja i pravni tekstovi
ostaju `draft`/`in_review`/`missing` dok nadležni vlasnik ne odobri sadržaj.

Nedostajući approval blokira finalni status tog sadržaja. Ne blokira registry infrastrukturu,
neutralni `mental-health-starter`, `blank` paket ni jasno označen showcase.
