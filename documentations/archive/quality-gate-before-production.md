> ## ⛔ SUPERSEDED — 2026-07-17
>
> **Status:** istorijski kontekst. **Nije izvor odluka.**
> Obavezujuća su četiri dokumenta: `CLAUDE_CODE_MASTER_PLAN_v1_0.md`, `Psihointegritet_Razvojni_Proposal_v1_1.docx`, `IZMENE_POSTOJECEG_PROJEKTA_v1_0.md`, `ARCHITECTURAL_RULES_REVISED.md`.
>
> **Zamenjuje ga:** `CLAUDE_CODE_MASTER_PLAN_v1_0.md` §12 (Definition of Done i quality gates)
>
> **Zašto je arhiviran:** Redundantan **i netačan**: navodi „Drizzle migration check“, a projekat koristi Alembic (master plan §2 to vodi kao poznat defekt). Master plan §12 propisuje tačne komande za oba app-a.
>
> **Šta i dalje vredi pročitati:** Lista od 5 kritičnih E2E tokova je i dalje korisna kao podsetnik za M2.7.

---

Quality gate pre produkcije
TypeScript strict ✅
ESLint ✅
Next.js production build ✅
Drizzle migration check ✅
Vitest unit tests ✅
Booking integration tests ✅
Playwright critical flows ✅
Authorization tests ✅
Tenant isolation tests ✅
Accessibility smoke tests ✅
Security headers ✅
Webhook signature tests ✅
Backup/restore proba ✅
Privacy/legal content review ✅

Kritični E2E tokovi:

visitor → therapist → service → slot → registration → appointment

visitor → guided selection → recommendation → booking

therapist → login → availability → confirm appointment

admin → create workshop → publish → client enrollment

client → cancel/reschedule according to policy
