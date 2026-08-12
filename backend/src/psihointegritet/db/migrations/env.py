from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool
from sqlalchemy.engine import Connection

from psihointegritet.core.config import get_settings
from psihointegritet.db.base import Base
from psihointegritet.modules.booking import models as booking_models
from psihointegritet.modules.compass import models as compass_models
from psihointegritet.modules.content import models as content_models
from psihointegritet.modules.content import taxonomy_models
from psihointegritet.modules.guidance import models as guidance_models
from psihointegritet.modules.identity import models as identity_models
from psihointegritet.modules.organizations import models as organization_models
from psihointegritet.modules.privacy import models as privacy_models
from psihointegritet.modules.research import models as research_models

# Alembic needs each mapped module imported before it reads Base.metadata.
# A module missing from this tuple is invisible to autogenerate: its tables
# are silently left out of the migration rather than reported as an error.
MODEL_MODULES = (
    booking_models,
    content_models,
    compass_models,
    taxonomy_models,
    guidance_models,
    identity_models,
    organization_models,
    privacy_models,
    research_models,
)

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import model modules here as they appear so autogenerate sees them.
target_metadata = Base.metadata


def _database_url() -> str:
    """Migrations run over the synchronous psycopg driver."""
    return get_settings().migration_database_url


#: Arbitrary but fixed key for the advisory lock that serialises migration runs.
#: Any constant works as long as it never changes — a new value would let an old
#: and a new deployment migrate at the same time, which is the thing this stops.
_MIGRATION_ADVISORY_LOCK_KEY = 8_140_723_915_662_001


def _guard_concurrent_runs(connection: Connection) -> None:
    """Serialise migration runs and bound how long DDL waits for a lock.

    Railway runs ``alembic upgrade head`` as a ``preDeployCommand`` while the
    **previous** deployment is still serving traffic, and retries it up to three
    times on failure. That gives two ways for a deadlock to appear, and the
    production deploy on 2026-08-12 hit one of them: a live query holding
    ``AccessShareLock`` on a table the migration needed ``AccessExclusiveLock``
    for (``DROP TABLE availability_rules`` in ``20260810_0022``), each session
    waiting on a relation the other had already locked.

    Two guards, for the two causes:

    - ``pg_advisory_lock`` makes a second ``alembic upgrade head`` wait for the
      first instead of interleaving with it. Session-scoped, so it is released
      when the connection closes — including when a migration raises.
    - ``lock_timeout`` bounds how long any single statement waits for a table
      lock. Without it a migration queues behind a live query indefinitely and
      is free to deadlock; with it the run fails fast with a readable error and
      the deploy retry gets a clean attempt.

    ``statement_timeout`` is deliberately left alone: migrations legitimately
    run long data backfills, and capping those would trade a rare deadlock for
    a routine failure.

    The ``commit()`` is not optional. Issuing any statement on a fresh
    Connection implicitly begins a transaction, and Alembic's own
    ``begin_transaction()`` then nests inside it rather than owning it — so its
    commit resolves nothing and SQLAlchemy rolls the whole migration back when
    the connection closes. `upgrade head` reports success and applies nothing.
    `test_booking_migration_chain.py` caught exactly that. Both settings are
    session-scoped, so committing here keeps them for the run.
    """
    connection.exec_driver_sql("SET lock_timeout = '10s'")
    connection.exec_driver_sql(f"SELECT pg_advisory_lock({_MIGRATION_ADVISORY_LOCK_KEY})")
    connection.commit()


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode — emits SQL without a DBAPI."""
    context.configure(
        url=_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode against a live connection."""
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = _database_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        # Before `context.configure`, so the lock is held for the whole run —
        # including the revision lookup that decides what to apply.
        _guard_concurrent_runs(connection)

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
