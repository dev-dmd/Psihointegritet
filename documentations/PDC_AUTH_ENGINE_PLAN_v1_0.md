# PDC Auth Engine — audit i plan zamene Clerk-a

**Datum:** 2026-09-07 · **Vlasnik:** Milan Dražić (CTO) · **Status:** audit + plan, **bez implementacije**
**Odluka:** D-083 (predložena) · **Prethodi:** D-081, **D-082 (scope gate)**, ADR-023, `PDC_CONSOLIDATION_MIGRATION_PLAN_v1_1.md`
**Referenca:** Marysoll `AUTH-SESSION-COOKIE-COLLISION.md`, `AuthUser.ts`, `TenantUser.ts`, `tenant-auth/*` — **kao izvor granica i grešaka, ne kao izvor koda**

---

## 0. Jedna stvar pre svega ostalog

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
AUTH-6  ── GATE ── Clerk se isključuje na platformi
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

**Nema rute koja izdaje reset token.** Izdavanje linka je bezbedno tek kad
postoji dostava; vraćanje tokena u odgovoru ili upis u log je preuzimanje
naloga po email adresi. Do mailer-a link štampa
`backend/scripts/issue_platform_reset.py` — ista komanda koju AUTH-5 aktivacija
koristi, jer je „postavi prvu lozinku" ista operacija kao „zameni zaboravljenu".

**`email_verified_at` se upisuje ali se ne zahteva pri prijavi.** Nema mailer-a
da bi verifikacija bila prohodna. Zatvoriti pre nego što platformski domen
dobije saobraćaj.

**Registracija je otvorena.** Nalog koji otvara nema nijedno članstvo ni
superadmin flag, pa `resolve_staff_actor` odbija — privilegija dolazi iz
`organization_memberships`, nikada iz činjenice da je neko prijavljen.


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
python scripts/platform_accounts.py --reset  --email drazic.milan@gmail.com
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

### 14.5 Otvoreno pre produkcije

> ⚠️ `drazic.milan@gmail.com` — u lokalnoj bazi taj red (`user_3GXrf2…`) **nema
> email**, pa se ne može aktivirati. Ako isto važi na produkciji, Milan ili
> koristi `milan.drazic@dmdevelon.website`, ili se toj identity vrsti prvo
> upiše adresa preko `provision_staff.py`. `--list` to prikazuje kao
> `no address`.

Redosled na produkciji: `--list` → uporediti sa očekivanih pet → `--dry-run` →
`--activate` po osobi → predati linkove → `--list` dok svih pet ne bude `ready`.
