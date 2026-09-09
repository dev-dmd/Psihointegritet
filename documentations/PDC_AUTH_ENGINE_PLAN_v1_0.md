# PDC Auth Engine — audit i plan zamene Clerk-a

**Datum:** 2026-09-07 · **Vlasnik:** Milan Dražić (CTO)
**Status (2026-09-09):** AUTH-1…AUTH-6 **isporučeni**. Otvoreno: aktivacija pet naloga na
produkciji (§15.4) → onda AUTH-7 (tenant klijenti). Odeljci 0–12 su **originalni audit od
2026-09-07** i namerno se ne prepravljaju; §13–§15 beleže šta je stvarno isporučeno.
**Odluka:** D-083 (predložena) · **Prethodi:** D-081, **D-082 (scope gate)**, ADR-023, `PDC_CONSOLIDATION_MIGRATION_PLAN_v1_1.md`
**Referenca:** Marysoll `AUTH-SESSION-COOKIE-COLLISION.md`, `AuthUser.ts`, `TenantUser.ts`, `tenant-auth/*` — **kao izvor granica i grešaka, ne kao izvor koda**

---

## 0. Jedna stvar pre svega ostalog

> ⛔ **Prevaziđeno — pročitati kao istoriju, ne kao uputstvo.** AUTH-0 nikada nije izveden:
> Clerk nije vraćen nego uklonjen (`371abb6`), a zamenio ga je PDC auth engine (§13–§15).
> Preporuka ispod bi danas vratila zavisnost koje više nema. Ostavljeno jer objašnjava
> zašto je redosled u §11 baš takav.
>
> 🔴 **Prijava je u produkciji trenutno pokvarena.** Clerk primary domen je prebačen na
> `p-digital-center.com`, stari FAPI `clerk.psihointegritet.com` ne odgovara (TLS handshake failure,
> 3/3), a produkcija i dalje šalje `pk_live_…cHNpaG9pbnRlZ3JpdGV0…`.
>
> **Custom auth se ne isporučuje danas.** Do njega niko ne može u radni prostor.
> **Preporuka: privremeno vratiti Clerk u ispravno stanje** (Railway `CLERK_ISSUER` +
> `CLERK_JWKS_URL` → `clerk.p-digital-center.com`, Vercel publishable key
> `pk_live_Y2xlcmsucC1kaWdpdGFsLWNlbnRlci5jb20k`), pa **onda** mirno graditi zamenu.
>
> Graditi auth engine pod pritiskom prekida je najgori mogući režim za baš taj deo sistema.

---

## 1. Postojeći Clerk dependency map

### 1.1 Backend — **tanak, i to je najbolja vest u ovom auditu**

Backend **nema Clerk SDK**. Ima `pyjwt[crypto]` i jedan verifier.

| Fajl | Uloga | Sudbina |
| --- | --- | --- |
| `infrastructure/auth/clerk/verifier.py` | `ClerkTokenVerifier` — JWKS + `jwt.decode(issuer, audience)` | **zamenjuje se** |
| `infrastructure/auth/identity.py` | `IdentityClaims(subject, email, session_id)` + `TokenVerifier` Protocol | **ostaje nepromenjen** |
| `main.py:47` | `app.state.token_verifier = ClerkTokenVerifier(settings)` | **jedna linija** |
| `api/dependencies.py` | `get_current_identity()` zove `verifier.verify(bearer)` | **ostaje nepromenjen** |
| `core/config.py` | `clerk_issuer`, `clerk_audience`, `clerk_jwks_url` | brišu se |
| `modules/identity/roster.py` | `clerk_ids` po instanci, za provisioning tima | menja se u §8 |
| `modules/identity/models.py` | `InternalUser.external_auth_id` | **ostaje**, menja se značenje |
| ostali (`privacy/`, `content/`, `booking/schemas.py`, `guidance/authorization.py`, `organizations/provisioning.py`) | samo komentari i poruke | kozmetika |

**Ceo backend Clerk coupling je: jedna klasa i tri env promenljive.**
`TokenVerifier` je već Protocol, `IdentityClaims` je već provider-neutralan — ARCHITECTURAL_RULES §10.1
je taj šav predvideo i on sada plaća.

### 1.2 Frontend — 23 fajla, ali tri kategorije

| Kategorija | Fajlova | Šta koriste | Posao |
| --- | --- | --- | --- |
| **Adapter** `lib/auth/clerk/` | 8 | `ClerkProvider`, `auth()`, `useUser`, `currentUser` | **piše se iznova** kao `lib/auth/pdc/` |
| **Proxy** `proxy.ts` | 1 | `clerkMiddleware`, `auth.protect()` | zamenjuje se session guard-om |
| **UI potrošači** | 14 | `<SignIn/>`, `<SignUp/>`, `<UserButton/>`, `useUser()` | menjaju **import**, ne logiku |

Backend-proxy fajlovi (`booking/`, `intake/`, `superadmin/`, `content-governance/staff-preview.ts`)
koriste `auth().getToken()` — dobijaju naš session token istim potpisom.

`@clerk/nextjs ^7.5.17` je **jedina** Clerk zavisnost u `package.json`.

### 1.3 Env i DB

```
Vercel     NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY · CLERK_SECRET_KEY · CLERK_JWT_KEY
Railway    CLERK_ISSUER · CLERK_JWKS_URL · CLERK_AUDIENCE · CLERK_SECRET_KEY
DB         internal_users.external_auth_id  (Clerk `user_…` subject)
DNS        clerk./accounts./clkmail./clk._domainkey na p-digital-center.com
```

---

## 2. Postojeći identity modeli — šta se zadržava

```
organizations              id · slug · display_name · ui_locale · default_content_locale
internal_users             id · external_auth_id · email · display_name · is_active · is_superadmin
organization_memberships   id · organization_id · user_id · role · status
                           UNIQUE (organization_id, user_id, role)
MembershipRole             ORG_ADMIN · THERAPIST          ← "client" NE postoji kao membership role
```

**Nalaz koji menja plan:** `MembershipRole` u bazi ima **samo** `org_admin` i `therapist`.
Frontendski tip `lib/auth/identity.ts` navodi i `"client"`, ali backend enum ga nema.

Znači **klijenti danas nemaju membership uopšte** — nisu modelovani u bazi. To potvrđuje tvoju
podelu: klijent nije „member sa drugom ulogom", nego **druga vrsta identiteta**. Model ide u §4 bez
natezanja postojećeg enuma.

`resolve_staff_actor()` (`guidance/authorization.py:97`) već skopira membership na konkretan
`organization.id`. **Ostaje netaknut** — menja se samo ko puni `IdentityClaims`.

---

## 3. Šta se ponovo koristi, šta se dodaje

| Ponovo koristimo | Dodajemo |
| --- | --- |
| `organizations`, `internal_users`, `organization_memberships` | `platform_credentials`, `tenant_clients`, `tenant_client_credentials` |
| `IdentityClaims` + `TokenVerifier` Protocol | `PdcSessionVerifier` (implementira isti Protocol) |
| `resolve_staff_actor()`, `StaffActor` | `resolve_client_actor()` |
| `domain-registry.ts` host → tenant | `sessions`, `auth_tokens` |
| `x-pdc-surface` / `x-pdc-tenant` žig iz proxy-ja | `POST /api/v1/auth/*` rute |
| post-auth dispatcher (`2d`) | rate limiting |

---

## 4. Predložena DB šema

### 4.1 Platform identity — nadograđuje `internal_users`, ne zamenjuje ga

```sql
-- internal_users OSTAJE. external_auth_id prestaje da bude Clerk subject
-- i postaje "pdc:<uuid>" dok se stari Clerk id čuva radi revizije.

CREATE TABLE platform_credentials (
  user_id            uuid PRIMARY KEY REFERENCES internal_users(id) ON DELETE CASCADE,
  normalized_email   citext      NOT NULL UNIQUE,
  password_hash      text        NULL,          -- NULL = nalog čeka aktivaciju (§8)
  email_verified_at  timestamptz NULL,
  password_changed_at timestamptz NULL,
  failed_attempts    int         NOT NULL DEFAULT 0,
  locked_until       timestamptz NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);
```

**`GLOBAL` klasa za RLS** (ADR-023 §3) — kao i `internal_users`. Pripadnost tenantu ide isključivo
kroz `organization_memberships`.

### 4.2 Tenant client identity — strogo tenant-scoped

```sql
CREATE TABLE tenant_clients (
  id                 uuid PRIMARY KEY,
  organization_id    uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  normalized_email   citext NOT NULL,
  display_name       text NULL,
  status             text NOT NULL DEFAULT 'active',   -- active | invited | suspended
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_tenant_client_email UNIQUE (organization_id, normalized_email),
  CONSTRAINT uq_tenant_client_org   UNIQUE (id, organization_id)   -- composite FK, ADR-023 §5.2
);

CREATE TABLE tenant_client_credentials (
  client_id          uuid PRIMARY KEY,
  organization_id    uuid NOT NULL,
  password_hash      text NOT NULL,
  email_verified_at  timestamptz NULL,
  password_changed_at timestamptz NULL,
  failed_attempts    int NOT NULL DEFAULT 0,
  locked_until       timestamptz NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (client_id, organization_id)
    REFERENCES tenant_clients (id, organization_id) ON DELETE CASCADE
);
```

`UNIQUE (organization_id, normalized_email)` je **granica koju je Marysoll dobro postavio**
(`TenantUser.ts:302`) i jedina koja izražava „registracija kod Sanje ≠ registracija kod Psiho".

Obe tabele su `ORGANIZATION_SCOPED` i ulaze u RLS inventar v0.2 (52 → 55 tabela).

### 4.3 Sesije i tokeni

```sql
CREATE TABLE auth_sessions (
  id                 uuid PRIMARY KEY,
  kind               text NOT NULL,            -- 'platform' | 'tenant_client'
  user_id            uuid NULL,                -- kind='platform'      → internal_users.id
  client_id          uuid NULL,                -- kind='tenant_client' → tenant_clients.id
  organization_id    uuid NULL,                -- OBAVEZAN za tenant_client, NULL za platform
  token_hash         text NOT NULL UNIQUE,     -- sha256 opaque tokena; plaintext se ne čuva
  issued_at          timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz NOT NULL,
  revoked_at         timestamptz NULL,
  user_agent         text NULL,
  CONSTRAINT ck_session_subject CHECK (
    (kind = 'platform'      AND user_id   IS NOT NULL AND client_id IS NULL AND organization_id IS NULL) OR
    (kind = 'tenant_client' AND client_id IS NOT NULL AND user_id   IS NULL AND organization_id IS NOT NULL)
  )
);

CREATE TABLE auth_tokens (              -- verifikacija emaila i reset lozinke
  id                 uuid PRIMARY KEY,
  purpose            text NOT NULL,           -- 'email_verification' | 'password_reset'
  kind               text NOT NULL,           -- 'platform' | 'tenant_client'
  user_id            uuid NULL,
  client_id          uuid NULL,
  organization_id    uuid NULL,
  token_hash         text NOT NULL UNIQUE,    -- hash, NIKAD plaintext
  expires_at         timestamptz NOT NULL,
  consumed_at        timestamptz NULL,        -- single-use
  created_at         timestamptz NOT NULL DEFAULT now()
);
```

`ck_session_subject` je ono što u Marysoll-u nije postojalo: **baza odbija sesiju koja ne zna čija
je.** Tenant sesija bez `organization_id` je neizraziva, ne samo nepoželjna.

---

## 5. Session i cookie ugovor

```
SessionKind = PLATFORM | TENANT_CLIENT     ← eksplicitno, nikad izvedeno
```

| | PLATFORM | TENANT_CLIENT |
| --- | --- | --- |
| Cookie ime | `pdc_platform_session` | `pdc_tenant_session` |
| `HttpOnly` | **da** | **da** |
| `Secure` | da | da |
| `SameSite` | `Lax` | `Lax` |
| `domain` | **host-only** (izostavljen) | **host-only** (izostavljen) |
| `Path` | `/` | `/` |
| Sadržaj | **opaque token**, ne JWT | opaque token |
| Prihvata je | samo platform host | samo tenant host koji razrešava **taj** `organization_id` |

### Pet Marysoll grešaka koje se ovim izbegavaju

| Marysoll | Dokaz | PDC |
| --- | --- | --- |
| `tenant-access-token` `httpOnly: false` | `tokenResponse.ts:106` | **oba cookie-ja HttpOnly**; JS ne vidi token |
| Klijent i tenant-admin dele `tenant-*` namespace | collision doc §Sažetak | dva imena + `kind` u bazi + `CHECK` |
| `platform-*` sa `domain: .marysoll.com` | `tokenResponse.ts:55` | **host-only**, bez deljenja po poddomenima |
| Tenant slug iz **request body-ja** | `tenant-auth/login:44-50`, `register:68` | **nikad**; §6 |
| `localStorage["token"]` sa generičkim prioritetom | collision doc | ne postoji; server bira sesiju |

**Guard nikad ne „proba sve cookie-je redom".** Ruta deklariše koju vrstu sesije prihvata:

```
platform routes (/radni-prostor, /workspace, /superadmin)  → SAMO PLATFORM
client routes   (/nalog)                                    → SAMO TENANT_CLIENT
auth routes     (/prijava, /registracija)                   → nijedna
```

---

## 6. Tenant resolution i auth request flow

**Kritično pravilo:** tenant se razrešava **isključivo** iz hostname-a, na serveru.

```
Host: sanjaneuer.com
   ↓ proxy.ts → domain-registry.ts (trusted, eksplicitna lista, bez wildcard-a)
   ↓ x-pdc-tenant: sanja-neuer   ← žig koji browser ne može da falsifikuje (§6.4 plana)
   ↓ Route Handler čita ŽIG, ne body
   ↓ organizations.slug → organization_id
   ↓ tenant_clients WHERE organization_id = <taj> AND normalized_email = <email>
```

Request body sme da nosi **samo** `email` i `password`. Nikad `tenantSlug`, `organizationId`,
`organization_slug` — a Pydantic shema ih **odbija** (`extra="forbid"`), da se ne provuku tiho.

```
CLIENT LOGIN                              PLATFORM LOGIN
sanjaneuer.com/prijava                    p-digital-center.com/prijava
POST /api/v1/auth/client/login            POST /api/v1/auth/platform/login
  { email, password }                       { email, password }
  + x-pdc-tenant (server)                   surface=platform (server)
        ↓                                         ↓
  org_id iz hosta                           platform_credentials po emailu
  tenant_clients(org_id, email)             argon2.verify
  argon2.verify                             session kind=PLATFORM
  session kind=TENANT_CLIENT, org_id              ↓
        ↓                                   /api/auth/landing → uloga
  Set-Cookie pdc_tenant_session             → /superadmin | /radni-prostor
  → /nalog
```

Klijent koji ima nalog **samo** kod Sanje, a pokuša prijavu na `psihointegritet.com`, ne nalazi red
u `tenant_clients` za taj `organization_id` → ista generička poruka kao za pogrešnu lozinku.
**Postojanje naloga kod drugog tenanta se ne otkriva.**

---

## 7. Email verification i password reset

```
REGISTRACIJA                     RESET
email + password + confirm       email
+ prihvatanje uslova                   ↓
        ↓                        uvek generička poruka
argon2id hash                          ↓
        ↓                        token = secrets.token_urlsafe(32)
token = secrets.token_urlsafe(32)      ↓
sha256(token) → auth_tokens      sha256(token) → auth_tokens
        ↓                              ↓
Resend → /potvrdi-email?token=   Resend → /nova-lozinka?token=
        ↓                              ↓
consumed_at + email_verified_at  nova lozinka + consumed_at
                                       ↓
                                 REVOKE svih sesija tog subjekta
```

Zaključano: **Argon2id** (`argon2-cffi`, ne bcrypt — Marysoll koristi bcrypt); token u bazi
**samo kao hash**; expiry (verifikacija 24h, reset 1h); **single-use** preko `consumed_at`;
reset **poništava sve sesije**; generičke poruke na login i reset; rate limiting na login,
register, verify i reset.

**Google OAuth se ne radi** (D-082). Isti engine ga prima kasnije kao dodatni `credential kind`.

---

## 8. Migracija sa Clerk-a bez gubitka pristupa

Clerk lozinke **ne postoje kod nas** i ne mogu se migrirati. Identiteti koji se moraju sačuvati:

```
Milan (superadmin) · Maria · Elsa · John · Sanja
```

Svi su **platform** identiteti — nijedan klijent još ne postoji, što ovu migraciju čini malom.

```
1. internal_users OSTAJU sa svojim UUID-jevima
   → memberships, audit trag, created_by_user_id ostaju netaknuti
2. za svakog: INSERT platform_credentials (normalized_email, password_hash = NULL)
3. external_auth_id: Clerk "user_…" → "pdc:<internal_users.id>"
   stari se čuva u novoj koloni legacy_clerk_id (revizija, pa se briše)
4. svakom se šalje activation token (purpose='password_reset')
5. postavi lozinku → password_hash + email_verified_at
6. Clerk se gasi TEK kad svih pet potvrdi prijavu
```

**`password_hash = NULL` znači „nalog postoji, lozinka još nije postavljena"** — login ga odbija
istom generičkom porukom, aktivacija ga popunjava. Nema privremenih lozinki koje neko negde zapiše.

---

## 9. Kako se uklapa u Fazu 5 i Fazu 6

**Ovo ne odlaže Fazu 5 — ono je isporučuje.**

`get_tenant_context()` iz §6.3 migracionog plana tražio je „trusted frontend/domain/session
context". Custom sesija **jeste** taj kontekst, i bolji je od žiga sa deljenom tajnom:

```
BILO planirano:  x-pdc-tenant header + TENANT_CONTEXT_SIGNING_KEY
BIĆE:            pdc_tenant_session cookie → auth_sessions.organization_id
```

Tenant više ne stiže kao *tvrdnja koju treba verifikovati*, nego kao **polje sesije koju je server
izdao**. Deljena tajna iz §6.4 postaje nepotrebna.

```
session (kind, organization_id)
        ↓
IdentityClaims  ← isti Protocol, PdcSessionVerifier umesto ClerkTokenVerifier
        ↓
TenantContext(organization_id, organization_slug, source)
        ↓
resolve_staff_actor / resolve_client_actor     ← NEPROMENJENI
        ↓
organization-scoped repozitorijum → RLS (Faza 6)
```

**GATE A** je time direktnije ispunjen: `DEFAULT_ORGANIZATION_SLUG` prestaje da bude izvor tenancy-ja
jer ga zamenjuje sesija, ne konfiguracija.

**Faza 6:** tri nove tabele ulaze u inventar. `platform_credentials` je `GLOBAL`;
`tenant_clients` i `tenant_client_credentials` su `ORGANIZATION_SCOPED` sa composite FK već
ugrađenim u §4.2 — **ne stvaraju nijedan novi „mešani roditelj" slučaj.**
`auth_sessions`/`auth_tokens` su mešane (platform redovi imaju `organization_id IS NULL`) →
polisa po komandi, ADR-023 §7.3.

---

## 10. Test matrica

### Cross-tenant negativni testovi — obavezni

| # | Scenario | Očekivano |
| --- | --- | --- |
| N1 | Klijent registrovan kod `sanja-neuer` se prijavljuje na `psihointegritet.com` | odbijen, **generička** poruka |
| N2 | Isti email registrovan kod oba tenanta | **dva nezavisna naloga**, različite lozinke, bez preplitanja |
| N3 | `pdc_tenant_session` za `sanja-neuer` poslat na `psihointegritet.com` | odbijen (`organization_id` ≠ host) |
| N4 | Tenant sesija na `/radni-prostor` | **401/404**, ne 200 |
| N5 | Platform sesija na `sanjaneuer.com/nalog` | odbijena — pogrešan `kind` |
| N6 | `POST /auth/client/login` sa `{ tenantSlug: "psihointegritet" }` u body-ju | polje **odbijeno shemom**; tenant iz hosta |
| N7 | Reset token drugog tenanta | odbijen |
| N8 | Reset token upotrebljen dvaput | drugi put odbijen |
| N9 | Istekao verification token | odbijen |
| N10 | Posle reseta — stara sesija | poništena |
| N11 | Login bez `organization_id` u sesiji (ručno konstruisan) | `CHECK` ga ne dozvoljava ni upisati |
| N12 | Enumeracija emaila kroz register/reset | vremenski i tekstualno nerazlučivo |

Plus: rate limiting na sva četiri endpoint-a, Argon2id parametri, cookie atributi
(`HttpOnly`+`Secure`+`SameSite`+bez `domain`), i **da nijedan token nije u bazi u plaintext-u**.

---

## 11. Najmanji bezbedan redosled

```
AUTH-0  vratiti Clerk u ispravno stanje                    ← §0, ODMAH
AUTH-1  DB migracije: 4 tabele + legacy_clerk_id           bez potrošača
AUTH-2  backend engine: argon2, tokeni, sesije, servisi    testovi, bez ruta
AUTH-3  PdcSessionVerifier + /api/v1/auth/platform/*       ✅ 2026-09-08
AUTH-4  platform login/register UI na p-digital-center.com  ✅ 2026-09-08
AUTH-5  migracija 5 identiteta + activation                ✅ 2026-09-08 (alat + proba)
AUTH-6  ── GATE ── Clerk se isključuje na platformi        ✅ kod 2026-09-09 · §15
AUTH-7  tenant client: /api/v1/auth/client/* + tenant-branded UI
AUTH-8  cross-tenant negativni testovi (§10)
AUTH-9  ── GATE ── uklanjanje @clerk/nextjs, env, DNS
```

**AUTH-3 do AUTH-5 rade paralelno sa Clerk-om.** Nijedan trenutak u kojem niko ne može da uđe —
osim onog u kojem smo sada, i koji AUTH-0 zatvara.

---

## 12. Šta iz postojećeg plana otpada

| Otpada | Zašto |
| --- | --- |
| **M2 Clerk Dashboard cutover** (§9.2) | nema Dashboard-a |
| **satellite domains** + plaćeni plan | svaka površina ima svoju sesiju |
| **Clerk DNS** (`clerk.`, `accounts.`, `clkmail`, DKIM) | briše se u AUTH-9 |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_JWT_KEY` | — |
| `CLERK_ISSUER`, `CLERK_JWKS_URL`, `CLERK_AUDIENCE` | — |
| `NEXT_PUBLIC_CLERK_PRIMARY_HOST` | nikad nije ni uveden |
| `lib/auth/clerk/multi-domain.ts` + testovi | satellite odluka nestaje |
| **§9.1 Clerk readiness**, **§9.2 checklist**, **§9.3 ispravka** | zamenjuje ih ovaj dokument |
| `TENANT_CONTEXT_SIGNING_KEY` iz §6.4 | sesija nosi tenant; deljena tajna nepotrebna |
| Ograničenje „klijent mora videti PDC domen pri prijavi" | **nestaje** — klijent ostaje na svom domenu |

**Ostaje nepromenjeno:** Faza 3 (`PLATFORM_HOST`), Faza 4b (Sanja DNS), Faze 5–11, GATE A, GATE B,
`domain-registry.ts`, post-auth dispatcher iz `2d`, platform landing, surface-aware `/prijava`.

> **D-082 provera:** približava li nas ovo `PDC-ONBOARD-1`? **Da** — bez ovoga Sanjini klijenti
> ne mogu da se prijave na njenom domenu, a to je preduslov njenog svakodnevnog rada. Ali je i
> **najveći pojedinačni komad** u planu, pa AUTH-7 (klijenti) ide **posle** AUTH-6 (platforma),
> da Sanja može da uđe u radni prostor pre nego što njeni klijenti dobiju svoj.


---

## 13. Šta je AUTH-3/4 stvarno isporučio (2026-09-08)

### 13.1 Šav — dokazan, ne tvrđen

`PdcSessionVerifier` razrešava opaque token u `auth_sessions` i vraća
`IdentityClaims(subject=internal_users.external_auth_id, …)`. Test
`test_business_authorization_cannot_tell_the_provider_changed` prosleđuje te
claims **netaknutom** `resolve_staff_actor()` i tvrdi isti `StaffActor`.

Verifier je **strogo platformski**: `kind = platform`, `user_id NOT NULL`,
`client_id`/`organization_id` `NULL`, nije istekla, nije revoke-ovana, nalog
`is_active`. Tenant-client sesija je validna sesija koja ovde **ne prolazi** —
to je zaseban actor put u AUTH-7.

### 13.2 Token nikada ne vidi browser

```
browser  ──HttpOnly pdc_platform_session──▶  Next.js route handler
                                              │ getServerToken()
                                              ▼
                                   Authorization: Bearer <opaque>
                                              │
                                              ▼
                              FastAPI → PdcSessionVerifier → IdentityClaims
                                              │
                                              ▼
                                     resolve_staff_actor()
```

Odgovor route handler-a je `{ "ok": true }` i ništa više — oblik je namerno
premali da ponese token. Test `puts the token in an HttpOnly cookie and nowhere
in the body` pada ako iko doda token u telo odgovora. Nema JWT-a, nema
`localStorage`, nema JS-readable kolačića.

Kolačić: `httpOnly`, `secure` van development-a, `sameSite=lax`, `path=/`,
**bez `domain`** (host-only), `expires` iz baze.

### 13.3 Lockout — izmenjena politika zbog DoS-a

Tvrd prag je zamenjen progresivnim kašnjenjem sa plafonom:

| Uzastopnih grešaka | Zaključavanje |
| --- | --- |
| 5 | 1 minut |
| 10 | 5 minuta |
| 20+ | 15 minuta (plafon) |

Tri svojstva zajedno čine da napadač koji zna email **ne može** da izbaci
vlasnika iz naloga:

1. **Eskalacija ima plafon.** Najduže zaključavanje koje politika uopšte može
   da izrekne je 15 minuta, bez obzira koliko dugo napad traje.
2. **Pokušaj tokom zaključavanja se ne broji.** Burst od 40 zahteva ostavlja
   nalog na *prvom* nivou; svaki sledeći nivo košta napadača pun čekan
   interval koji ne može da preskoči.
3. **Reset lozinke briše lockout.** Ko čita mejl, ulazi odmah — ne čeka da
   napadač prestane.

Oba svojstva pokrivena su testovima koji **padaju** protiv verovatnih grešaka
(brojanje tokom zaključavanja; provera lockout-a tek posle verifikacije
lozinke) — mutacije su izvedene i potvrđene.

### 13.4 Namerno izostavljeno

~~**Nema rute koja izdaje reset token.**~~ ✅ **Otvoreno 2026-09-09, pošto je
preduslov ispunjen.** Postoje dve rute i obe šalju link na adresu koju je pozivalac
otkucao — `POST /password/forgot` i `POST /email/verify/resend`. U prijavnoj formi
stoje kao „Zaboravili ste lozinku?" i „Niste dobili potvrdu adrese?", ponuđene
**svima i pre nego što se iko ne prijavi**: prompt koji se pojavljuje samo za poznate
adrese odgovara na pitanje koje jedna generička poruka o neuspehu prijave postoji da
odbije.

Tri pravila čine neautentifikovan mailer bezbednim, i sva tri su u `_request_link`:

| Pravilo | Zašto |
| --- | --- |
| **Primalac nikad nije zahtev** | adresa se traži u bazi i šalje se **uskladištena**, pa ruta ne može da se uperi u drugo sanduče |
| **204, uvek** | nema naloga · već verifikovan · nalog čeka aktivaciju · unutar cooldown-a — jedan odgovor pokriva sve, pa nijedna ruta ne odgovara na „ko ovde ima nalog" |
| **Jedan živ link** | stariji se poništavaju **pre** kovanja novog, inače stariji mejl i dalje otvara nalog pošto je noviji iskorišćen |

`AuthPolicy.self_service_mail_cooldown` (2 minuta) je ono što zadržan taster pretvara
u jedan mejl. Cooldown a ne brojač zahteva: ograničava se **poslato**, ne primljeno —
zahtev za adresu bez naloga ne šalje ništa i nije vredan pamćenja.

Odbijeni su i nalozi **bez lozinke**: to je neko koga je operator provizionirao a niko
nije aktivirao, i njemu treba aktivacioni link. „Potvrdite adresu da biste mogli da se
prijavite" poslato osobi koja posle toga i dalje ne može da se prijavi je obećanje koje
tok ne ispunjava.

> ⚠️ **Šta i dalje nedostaje:** nema ograničenja po IP adresi. Pozivalac koji ima
> spisak **poznatih** adresa i dalje može da izazove po jedan mejl po adresi po
> cooldown-u. Mejl ide isključivo u sanduče tog naloga i ne govori ništa o nalogu, pa
> je šteta naša reputacija pošiljaoca, ne nečija bezbednost — ali je stvarna, i mesto
> za nju je rate limit na ivici, ne ovaj modul.

Operatorska skripta (`scripts/platform_accounts.py --reset`) **ostaje** i **ne podleže
cooldown-u**: odgovara na drugo pitanje — „ovaj čovek ne može da uđe, daj mi link" — a
operator koji drži link nije sanduče koje se preplavljuje.

~~**`email_verified_at` se upisuje ali se ne zahteva pri prijavi.**~~ ✅ **Zatvoreno
2026-09-09 (AUTH-6).** Prijava odbija `NULL` sa `EMAIL_NOT_VERIFIED`, provera stoji
**posle** verifikacije lozinke da prijava ne bi postala orakl o tome koje su adrese
registrovane a nepotvrđene.

> ⚠️ **Migracija `a3c85f01d247` je deo te izmene, ne kozmetika.** Kapija pretpostavlja
> da lozinka bez verifikacije može doći samo iz samoregistracije, jer svaki
> operatorski link žigoše kolonu kad se potroši. To važi **od commita koji je žigosanje
> uveo**, a ne pre njega: nalozi koji su lozinku postavili ranije imaju `NULL` i kapija
> bi ih zaključala u trenutku deploy-a — tačno ljude protiv kojih nije uperena. Migracija
> upisuje `COALESCE(password_changed_at, created_at)`, jer je adresa dokazana kad je link
> potrošen, ne kad je migracija otišla. Nalozi **bez** lozinke se ne diraju: oni nisu
> dokazali ništa, a potrošnja njihovog linka žigoše kolonu sama.

**Registracija je otvorena.** Nalog koji otvara nema nijedno članstvo ni
superadmin flag, pa `resolve_staff_actor` odbija — privilegija dolazi iz
`organization_memberships`, nikada iz činjenice da je neko prijavljen.

> ⚠️ **Rupa nađena i zatvorena 2026-09-09: zauzimanje adrese koja čeka aktivaciju.**
> `platform_credentials.normalized_email` je bio jedini čuvar, a on **ne pokriva stanje
> kroz koje prolazi svaki provizioniran čovek**: operator napravi `internal_users` red sa
> adresom i bez kredencijala, i dok se aktivacioni link ne potroši ta adresa je nezauzeta.
> Reprodukovano lokalno: registracija na `elsa.browers@psihointegritet.com` — adresu koja
> je provizionirana i čeka aktivaciju — vraćala je **201**, sa duplim `internal_users`
> redom i zauzetim mestom za kredencijal. Aktivacija prave Else bi posle toga pukla na
> `uq_platform_credentials_email`, bez ijednog samouslužnog izlaza.
>
> **Kapija za verifikaciju ovo ne zatvara.** Ona sprečava uljeza da se *prijavi*; ne
> sprečava ga da *drži adresu*, a to je šteta.
>
> Migracija `b7d92e40a115` uvodi `uq_internal_users_email` — funkcionalan indeks nad
> `lower(email)`, parcijalan nad `email IS NOT NULL` (jer `NULL` znači „još nema adresu",
> a Clerk je ostavio nekoliko takvih redova i oni nisu međusobni duplikati). Posle njega
> ista registracija vraća **409**, i za `ELSA.Browers@…` takođe — indeks nad sirovom
> kolonom bi propustio jedno veliko slovo.
>
> **Dve posledice u kodu, obe neophodne:**
> 1. `ensure_internal_user` je koristio `ON CONFLICT (external_auth_id) DO NOTHING`, što
>    priguši sudar **samo na tom indeksu**. Sa dva indeksa u igri, sudar na drugom diže
>    baš onaj `UniqueViolationError` zbog kojeg je ta funkcija i pisana (incident od
>    2026-09-07). Sada je goli `DO NOTHING`, koji pokriva oba.
> 2. Čitanje-nazad koje ne nađe red više nije nemoguće stanje: znači da adresa pripada
>    **drugom** identitetu. To je sudar koji rešava čovek, pa je **409**, a ne 500.
>    Isto važi i za putanju izmene adrese, provereno **pre** upisa — `IntegrityError` na
>    commit-u imenuje indeks, ne adresu, i stiže daleko od zahteva koji ga je izazvao.
>
> `ActivationRefusal.EMAIL_TAKEN` **ostaje**. Indeks ne vidi jedini preostali procep:
> kredencijal koji nadživi adresu sa kojom je napravljen (nalog se aktivira kao `a@…`,
> provajder mu posle promeni adresu, i `a@…` je opet slobodna za provizionisanje).
> `test_an_address_another_credential_still_holds_is_refused_not_guessed` gradi tačno to.


---

## 14. AUTH-5 — aktivacija postojećih identiteta (2026-09-08)

### 14.1 Šta se menja, a šta ne

| | |
| --- | --- |
| **menja se** | dodaje se `platform_credentials` red sa `password_hash = NULL` |
| **ne menja se** | `internal_users.id`, `external_auth_id`, `display_name`, `is_superadmin`, sva članstva, i svaki red koji na njih pokazuje |

`internal_users.id` je strani ključ ispod termina, intake slučajeva, vlasništva
nad sadržajem, publication event-ova i audit redova. Migracija koja bi „ponovo
kreirala" naloge tiho bi odvojila terapeuta od sopstvenog caseload-a dok bi svi
ekrani i dalje renderovali. Zato ovde ništa ne upisuje `internal_users` red i
ništa ne dira `organization_memberships`.

**Clerk lozinke se ne prenose.** Nikada nisu bile naše da ih čitamo. Svako
dobija jednokratni link i bira lozinku koju niko drugi nikada nije držao.

### 14.2 Zašto `external_auth_id` ostaje u `user_…` obliku

Namerno, iako `legacy_clerk_id` kolona postoji za preimenovanje.

`external_auth_id` je sada neproziran subject koji engine čita iz reda koji je
već učitao — njegov istorijski oblik ne košta ništa. Ali `roster.py`,
`provision_staff.py` i `provision_team.py` i dalje **traže nalog po toj
vrednosti**. Preimenovanje danas znači da sledeći
`provision_staff.py --person maria` ne nalazi ništa i pravi **drugu** Mariju.

Preimenovanje ide zajedno sa uklanjanjem Clerk ključeva iz ta tri modula —
dakle AUTH-9, ne AUTH-5.

### 14.3 Alat

Jedna komanda, `backend/scripts/platform_accounts.py`, zamenila je
`issue_platform_reset.py`:

```
python scripts/platform_accounts.py --list
python scripts/platform_accounts.py --activate --person maria --dry-run
python scripts/platform_accounts.py --activate --email sanjaneuer@gmail.com
python scripts/platform_accounts.py --activate --all
python scripts/platform_accounts.py --reset  --email milan.drazic@dmdevelon.website
```

`--list` daje ceo cutover kao tabelu (`needs activation` / `link sent, unused` /
`ready` / `no address` / `deactivated`), sortiranu tako da nezavršeno ide prvo —
čitanje ime po ime je način da peta osoba bude zaboravljena.

**Link se štampa jednom i ne upisuje se u log.** Dok nije potrošen, on je
kredencijal.

Aktivacioni link traje **7 dana** (`AuthPolicy.activation_ttl`), za razliku od
sata koliko traje običan reset: predaje se van kanala, osobi koja ga ne
očekuje. Nema zasebnog `TokenPurpose.ACTIVATION` — „postavi prvu lozinku" i
„zameni zaboravljenu" su ista operacija, troše isti token i sleću na istu
stranicu; razlikuje se samo trajanje, pa se samo trajanje prosleđuje.

### 14.4 Proba izvedena na lokalnoj bazi

`--dry-run` → aktivacija → link → `/nova-lozinka` → prijava → `/api/v1/me`
vratio `userId = user_3IxNmb…` (nepromenjen Clerk subject) i članstvo
`sanja-neuer: org_admin, therapist`. Ponovljeni link → 422. Proba je zatim
poništena; lozinku koju sam izmislio Sanja ne nasleđuje.

### 14.5 `drazic.milan@gmail.com` je povučen (D-084)

Taj nalog je bio development login koji je stajao dok dmdevelon nalog ne
postoji (D-026). Postoji, pa je drugi ukinut umesto da se prenese u PDC auth
engine: platform superadmin je najjača stvar u sistemu, a dva ulaza su duplo
veća površina za jednu osobu koja ionako koristi jedan.

Uklonjeno: roster unos `"milan"` i lokalni `internal_users` red
(`user_3GXrf2…`). Pre brisanja provereno da na taj red ne pokazuje **nijedan**
od 34 stranih ključeva ka `internal_users` — nula redova u svakoj tabeli.

Test `test_the_operator_has_exactly_one_way_in` tvrdi da postoji tačno jedan
superadmin unos i da je `member("milan")` `None`. Superadmin nalog koji se vrati
u roster je promena pristupa koju niko nije pregledao; tu bi se videla.

> ⚠️ **Na produkciji tek treba izvršiti.** Ovaj commit menja kod i lokalnu bazu;
> produkciona baza je zasebna. Redosled: `--list` (potvrditi da je red bez
> članstava i bez claimed slučajeva) → `provision_staff.py --revoke --delete
> --external-id <id> --dry-run` → bez `--dry-run`.

### 14.6 Nalaz sa produkcije (2026-09-08)

> ⚠️ **Dva zaključka iz ovog odeljka su 2026-09-09 mereni i oboreni — vidi §16.**
> `drazic.milan@gmail.com` **postoji** na produkciji, i Sanjin identitet **već ima red**
> u produkcijskoj platformskoj bazi. Ostatak odeljka stoji.

`--list` na produkcionoj bazi Psihointegriteta vraća **četiri** identiteta sa
adresom — elsa, john, maria, milan-dmdevelon — i četiri bez adrese. **Sanje nema.**

To je očekivano i nije greška: produkcija ima **dve baze** (D-081 ih spaja tek u
Fazi 7–8), a Sanjin identitet živi u bazi `sanja-production` okruženja. Aktivacija
se zato pušta **dva puta, po jednom u svakom okruženju**.

Ali iz toga sledi stvar koju treba znati pre nego što joj se preda link:

> ⚠️ **Prijava na platformu pita tačno jedan backend.** `platform-auth.ts` koristi
> `NEXT_PUBLIC_API_URL`, namerno — izdavanje sesije u više baza nije ispravno.
> `/api/v1/me` se posle toga grana po svim backend-ovima i spaja članstva, ali
> *prijava* se dešava na jednom mestu. Dakle Sanjin `platform_credentials` red
> mora postojati u bazi na koju `NEXT_PUBLIC_API_URL` pokazuje, čak i ako njena
> članstva ostaju u njenoj bazi.
>
> Proveriti pre aktivacije: `--list` u `sanja-production` okruženju, pa uporediti
> `external_auth_id` sa onim što `NEXT_PUBLIC_API_URL` baza zna. Ako je Sanja samo
> u svojoj bazi, prijava na `p-digital-center.com` joj neće raditi dok se baze ne
> spoje (Faza 7–8) ili dok joj identitet ne postoji i u platformskoj bazi.

`drazic.milan@gmail.com` (D-084) **na produkciji ne postoji** — roster nikada nije
imao produkcioni Clerk id za taj nalog, i nijedan od četiri reda bez adrese ne nosi
ni email ni članstvo. Nema šta da se briše; stavka je zatvorena odsustvom.

Domen je proveren uživo: `p-digital-center.com/nova-lozinka` vraća 200, pa je
podrazumevani `--base-url` ispravan. `psihointegritet.com/radni-prostor` vraća 404,
što potvrđuje da je `PLATFORM_HOST` prebačen (Faza 3 + 4a zatvorene).

### 14.7 Redosled na produkciji

Redosled: `--list` → uporediti sa očekivanih pet → `--dry-run` →
`--activate` po osobi → predati linkove → `--list` dok svih pet ne bude `ready`.

---

## 15. AUTH-6 — Clerk je isključen, prijava je dokazana (2026-09-09)

### 15.1 Šta je AUTH-6 zatekao

Clerk **već nije bio u kodu** — `371abb6` ga je uklonio pre AUTH-1, pa je AUTH-0 („vratiti Clerk
u ispravno stanje") preskočen i nikada izveden. Provereno ovde ponovo, jer je gate: nijedan
`@clerk/*` import, nijedna zavisnost u `package.json`, nijedno Clerk polje u `Settings`,
`infrastructure/auth/` drži samo `identity.py`, `pdc_session.py` i `unavailable.py`. Sve što grep
još nalazi po `frontend/src` su komentari koji objašnjavaju istoriju.

Ostalo je **četiri mesta van koda** koja Clerk još traže, i jedno od njih je kvarilo posao:

| Mesto | Šta je radilo | Rešenje |
| --- | --- | --- |
| **`scripts/start-dev.sh`** | 🔴 `exit 1` ako `CLERK_ISSUER`/`CLERK_JWKS_URL` nisu popunjeni — **svež klon nije mogao da digne lokalni dev** za verifier koji ne postoji | ceo `prepare_backend_clerk_verifier()` obrisan |
| `compose.yaml` | `env_file: backend/.env.compose.local` — postojao samo da doda te Clerk vrednosti | uklonjen; svaka promenljiva se sada imenuje eksplicitno, pa zastareo fajl više ne može tiho da pregazi `DATABASE_URL` i uperi lokalni dev na produkciju |
| `.github/workflows/quality.yml` | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` sa 20 redova obrazloženja o handshake-u | obrisano — `lib/validation/env.ts` ih više ne validira |
| `backend/.env.example`, `frontend/.env.example`, `.env.compose.local.example` | četiri/tri mrtve promenljive; treći fajl je ceo bio Clerk | promenljive obrisane, fajl obrisan |

### 15.2 Nalaz koji je AUTH-6 otkrio: cross-backend spajanje članstava je mrtvo

`server-identity.ts` je na platformskoj površini pitao **svaki** registrovani backend i spajao
članstva. To je bilo ispravno pod Clerk-om: sesija je bila JWT koji svaki backend proverava svojim
JWKS-om.

**Pod D-083 to ne može da radi.** PDC sesija je opaque token u `auth_sessions`, a
`PdcSessionVerifier` ga traži u **svojoj** bazi. Sesija izdata na platformskom backend-u u
Sanjinoj bazi ne postoji, pa njen backend vraća 401 — uvek, po konstrukciji. Fan-out je bio jedan
cross-tenant zahtev po učitavanju stranice koji nije mogao da vrati ništa.

Izmereno na živom backendu, ne izvedeno: token koji nije u `auth_sessions` → **401**.

Posledica se izgovara naglas jer odlučuje migraciju: **čovek čija su članstva u bazi koja nije
izdala njegovu sesiju ne vidi ta članstva uopšte, i ne postoji konfiguracija koja ih vraća.**
Zato Sanjin identitet mora u platformsku bazu (`PDC_CONSOLIDATION_MIGRATION_PLAN_v1_1.md` §5.4) —
to nije preferencija nego preduslov.

**Uz to je popravljen defekt koji bi pogodio svakoga.** `server-session.ts` piše da istekao ili
povučen cookie „reads as not signed in", ali je `loadBackendIdentity` u tom slučaju **bacao**
grešku (`known.length === 0`). Istekla sesija bi dala error boundary umesto preusmerenja na
prijavu — a sesija ističe svakome. Sada 401/403 vraća `null`, guard preusmerava na `/prijava`.

### 15.3 Proba izvedena nad pravom bazom (lokalno)

Nije pretpostavljeno — pušteno je celo. Lokalna baza je pritom **već ciljno stanje**: jedna baza,
obe organizacije, svih pet identiteta uključujući Sanju.

```
1. alembic upgrade head
2. provision_organization.py --list   → psihointegritet · sanja-neuer  (obe, jedna baza)
3. platform_accounts.py --list        → 7 identiteta · 0 može da se prijavi
4. platform_accounts.py --activate --all --dry-run  → tačno pet imena
5. platform_accounts.py --activate --email sanjaneuer@gmail.com   → link
6. POST /api/v1/auth/platform/password/reset  {token, password}   → 204
7. POST /api/v1/auth/platform/login           {email, password}   → 200, opaque token
8. GET  /api/v1/me  Authorization: Bearer <token>                 → 200
      memberships: [{"organizationSlug":"sanja-neuer","roles":["org_admin","therapist"]}]
9. GET  /api/v1/me  sa tokenom koji nije u auth_sessions          → 401
10. platform_accounts.py --list       → sanjaneuer@gmail.com = **ready**
```

Korak **8** je poenta: kad su identitet i članstva u istoj bazi koja je izdala sesiju, Sanjin radni
prostor se razrešava. Korak **9** je isti dokaz sa druge strane — to je tačno ono što bi njen
zasebni backend odgovorio.

> Ruta je `/api/v1/auth/platform/password/reset`, **ne** `/reset-password`. Zapisano jer je prvi
> pokušaj bio pogrešan i vratio 404.

Gates: **872 frontend testova** (100 fajlova) i **649 backend** zeleni, `tsc`, `eslint`, `ruff`,
`pyright` čisti. `format:check` je bio **crven na `main` pre ovog rada** — `4e15cb2` je ostavio
`match.ts`, `domain-registry.ts` i `domain-registry.test.ts` neformatirane; popravljeno usput.

### 15.4 Šta AUTH-6 još traži, a ne može odavde

Sve ispod dodiruje **produkciju** i nijedno se ne može izvesti sa ovog laptopa: nema `railway`
CLI-ja, a `backend/.env.local` pokazuje na `postgres.railway.internal`, koji je dostupan samo
unutar Railway mreže.

**Korak 1 — Sanjin identitet u platformsku bazu.** Danas je nema (§14.6: `--list` na produkciji
vraća četiri adrese). Njen produkcijski `external_auth_id` se čita iz `sanja-production`
okruženja i **prenosi doslovno**, da bi kasnija migracija podataka umela da spoji njena dva reda:

```bash
# u sanja-production okruženju — samo čitanje
railway run -- python scripts/platform_accounts.py --list

# u production okruženju
railway run -- python scripts/provision_organization.py --slug sanja-neuer \
    --display-name "Sanja Neuer" --ui-locale sr-Latn --default-content-locale sr-Latn --dry-run
railway run -- python scripts/provision_staff.py --organization sanja-neuer \
    --external-id <njen produkcijski id> --email sanjaneuer@gmail.com \
    --roles org_admin,therapist --dry-run
```

> ⚠️ `internal_users.id` se **ne** može zadati — generiše ga baza. Njen platformski red zato
> dobija **nov UUID**, dok stari ostaje u `sanja-production`. To je već predviđeno: §10.2 plana
> konsolidacije traži da se jednakost UUID-jeva ne pretpostavlja. Spajanje ta dva reda pri
> migraciji podataka ide **preko `external_auth_id`**, i zato on mora biti prepisan tačno.

**Korak 2 — aktivacija svih pet.** `--list` → `--dry-run` → `--activate` po osobi → predati
linkove → `--list` dok svih pet ne bude `ready`. Link je kredencijal dok je nepotrošen: ne loguje
se i ne šalje kanalom koji ostaje zapisan.

**Korak 3 — GATE.** Gate se zatvara kad `--list` na produkciji pokaže **pet puta `ready`** i kad
svako od njih jednom uđe na `p-digital-center.com/radni-prostor`.

**Nije deo AUTH-6:** brisanje Clerk env promenljivih na Vercel-u i Railway-u i Clerk DNS zapisa
(`clerk.`, `accounts.`, `clkmail`, DKIM). One su van repozitorijuma i ostaju **AUTH-9**; ništa ih
više ne čita, pa ne kvare ništa dok stoje.

---

## 16. Produkcija, izmerena (2026-09-09)

Prvi put očitano direktno: Railway CLI je instaliran, token osvežen, upit pušten kroz javni
Postgres proxy. **Sve ispod je merenje, ne procena** — i menja tri stvari koje su do sada bile
pretpostavka.

### 16.1 Platformska produkcijska baza — devet identiteta, jedan može da uđe

```
created              email                                  pw   verified  subject
2026-08-12 19:59:25  maria.bullock@psihointegritet.com      no   NO        user_3HhAuI4w…
2026-08-12 19:59:25  elsa.browers@psihointegritet.com       no   NO        user_3HhAk6ZX…
2026-08-12 19:59:25  john.francis@psihointegritet.com       no   NO        user_3HhAZZWp…
2026-08-24 13:55:25  —                                      no   NO        user_3GmMkGXG…
2026-09-05 22:07:06  —                                      no   NO        user_3GmLKkzr…
2026-09-05 22:07:19  —                                      no   NO        user_3HpZQJ5s…
2026-09-06 10:50:49  milan.drazic@dmdevelon.website         no   NO       *user_3Ix2Lvk9…
2026-09-06 19:21:55  —                                      no   NO        user_3Iy2Vp5B…   ← Sanja
2026-09-08 07:37:48  drazic.milan@gmail.com                 yes  NO        pdc:182865b8-…
```

**Aktivacija je već puštena** — sva četiri Psiho naloga stoje na „link sent, unused": kredencijal
postoji, lozinku niko nije postavio. AUTH-6 korak 2 je time delimično izveden.

**`drazic.milan@gmail.com` postoji, i jedini je nalog koji danas može da se prijavi.** Prefiks
`pdc:` kaže odakle: nije prenet, nego **samoregistrovan kroz `/registracija`** 2026-09-08, dan
posle provere iz §14.6. Otvorena registracija je namerna i dokumentovano bezbedna — nalog nema
članstvo ni superadmin flag, pa `resolve_staff_actor` odbija sve — ali **D-084 je rekao da za
jednu osobu postoji tačno jedan ulaz**, a ovo je drugi, sa lozinkom. Odluka je Milanova: obrisati
red ili priznati da je registracija stvorila izuzetak koji D-084 nije predvideo.

> ⚠️ **`email_verified_at` je `NULL` na svih devet**, uključujući jedini nalog sa lozinkom.
> Docstring `PlatformAuthService.register` to i kaže: *„Nothing enforces it yet because there is no
> mailer — worth closing before the platform domain sees traffic."* Platformski domen **jeste**
> u saobraćaju od Faze 3. Time otvorena registracija prestaje da bude samo bezopasna: bilo ko sme
> da zauzme bilo koju adresu, uključujući adresu osobe koja tek treba da bude provizionirana.

### 16.2 Sanja ima dva identiteta, i živi je onaj koji već postoji na produkciji

U bazi `sanja-production`:

| subject | `internal_users.id` | članstva u `sanja-neuer` |
| --- | --- | --- |
| `user_3IxNmblGJWzd5JBmbgL8uUnEksz` | `3a0727ed-…` | org_admin, therapist — **disabled** |
| **`user_3Iy2Vp5BNrUCDKyXB3ZxkNPYZHt`** | `8b328f49-…` | org_admin, therapist — **active** |

**Živi je `user_3Iy2Vp5B…`** — i on **već ima red u produkcijskoj platformskoj bazi**, onaj bez
adrese od 2026-09-06 19:21:55, nastao prvim dodirom `/api/v1/me`.

Iz toga slede dve stvari:

1. Provisioning Sanje na produkciji **nije kreiranje reda** nego dopuna postojećeg: email,
   `display_name`, organizacija `sanja-neuer` (koja na produkciji **ne postoji** — tamo je samo
   `psihointegritet`) i dva članstva. Jedna idempotentna komanda.
2. **Pitanje mapiranja UUID-jeva otpada** za njen identitet — subject je isti sa obe strane.

> Lokalna proba iz §15.3 je koristila **stariji** subject (`user_3IxNmbl…`), jer lokalna baza nosi
> njega. Proba je i dalje dokazala mehaniku, ali produkcijska komanda mora nositi `user_3Iy2Vp5B…`.
> Aktivirati pogrešan znači dati joj nalog bez ijedne uloge.

### 16.3 Inventar `sanja-production` — pet redova, ne migracija

52 tabele, **9 nepraznih**. Redova sa `organization_id = sanja-neuer`: **ukupno 5** — 4
`organization_memberships` (2 aktivna, 2 disabled) i 1 `organization_audit_events`. Sve ostalo
(`taxonomy_terms` 17, `therapist_matching_profiles` 3, …) pripada Psihointegritetu i zaostatak je
od forka. **Nula booking-a, nula sadržaja, nula intake-a, nula klijenata.**

Faza 8 iz plana konsolidacije — „migracija Sanjinih podataka", označena kao jedini destruktivan
korak i vezana za GATE B — za podatke koji stvarno postoje svodi se na **jedan poziv
`provision_staff.py`**. Dump pre gašenja i dalje treba, ali ne zato što je u toj bazi nešto
nezamenljivo, nego zato što je to jeftino.
