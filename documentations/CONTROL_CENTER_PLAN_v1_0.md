# CONTROL CENTER (radni-prostor) — PLAN v1.0

> **Status:** implementirano (2026-07-20) — čeka ručni smoke i commit · **Grana:** `features` · **Faza:** Pre-R2 Control Center Preview (nije formalni R2)
> **Dizajn (1:1):** `Admin panel dizajn za Next.js-handoff/…/design_handoff_paneli/Psihointegritet Control Center.dc.html` + README §8.1
> **Odluke:** D-026 (role/šav, superadmin) · **D-027** (ovaj panel) · O-17/O-18 (Clerk nalozi tima)

---

## 1. Cilj

Operativni radni interfejs za tim (vlasnica centra + terapeuti) na `/radni-prostor`. Isti pristup kao superadmin: **funkcionalan, pretežno read-only demo sa mock podacima**, da Anja i tim (kad naprave naloge) vide panel i daju konkretne smernice šta im treba. Tabovi i kontrole se prikazuju **po roli, server-side**.

## 2. Role model (potvrđeno)

| Rola | Vidi |
|---|---|
| `org_admin` | Pregled · Termini · Klijenti · Kompanije · Usluge i cene · Istraživanja · Terapeuti · Podešavanja |
| `therapist` | Pregled · Termini · Klijenti · **Moj profil** |
| oba (Anja/Marija/Marjan) | **uniju** oba skupa |
| superadmin | tretiran kao oba (pun pristup tenant panelu) |

- **Union iz stvarnih rola, bez Vlasnik/Terapeut prekidača** (dizajn ga je imao kao demo). Footer prikazuje labelu rola. Vlasnik filtrira „samo moje" preko izbora terapeuta u topbaru (`selectedTherapistSlug` u `WorkspaceProvider`).
- Server-side guard na svakoj stranici je izvor istine; nav je samo prikaz (`visibleNav`).

## 3. Auth (`src/lib/auth/guards.ts`)

Novo, uz reuse `getServerIdentity`/`hasRole`/`redirect`:
- `isWorkspaceAdmin(id)` / `isWorkspaceTherapist(id)` — superadmin = oba.
- `requireOrgAdmin()` — Kompanije/Usluge/Istraživanja/Terapeuti/Podešavanja. Terapeut bez admina → `/radni-prostor`, klijent → `/nalog`.
- `requireTherapist()` — Moj profil. Admin bez therapist-a → `/radni-prostor`.
- `requireStaff()` (postoji) — layout + Pregled/Termini/Klijenti.
- Testovi: `guards.test.ts` (matrica) + `nav.test.ts` (koje stavke po roli). Ukupno auth+nav 37 testova.

## 4. Rute — `(staff)/radni-prostor/`

`layout.tsx` (requireStaff → role flags → `WorkspaceProvider` + shell) + 9 stranica, svaka sa sopstvenim guardom:
`page.tsx` (Pregled, staff) · `termini` (staff) · `klijenti` (staff) · `kompanije` (admin) · `usluge` (admin) · `istrazivanja` (admin) · `terapeuti` (admin) · `profil` (therapist) · `podesavanja` (admin).

## 5. Shell (`src/features/workspace/`)

- `workspace-context.tsx` — `WorkspaceProvider` (role flags iz servera + `selectedTherapistSlug`), `roleLabelFor`.
- `nav.tsx` — role-gated nav config + `visibleNav(flags)` (deljeno sidebar/bottom-nav, testabilno).
- `components/sidebar.tsx` (forest, Control Center caption, badge na Terminima, footer role labela + odjava), `topbar.tsx` (datum, izbor terapeuta [admin], zvonce, Brza akcija — stub toast), `bottom-nav.tsx` (5-kol sa FAB), `icons.tsx` (inline SVG 1:1).

## 6. Ekrani (v1, read-only, mock)

Pregled (pozdrav, 4 prioritetne kartice, današnja agenda, „Ova nedelja", istraživanja teaser [admin]) · Termini (5 tabova: Danas/Nedelja/Predstojeći/Zahtevi/Lista čekanja) · Klijenti (Svi/Nedodeljeni + Preuzmi/Dodeli stub) · Kompanije (pipeline + fond kartice) · Usluge i cene (katalog + interni kodovi/varijante/pravila) · Istraživanja (stat + rezultati ankete, anonimno) · Terapeuti (kartice sa popunjenošću) · Moj profil (Javni profil / Matching preferencije [lock] / Dostupnost 4 sloja) · Podešavanja (U pripremi).

Podaci: `types.ts` (11 statusa → badge tonovi) + `data.ts` (mock; **usklađeno sa našim katalogom** — „Bračno savetovanje", cene 4.000/5.500/5.000; terapeuti iz `content/therapists.ts`, ne zastareli copy iz prototipa). Reuse panel primitiva (`components/panel/*`: StatusBadge, StatCard, TabPills, KV, Toggle, EmptyDashedCard, ProgressBar) + `Chip`.

Privacy (§8.1, MP §11): nigde anamneza/kliničke beleške/dijagnostika; Istraživanja anonimna.

## 7. Odloženo (sledeći korak, ne u v1)

Duboki profili: klijent/[id] (Intake sažetak, Saglasnosti, Termini, Paketi), kompanija/[id] (Kapacitet, privacy kartica), terapeut/[id] (admin pogled tuđeg profila). Booking engine za prave termine (Brza akcija, potvrda/predlog zahteva, dodela nedodeljenih). „Više" sheet na mobilnom sa admin stavkama. Sve trenutno stub/read-only.

## 8. Verifikacija (2026-07-20)

- tsc · lint · format · vitest **(82 testa)** · build · Playwright **(61 e2e, +10 workspace-auth)** — svi zeleni.
- Vizuelno: privremena preview ruta → screenshot desktop + mobilni, potvrđeno 1:1 sa dizajnom (role-derived nav, agenda, popunjenost, bottom-nav FAB), pa obrisana.
- Ručni smoke (za korisnika): ulogovan superadmin (`drazic.milan@gmail.com`) → otvoriti `/radni-prostor` (guard ga pušta, vidi pun union pogled). Nalozi tima sa `org_admin`+`therapist` vide isto; čist `therapist` samo Pregled/Termini/Klijenti/Moj profil; čist `org_admin` bez Moj profil.

## 9. Follow-up / rollout

- e2e ulogovanih role-view tokova = `@clerk/testing` tokens (budući rad, isto kao superadmin).
- Kad tim napravi naloge (O-17) i `roles:assign` dodeli `org_admin`+`therapist`, vide panel i daju smernice.
- Backend M2.1/M2.3 zamenjuje mock (identity `/me` kroz šav, pravi termini/klijenti).
