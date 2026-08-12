#!/usr/bin/env node
/**
 * Dodela rola kroz Clerk publicMetadata (privremeni izvor rola, D-026).
 *
 * Pokretanje iz frontend/:
 *   set -a; . ./.env.local; set +a; npm run roles:assign          # primeni
 *   set -a; . ./.env.local; set +a; npm run roles:assign -- --dry-run
 *
 * Ponašanje:
 * - idempotentno: PATCH metadata je shallow-merge, ponovno pokretanje je bezbedno;
 * - nalog koji ne postoji u Clerk instanci → SKIP (kreirati nalog pa ponovo);
 * - exit != 0 samo za API/auth greške, ne za nepostojeće naloge.
 *
 * Pri launchu OBAVEZNO pokrenuti i sa produkcionim CLERK_SECRET_KEY (O-18).
 * Ručna alternativa: Clerk Dashboard → Users → korisnik → Metadata → Public.
 */

const ASSIGNMENTS = [
  {
    email: "milan.drazic@dmdevelon.website",
    publicMetadata: { superadmin: true },
  },
  // Postojeći Milanov login u dev instanci — superadmin i ovde (odluka 2026-07-20).
  {
    email: "drazic.milan@gmail.com",
    publicMetadata: { superadmin: true },
  },
  // ── Tim, po D-074 i `backend/.../identity/roster.py` ──
  //
  // Backend membership i Clerk publicMetadata su dva odvojena izvora dok se
  // D-026 ne zameni sa GET /api/v1/me. Ovaj spisak zato mora ostati u potpunoj
  // saglasnosti sa backend rosterom: Maria vodi centar, dok Elsa i John nemaju
  // org_admin pristup tuđim rasporedima i organizacionim podešavanjima.
  {
    email: "maria.bullock@psihointegritet.com",
    publicMetadata: {
      roles: ["org_admin", "therapist"],
      org: "psihointegritet",
    },
  },
  {
    email: "elsa.browers@psihointegritet.com",
    publicMetadata: {
      roles: ["therapist"],
      org: "psihointegritet",
    },
  },
  {
    email: "john.francis@psihointegritet.com",
    publicMetadata: {
      roles: ["therapist"],
      org: "psihointegritet",
    },
  },
  // Stari tim (Anja, Marija Stamenković i Marjan) namerno više nije ovde.
  // Skript samo DODELJUJE role i nikada ih ne oduzima — uklanjanje njihovih
  // production naloga ostaje zaseban potez
  // (PATCH `{ roles: [] }` ili Clerk Dashboard), ne posledica ove izmene.
];

const API = "https://api.clerk.com/v1";
const secretKey = process.env.CLERK_SECRET_KEY;
const dryRun = process.argv.includes("--dry-run");

if (!secretKey) {
  console.error(
    "CLERK_SECRET_KEY nije postavljen. Pokreni: set -a; . ./.env.local; set +a",
  );
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${secretKey}`,
  "Content-Type": "application/json",
};

async function findUser(email) {
  const url = `${API}/users?email_address=${encodeURIComponent(email)}&limit=1`;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`GET users (${email}): HTTP ${response.status}`);
  }
  const users = await response.json();
  return Array.isArray(users) && users.length > 0 ? users[0] : null;
}

async function patchMetadata(userId, publicMetadata) {
  const response = await fetch(`${API}/users/${userId}/metadata`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ public_metadata: publicMetadata }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `PATCH metadata (${userId}): HTTP ${response.status} ${body}`,
    );
  }
}

let applied = 0;
let skipped = 0;

for (const assignment of ASSIGNMENTS) {
  const user = await findUser(assignment.email);
  if (!user) {
    console.log(
      `SKIP  ${assignment.email} — nema Clerk naloga (kreirati nalog pa ponovo pokrenuti)`,
    );
    skipped += 1;
    continue;
  }
  if (dryRun) {
    console.log(
      `DRY   ${assignment.email} [${user.id}] → ${JSON.stringify(assignment.publicMetadata)}`,
    );
    continue;
  }
  await patchMetadata(user.id, assignment.publicMetadata);
  console.log(
    `OK    ${assignment.email} [${user.id}] → ${JSON.stringify(assignment.publicMetadata)}`,
  );
  applied += 1;
}

console.log(
  dryRun
    ? `Dry-run gotov (${skipped} preskočeno).`
    : `Gotovo: ${applied} ažurirano, ${skipped} preskočeno.`,
);
