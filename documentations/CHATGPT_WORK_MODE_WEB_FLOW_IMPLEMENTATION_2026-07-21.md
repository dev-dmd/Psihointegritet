# ChatGPT Work Mode - Implementacija javnog website flow-a

**Datum:** 2026-07-21

## Šta je završeno

Javni sajt sada ima route-level flow umesto nepovezanih CTA i inline formi.
Header zadržava šest stavki i vodi na:

- `/pronadji-podrsku`
- `/tim`
- `/usluge`
- `/radionice`
- `/znanje`
- `/o-nama`

Primarni CTA vodi na `/zakazi?source=header`. Footer koristi potvrđeni email
`info@psihointegritet.com`, navodi Niš, Leskovac, online i uživo i sadrži samo
postojeće javne rute.

Dodate su javne rute:

- `/zakazi`
- `/pronadji-podrsku`
- `/usluge/[slug]`
- `/radionice` i `/radionice/[slug]`
- `/cene`
- `/o-nama`
- `/kontakt`
- `/podrska-roditeljima`

## Booking flow

`/zakazi` koristi postojeći `BookingRequestForm`, sada proširen kao jedinstveni
tok od pet koraka: izbor usluge/terapeuta, format/lokacija, željeni termin,
kontakt, pregled i potvrda zahteva. Uspešan rezultat jasno kaže da zahtev nije
potvrđen termin.

`booking-context.ts` dozvoljava samo `service`, `therapist`, `format` i
`source`. Proverava kanonske usluge, terapeute, međusobnu kompatibilnost,
format i source allowlist. Nevalidan prefill daje neutralnu poruku i ostavlja
izbor izmenjivim. URL generator ne prima niti prenosi email, slobodan tekst,
Intake odgovore ili matching score.

Matching rezultat sa `/pronadji-podrsku` prelazi na `/zakazi` samo sa bezbednim
identifikatorima. Strukturisani sažetak se prenosi najviše jednom u `sessionStorage`
i šalje se tek uz zahtev; nema skora, URL parametara ni analitike za slobodan
tekst.

## Kanonski sadržaj i ponovna upotreba

- `content/services.ts` ostaje izvor cena, trajanja i formata.
- `content/programs.ts` sadrži radionice i status prijave bez aktivne prijave
  za nepotvrđene programe.
- `content/therapists.ts` ima eksplicitnu kompatibilnost terapeuta i booking
  usluga.
- `site-navigation.ts`, `site-settings.ts` i `homepage-offers.ts` odvajaju
  navigaciju, potvrđene podatke i prezentacioni model od komponenti.
- `GuidanceFlow` koriste i javna ruta i sačuvani transitional drawer.
- B2B konfigurator i `/api/company-inquiry` nisu prepisani; dodate su plan
  kartice, preselection, transparentno označene necenovne činjenice i FAQ.

## Zadržane granice

Nisu menjani FastAPI/backend, baza i migracije, Control Center, Superadmin,
Clerk role sistem, Research Drawer niti postojeći B2B konfigurator. Nisu
dodati pravni tekstovi, emergency ruta, adolescentski self-service booking,
nepotvrđene adolescentske/B2B cene ili javne B2B obaveze.

Kontakt stranica namerno koristi email i jasne ulaze ka booking, guided i B2B
flow-u; nije uvedena paralelna kontakt forma koja bi zamenila zakazivanje.

## Promenjeni moduli

- Javni route moduli: `frontend/src/app/(public)/**`
- Booking i matching: `frontend/src/features/booking/**`,
  `frontend/src/features/guidance/**`
- Kanonski content: `frontend/src/content/{services,programs,therapists,site-navigation,site-settings,homepage-offers}.ts`
- Javni header/footer/homepage, profile, usluge i B2B sekcije u
  `frontend/src/components/sections/**`
- Demo endpoint: `frontend/src/app/api/booking-request/route.ts`
- Testovi: `frontend/src/features/booking/*.test.*` i `frontend/tests/e2e/**`

## Verifikacija

- `npm run lint`: prošao
- `npm run typecheck`: prošao
- `npm run test`: 90 testova prošlo
- `npm run build`: prošao
- `npm run test:e2e`: 59 Playwright testova prošlo
- Mobile overflow proverava `/`, guided flow, booking, usluge, detalj usluge,
  tim, profil terapeuta, radionice, cene, roditeljsku podršku i B2B stranicu.

`npm run format:check` trenutno pada samo na već postojećem, nedodirnutom
`src/components/shared/logout-avatar-menu.tsx`. Svi moduli dodirnuti u ovoj
iteraciji formatirani su Prettier-om; taj fajl je ostavljen van scope-a da se
ne menja tuđi rad.

Playwright je podešen na jedan worker zato što Clerk proxy pri paralelnim
javnim zahtevima povremeno vraća `too_many_requests`; sekvencijalni prolaz je
prošao stabilno.

## Otvorene odluke za tim

- Pravila zakazivanja, politika privatnosti i ostali pravni tekstovi.
- Odobren emergency sadržaj i zvanični kontakti.
- Uzrast, saglasnost, dostupnost, cena i format za adolescente.
- Datumi, voditelji, kapacitet, otkazivanje i prijava za radionice.
- Javne B2B cene, kapaciteti, naplata i politika neiskorišćenog kapaciteta.
- Potvrda paketa od pet seansi za 15.000 RSD.

## Preporučeni sledeći mali slice

Pre produkcionog booking engine-a: potvrditi pravila zakazivanja i adolescent
flow, zatim FastAPI ownership za booking request, persistence, stvarnu
dostupnost i administrativnu obradu zahteva. Tek posle tih odluka treba
otvarati aktivne prijave za radionice i dodatne audience rute.
