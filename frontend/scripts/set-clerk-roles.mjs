#!/usr/bin/env node
/**
 * Clerk publicMetadata bootstrap tool.
 *
 * PostgreSQL membership is the authorization authority. This script exists only
 * while the frontend's D-026 compatibility seam still needs metadata. It is
 * intentionally strict because a development and a production Clerk instance
 * have different users with the same email address.
 *
 * From frontend/ (a production secret never belongs in .env.local):
 *   read -rsp 'Clerk secret: ' CLERK_SECRET_KEY; echo; export CLERK_SECRET_KEY
 *   npm run roles:assign -- --instance production --confirm-instance ins_...   # dry run
 *   npm run roles:assign -- --instance production --confirm-instance ins_... --apply
 */

const API = "https://api.clerk.com/v1";
const args = new Set(process.argv.slice(2));
const valueAfter = (name) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
};
const instance = valueAfter("--instance");
const confirmInstance = valueAfter("--confirm-instance");
const apply = args.has("--apply");
const secretKey = process.env.CLERK_SECRET_KEY;

function die(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

if (instance !== "development" && instance !== "production") {
  die("obavezan je --instance development ili --instance production");
}
if (!secretKey) die("CLERK_SECRET_KEY nije postavljen");
if (instance === "development" && !secretKey.startsWith("sk_test_")) {
  die("development zahteva sk_test_ Clerk secret");
}
if (instance === "production" && !secretKey.startsWith("sk_live_")) {
  die("production zahteva sk_live_ Clerk secret");
}
if (!confirmInstance?.startsWith("ins_")) {
  die(
    "obavezan je --confirm-instance ins_...; prepiši ga iz Clerk Dashboard-a",
  );
}

const headers = {
  Authorization: `Bearer ${secretKey}`,
  "Content-Type": "application/json",
};

const TEAM = [
  {
    email: "maria.bullock@psihointegritet.com",
    ids: {
      development: "user_3Hh6tfRfCwxo8dv24ynFasyDGI2",
      production: "user_3HhAuI4wlf8Pa5UaYl49ClDanWr",
    },
    publicMetadata: {
      roles: ["org_admin", "therapist"],
      org: "psihointegritet",
    },
  },
  {
    email: "elsa.browers@psihointegritet.com",
    ids: {
      development: "user_3Hh7bqnGryNrpxPSO4PYyiFlDQQ",
      production: "user_3HhAk6ZXwrMb46XpVpbvJZ0D0ai",
    },
    publicMetadata: { roles: ["therapist"], org: "psihointegritet" },
  },
  {
    email: "john.francis@psihointegritet.com",
    ids: {
      development: "user_3Hh7rWs8ualhw6509eHrpgsO4Qf",
      production: "user_3HhAZZWpZkRHiE7c9yWBmmXCZ7w",
    },
    publicMetadata: { roles: ["therapist"], org: "psihointegritet" },
  },
];

async function getInstance() {
  const response = await fetch(`${API}/instance`, { headers });
  if (!response.ok) throw new Error(`GET /instance: HTTP ${response.status}`);
  return response.json();
}

async function findUser(email) {
  const response = await fetch(
    `${API}/users?email_address=${encodeURIComponent(email)}&limit=1`,
    { headers },
  );
  if (!response.ok)
    throw new Error(`GET users (${email}): HTTP ${response.status}`);
  const users = await response.json();
  return Array.isArray(users) && users.length === 1 ? users[0] : null;
}

async function patchMetadata(userId, publicMetadata) {
  const response = await fetch(`${API}/users/${userId}/metadata`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ public_metadata: publicMetadata }),
  });
  if (!response.ok)
    throw new Error(`PATCH metadata (${userId}): HTTP ${response.status}`);
}

try {
  const clerkInstance = await getInstance();
  if (clerkInstance.environment_type !== instance) {
    die(
      `secret pripada '${clerkInstance.environment_type}', a tražen je '${instance}'`,
    );
  }
  if (clerkInstance.id !== confirmInstance) {
    die(
      `instance mismatch: Clerk je '${clerkInstance.id}', potvrđen je '${confirmInstance}'`,
    );
  }

  console.log(
    `Clerk instance: ${clerkInstance.id} (${clerkInstance.environment_type}) — ${apply ? "APPLY" : "DRY RUN"}`,
  );

  // Resolve and validate every person before the first mutation. A mistyped
  // secret, email or copied user ID must never partially update the team.
  const resolved = await Promise.all(
    TEAM.map(async (assignment) => ({
      assignment,
      user: await findUser(assignment.email),
    })),
  );
  for (const { assignment, user } of resolved) {
    if (!user) die(`${assignment.email} nema nalog u ovoj Clerk instanci`);
    const expectedId = assignment.ids[instance];
    if (user.id !== expectedId) {
      die(
        `${assignment.email}: očekivan ${expectedId}, Clerk je vratio ${user.id}`,
      );
    }
  }

  for (const { assignment, user } of resolved) {
    if (apply) await patchMetadata(user.id, assignment.publicMetadata);
    console.log(
      `${apply ? "OK " : "DRY"} ${assignment.email} [${user.id}] → ${JSON.stringify(assignment.publicMetadata)}`,
    );
  }
  console.log(
    apply
      ? `Gotovo: ${resolved.length} ažurirano.`
      : "Dry-run gotov — dodaj --apply za upis.",
  );
} catch (error) {
  die(error instanceof Error ? error.message : "nepoznata Clerk greška");
}
