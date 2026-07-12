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
