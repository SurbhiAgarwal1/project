import os
import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.config.settings import get_settings

logger = logging.getLogger("opsara.database")

Base = declarative_base()

settings = get_settings()
db_url = settings.DATABASE_URL

# Fallback to local SQLite if postgres is not available during dev/test
if os.getenv("USE_SQLITE", "false").lower() == "true":
    db_url = "sqlite+aiosqlite:///./opsara.db"

try:
    engine = create_async_engine(
        db_url,
        echo=False,
        future=True,
    )
except Exception as e:
    logger.warning(f"Could not initialize primary database URL {db_url}, using local SQLite: {e}")
    db_url = "sqlite+aiosqlite:///./opsara.db"
    engine = create_async_engine(db_url, echo=False, future=True)

async_session = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initializes tables if they do not exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
