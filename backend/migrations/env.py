
import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

from app.db.models import Base
from app.db.database import DATABASE_URL


# Получаем конфигурацию Alembic
config = context.config

# Используем адрес нашей базы данных
config.set_main_option("sqlalchemy.url", DATABASE_URL)

# Настраиваем логирование
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Подключаем метаданные моделей для автогенерации миграций
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    # Настраиваем миграции без подключения к базе данных
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    # Выполняем миграции через переданное соединение
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online():
    # Создаём асинхронный движок для Alembic
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        # Передаём синхронную функцию миграций через асинхронное соединение
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
