
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)


# Адрес локальной базы данных SQLite
DATABASE_URL = "sqlite+aiosqlite:///./keitaro_wrapper.db"


# Создаём асинхронный движок SQLAlchemy
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
)


# Фабрика для создания сессий базы данных
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db():
    # Создаём сессию для работы с базой данных
    async with AsyncSessionLocal() as session:
        yield session
