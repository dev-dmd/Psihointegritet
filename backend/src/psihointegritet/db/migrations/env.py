from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from psihointegritet.core.config import get_settings
from psihointegritet.db.base import Base
from psihointegritet.modules.guidance import models as guidance_models
from psihointegritet.modules.identity import models as identity_models
from psihointegritet.modules.organizations import models as organization_models

# Alembic needs each mapped module imported before it reads Base.metadata.
MODEL_MODULES = (guidance_models, identity_models, organization_models)

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import model modules here as they appear so autogenerate sees them.
target_metadata = Base.metadata


def _database_url() -> str:
    """Migrations run over the synchronous psycopg driver."""
    return get_settings().migration_database_url


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
