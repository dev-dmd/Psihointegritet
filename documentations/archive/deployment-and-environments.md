> ## ⛔ SUPERSEDED — 2026-07-17
>
> **Status:** istorijski kontekst. **Nije izvor odluka.**
> Obavezujuća su četiri dokumenta: `CLAUDE_CODE_MASTER_PLAN_v1_0.md`, `Psihointegritet_Razvojni_Proposal_v1_1.docx`, `IZMENE_POSTOJECEG_PROJEKTA_v1_0.md`, `ARCHITECTURAL_RULES_REVISED.md`.
>
> **Zamenjuje ga:** `CLAUDE_CODE_MASTER_PLAN_v1_0.md` §14 (Environments & secrets)
>
> **Zašto je arhiviran:** Master plan §14 ima potpuniju matricu okruženja (preview/staging/production × resurs).
>
> **Šta i dalje vredi pročitati:** Git model (main/staging/feature) i pravilo „preview nikad ne koristi produkcijsku bazu“.

---

Git model
main
→ production

staging
→ stalni staging URL

feature/\*
→ PR preview deployments
Odvojeni resursi
Resurs Preview Staging Production
Database test/branch staging DB production DB
Resend test sender staging sender verified production domain
Storage test prefix staging bucket production bucket
OAuth development staging app production app
Payments sandbox sandbox live
Push keys test staging VAPID production VAPID

Preview deployment nikada ne treba da koristi production bazu.
