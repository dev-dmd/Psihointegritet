-- Sanja into every database that survives, and the retired account out (D-083, D-084).
--
-- Run in the Railway dashboard: Postgres service → Data tab. Once against
-- **production**, once against **staging**. Those two are all that remain;
-- `sanja-production`, `sanja-staging` and `features` are being deleted from the
-- Railway UI, which is a separate action and not something SQL can do.
--
-- ── It does not assume what it will find ─────────────────────────────────────
--
-- Production was measured on 2026-09-09: Sanja's row exists there with no email
-- on it, the `sanja-neuer` organization does not exist, and the retired account
-- does. **Staging was never measured** — the CLI is gone from the machine — so
-- everything below is written to be correct whether the row is there or not,
-- and to abort rather than half-apply when it meets something unexpected.
--
-- One transaction. Any `RAISE EXCEPTION` rolls back everything, including the
-- links in step 4, so a refusal costs nothing but a re-read.
--
-- ── Two things to know before running ────────────────────────────────────────
--
-- 1. **Step 4 prints links, and they are credentials.** Whoever holds one sets
--    that account's password. They exist only in that result grid — the
--    database keeps a SHA-256 digest, which is the point. Copy, hand over,
--    close the tab.
--
-- 2. **Run it once per database.** Step 4 spends every outstanding link for
--    those accounts before minting new ones, so a second run silently
--    invalidates links already handed over. Everything else is idempotent.
--
-- Why the subject is written out rather than looked up by email: Sanja has
-- **two** in `sanja-production`, and the other one — `user_3IxNmbl…` — carries
-- `disabled` memberships. Provisioning that one yields an account with no roles
-- that looks correct until she signs in and reaches nothing.

BEGIN;

-- ── [0] What is in *this* database ───────────────────────────────────────────
-- Read this before scrolling on. It is the only place the two environments are
-- allowed to differ, and it says which case you are in.
SELECT
  (SELECT count(*) FROM organizations WHERE slug = 'sanja-neuer')            AS org_exists,
  (SELECT count(*) FROM internal_users
     WHERE external_auth_id = 'user_3Iy2Vp5BNrUCDKyXB3ZxkNPYZHt')            AS sanja_live_subject,
  (SELECT count(*) FROM internal_users
     WHERE external_auth_id = 'user_3IxNmblGJWzd5JBmbgL8uUnEksz')            AS sanja_old_subject,
  (SELECT count(*) FROM internal_users
     WHERE external_auth_id = 'pdc:182865b8-26fa-4907-a398-a3cf0ada8a3f')    AS retired_account,
  (SELECT count(*) FROM platform_credentials c JOIN internal_users u ON u.id = c.user_id
     WHERE u.email = 'milan.drazic@dmdevelon.website')                       AS operator_credential;

-- ── [1] Refuse the one shape that cannot be resolved automatically ───────────
-- `platform_credentials.normalized_email` is unique. If Sanja's address already
-- belongs to a *different* identity — her superseded subject, most likely —
-- then two rows want one address and only a person can decide which survives.
DO $$
DECLARE owner_subject text;
BEGIN
  SELECT u.external_auth_id INTO owner_subject
  FROM platform_credentials c
  JOIN internal_users u ON u.id = c.user_id
  WHERE c.normalized_email = 'sanjaneuer@gmail.com'
    AND u.external_auth_id <> 'user_3Iy2Vp5BNrUCDKyXB3ZxkNPYZHt';
  IF FOUND THEN
    RAISE EXCEPTION
      'sanjaneuer@gmail.com already belongs to %, not to the live subject. Two '
      'identity rows want one address; resolve by hand. Nothing was written.',
      owner_subject;
  END IF;
END $$;

-- ── [2] The organization, before anybody can be a member of it ───────────────
INSERT INTO organizations (id, slug, display_name, ui_locale, default_content_locale, created_at)
VALUES (gen_random_uuid(), 'sanja-neuer', 'Sanja Neuer', 'sr-Latn', 'sr-Latn', now())
ON CONFLICT (slug) DO NOTHING;

INSERT INTO organization_audit_events
       (id, organization_id, actor_user_id, actor_kind, event_type, details, created_at)
SELECT gen_random_uuid(), o.id, NULL, 'system', 'organization.created',
       jsonb_build_object(
         'source', 'railway_sql', 'slug', 'sanja-neuer', 'displayName', 'Sanja Neuer',
         'uiLocale', 'sr-Latn', 'defaultContentLocale', 'sr-Latn'
       ),
       now()
FROM organizations o
WHERE o.slug = 'sanja-neuer'
  AND NOT EXISTS (
    SELECT 1 FROM organization_audit_events e
    WHERE e.organization_id = o.id AND e.event_type = 'organization.created'
  );

-- ── [3] Sanja — created if absent, filled in if present ──────────────────────
-- Upsert rather than either alone: on production the row exists (created by
-- `/api/v1/me` on her first visit, with no address on it) and on a database
-- that has never seen her it does not.
INSERT INTO internal_users
       (id, external_auth_id, email, display_name, is_active, is_superadmin, created_at)
VALUES (gen_random_uuid(), 'user_3Iy2Vp5BNrUCDKyXB3ZxkNPYZHt',
        'sanjaneuer@gmail.com', 'Sanja Neuer', true, false, now())
ON CONFLICT (external_auth_id) DO UPDATE
  SET email = EXCLUDED.email,
      display_name = COALESCE(internal_users.display_name, EXCLUDED.display_name);

INSERT INTO organization_memberships (id, organization_id, user_id, role, status, created_at)
SELECT gen_random_uuid(), o.id, u.id, r.role, 'active', now()
FROM organizations o
CROSS JOIN internal_users u
CROSS JOIN (VALUES ('org_admin'), ('therapist')) AS r(role)
WHERE o.slug = 'sanja-neuer'
  AND u.external_auth_id = 'user_3Iy2Vp5BNrUCDKyXB3ZxkNPYZHt'
ON CONFLICT ON CONSTRAINT uq_membership_role DO UPDATE SET status = 'active';

-- The credential activation would create: the account becomes *reachable* here
-- and *enterable* only once its owner spends the link below.
INSERT INTO platform_credentials (user_id, normalized_email, password_hash, created_at)
SELECT u.id, 'sanjaneuer@gmail.com', NULL, now()
FROM internal_users u
WHERE u.external_auth_id = 'user_3Iy2Vp5BNrUCDKyXB3ZxkNPYZHt'
ON CONFLICT (user_id) DO NOTHING;

-- ── [4] The links — the only output that is not recoverable ──────────────────
-- The plaintext is generated *in the database* and returned to you; only its
-- SHA-256 digest is stored, exactly as `secrets.hash_token` computes it.
--
-- The operator is included on every run, not only where something is deleted:
-- an environment where nobody can sign in is not usable, and re-issuing his
-- link costs nothing.
WITH targets AS MATERIALIZED (
  SELECT u.id AS user_id, u.email,
         replace(gen_random_uuid()::text, '-', '')
           || replace(gen_random_uuid()::text, '-', '') AS plaintext
  FROM internal_users u
  WHERE u.email IN ('milan.drazic@dmdevelon.website', 'sanjaneuer@gmail.com')
    AND EXISTS (SELECT 1 FROM platform_credentials c WHERE c.user_id = u.id)
),
spent AS (
  -- Two live links for one person in two mailboxes is how the older one still
  -- opens the account after the newer has been used.
  UPDATE auth_tokens SET consumed_at = now()
  WHERE consumed_at IS NULL AND purpose = 'password_reset'
    AND user_id IN (SELECT user_id FROM targets)
  RETURNING 1
),
minted AS (
  INSERT INTO auth_tokens (id, purpose, kind, user_id, token_hash, expires_at, created_at)
  SELECT gen_random_uuid(), 'password_reset', 'platform', t.user_id,
         encode(sha256(convert_to(t.plaintext, 'UTF8')), 'hex'),
         now() + interval '7 days', now()
  FROM targets t
  RETURNING user_id
)
SELECT t.email,
       'https://p-digital-center.com/nova-lozinka?token=' || t.plaintext AS link,
       (SELECT count(*) FROM spent)  AS older_links_invalidated,
       (SELECT count(*) FROM minted) AS links_minted
FROM targets t
ORDER BY t.email;

-- ── [5] The retired account (D-084), and only where it exists ────────────────
-- The guard fires only when there is something to delete: on a database that
-- never had it, demanding a live operator link would abort a transaction that
-- was doing nothing dangerous.
DO $$
DECLARE retired integer; live integer;
BEGIN
  SELECT count(*) INTO retired FROM internal_users
   WHERE external_auth_id = 'pdc:182865b8-26fa-4907-a398-a3cf0ada8a3f';
  IF retired = 0 THEN
    RAISE NOTICE 'retired account absent — nothing to delete';
    RETURN;
  END IF;

  SELECT count(*) INTO live
  FROM auth_tokens t JOIN internal_users u ON u.id = t.user_id
  WHERE u.email = 'milan.drazic@dmdevelon.website'
    AND t.purpose = 'password_reset' AND t.consumed_at IS NULL AND t.expires_at > now();
  IF live = 0 THEN
    RAISE EXCEPTION
      'No live link for milan.drazic@dmdevelon.website, and the account about to '
      'be deleted is the only one that can sign in. Nothing was written.';
  END IF;

  -- `platform_credentials`, `auth_sessions` and `auth_tokens` cascade with it.
  DELETE FROM internal_users
   WHERE external_auth_id = 'pdc:182865b8-26fa-4907-a398-a3cf0ada8a3f';
  RAISE NOTICE 'retired account deleted';
END $$;

-- ── [6] What this database looks like now ────────────────────────────────────
SELECT u.email,
       u.external_auth_id,
       u.is_superadmin,
       (c.password_hash IS NOT NULL) AS has_password,
       (SELECT string_agg(o.slug || ':' || m.role, ', ' ORDER BY m.role)
          FROM organization_memberships m
          JOIN organizations o ON o.id = m.organization_id
         WHERE m.user_id = u.id AND m.status = 'active') AS memberships
FROM internal_users u
LEFT JOIN platform_credentials c ON c.user_id = u.id
ORDER BY u.email NULLS LAST;

COMMIT;
