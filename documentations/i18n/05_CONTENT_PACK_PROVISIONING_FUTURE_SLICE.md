# Content pack provisioning — future slice

**Status:** future provisioning work; nije deo aktuelnog i18n milestone-a niti runtime
modela.

## Trenutni ugovor

- C2(a) deployment opslužuje jednu verifikovanu organizaciju.
- Checked-in organization/deployment registry bira `psihointegritet` pack.
- Ne postoji `organizations.pack_id`, `packId` API polje ni javni izbor paketa.
- `mental-health-starter` i `blank` su spremni izvori za budući provisioning, ne implicitni
  fallback nepoznatom tenant-u.

## Buduća odluka i implementacija

Provisioning workflow treba eksplicitno da ponudi `mental-health-starter` kao preporučenu i
`blank` kao praznu opciju. Pre implementacije mora biti odobreno da li se izbor:

1. materijalizuje u tenantove početne CMS entry/revision zapise; ili
2. čuva kao nepromenljivi provisioning receipt iz kojeg se inicijalni sadržaj pravi jednom.

Slice mora imati idempotency ključ, audit događaj, tačan actor/source, početni
`draft`/`in_review` status i rollback bez gubitka tenantovih kasnijih izmena. Ponovljeni
provisioning ne sme da prepiše custom CMS sadržaj. Objavljivanje i approval ostaju zasebne
radnje.

## Gate

- izbor je autorizovan i auditovan;
- oba locale-a se materijalizuju sa istim stabilnim identitetima;
- `blank` CMS pomoć nikad ne postaje javni copy;
- demo Research odgovori nikad ne ulaze u stvarne aggregate tabele;
- retry je idempotentan, a rollback ne briše tenantove izmene;
- DB/API schema promena dobija zasebnu migraciju i review tek kada se izabere persistence
  model.
