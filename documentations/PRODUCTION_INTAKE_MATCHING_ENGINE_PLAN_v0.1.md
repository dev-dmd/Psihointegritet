# Production Intake & Matching Engine v0.1

**Status:** planned after R1.4.i code gate  
**Datum:** 2026-07-22  
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

## 2. Granice domena

- `GuidanceSession` je anoniman, kratak i bez imena/kontakta; napušten guidance ne kreira klijenta.
- `IntakeCase` nastaje tek uz kontakt, potrebne saglasnosti i zahtev za termin ili pregled tima.
- Matching daje kontrolisane preporuke i explanation codes; ne vraća interni score, chain-of-thought ni dijagnostičku procenu.
- Booking Engine je jedini vlasnik slotova, hold-ova, zahteva za termin i potvrđenih termina.
- Waitlist domen određuje redosled čekanja; Notification Engine samo šalje događaje; Reminder Scheduler podseća na nerešen zahtev.
- B2B se na prvom razdvajanju šalje u Company Configurator, nikada u therapist matching.

Ne uvoditi `Client` ili termin "pacijent" samo zato što je korisnik završio upitnik.

## 3. Modeli i privatnost

Početni modeli:

```text
GuidanceSession
IntakeCase
IntakeAnswer
MatchingRun
MatchingRecommendation
IntakeAssignment
AssignmentEvent
ConsentRecord
TherapistMatchingProfile
CapacitySnapshot
```

Javni tok modeluje `started -> completed -> recommendation_ready -> submitted -> expired`.
Timski tok modeluje `unassigned -> claimed -> reassigned -> booking_started -> converted -> closed`.

Pre produkcijskog uključivanja Legal + Clinical + Product potvrđuju retention anonimnog toka i odbijenih zahteva, brisanje slobodnog teksta, audit minimum, pristup, brisanje na zahtev i lokalizovani safety/human-support tekst.

## 4. Deterministički adapter

`matching.ts` ostaje referenca za postojeća pravila i test paritet. UI prelazi na stabilan ugovor:

```ts
interface MatchingAdapter {
  evaluate(input: MatchingInput): Promise<MatchingResult>;
}
```

Prvi adapter je backend-owned deterministički evaluator. `StaticMatchingAdapter` služi samo za test/paritet; `AiAssistedMatchingAdapter` je kasniji, odvojeni feature flag. `MatchingResult` vraća service/therapist ID-jeve, explanation codes, `requiresTeamReview` i `ruleVersion`.

## 5. Timski red i konkurentnost

Timski red pokazuje samo minimum: vreme zahteva, uslugu, format, lokaciju, preporuke, kategorije podrške, postojanje slobodnog teksta i vreme čekanja.

`Claim` je atomska serverska mutacija. Jedan terapeut dobija slučaj; drugi dobija trenutnog vlasnika, a lista se osvežava. `Reassign` zahteva dozvolu, novog terapeuta, razlog i neizmenjiv `AssignmentEvent` sa prethodnim i novim vlasnikom.

Superadmin ostaje metadata/health-first i nema podrazumevan pristup slobodnom tekstu.

## 6. Preference, kapacitet i flagovi

`TherapistMatchingProfile` je interni profil, odvojen od javne biografije. Sadrži usluge, oblasti, uzrast, formate, lokacije, prima/ne prima nove klijente, preference, isključenja, soft capacity i matching prioritet.

Intake čita `CapacityAdapter`; prvi adapter je statički, a kasniji `BookingCapacityAdapter` čita samo sažetak dostupnosti. Intake nikada ne čita slot tabele, kalendare ni buffere direktno.

`intake_matching_preview` ostaje staging/demo flag. Produkcijski flagovi su odvojeni:

```text
intake_matching_enabled
intake_team_queue_enabled
intake_ai_assist_enabled
```

## 7. AI assist je kasniji slice

AI može strukturisati opcion tekst kroz allowlist kategorija i schema validaciju, ali nikada ne postavlja dijagnozu, ne zaobilazi hard constraint, ne potvrđuje terapeuta/termin, ne menja preference i ne izlaže skriveno rezonovanje.

Interni confidence signal nije risk kategorija, ne prikazuje se klijentu i ne sme sam odlučiti o pristupu podršci. Bez eksplicitne saglasnosti i posebnog flaga, tok ide deterministički ili na team review.

## 8. Implementacioni redosled

1. **IM-1 Intake Core:** FastAPI modeli/migracije, state machine, consents, retention granice, API i generisani TypeScript client.
2. **IM-2 Deterministički engine:** BackendMatchingAdapter, rule versioning, explanation codes, fallback i paritet sa postojećim testovima.
3. **IM-3 Team Queue:** nedodeljeni slučajevi, atomic claim, reassign, assignment history, RBAC i vertikalni Control Center slice.
4. **IM-4 Therapist configuration:** matching preference, statički capacity adapter, prima nove klijente, format/lokacije i produkcijski flagovi.
5. **IM-5 Client status:** poslati zahtevi i status bez anamneze ili osetljivih dokumenata; booking detalji dolaze uz R2.
6. **IM-6 AI assist:** samo posle privacy/consent odluke, sa fallback-om i bezbednosnim testovima.

Svaki slice ide vertikalno: DB model -> FastAPI endpoint -> generated client -> React Query hook -> panel -> mutacija -> testovi. Ne graditi ceo backend pa panel naknadno.

## 9. Pre-R2 i R2 granica

Pre-R2 mora definisati review SLA, remindere, escalation, istek, post-submission slot dostupnost, Notify Me redosled, offer TTL, notification dedupe i atomic claim. Preporučeni Notify Me default je sekvencijalna privatna ponuda; broadcast first-claim ostaje buduća tenant opcija.

R2 zatim implementira Booking Core i reusable internal Booking Widget kao headless domen + flow controller + renderer + surface adapter. Eksterni iframe/SDK nije deo prvog R2 slice-a. Packages, krediti, pretplate, plaćanja i refundacije pripadaju R5.
