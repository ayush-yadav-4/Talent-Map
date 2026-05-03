from collections.abc import AsyncGenerator
import logging

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

logger = logging.getLogger(__name__)


def _async_database_url(url: str) -> str:
    """Normalize to SQLAlchemy async driver (psycopg v3)."""
    u = url.strip()
    if "+psycopg_async" in u or "+asyncpg" in u:
        u = u.replace("+asyncpg", "+psycopg_async", 1)
    elif u.startswith("postgresql://"):
        u = u.replace("postgresql://", "postgresql+psycopg_async://", 1)
    # Supabase / many cloud hosts require TLS; async fails mysteriously without it.
    low = u.lower()
    if "supabase.co" in low or "pooler.supabase.com" in low:
        if "sslmode=" not in low and "ssl=" not in low:
            u = f"{u}{'&' if '?' in u else '?'}sslmode=require"
    return u


engine = create_async_engine(
    _async_database_url(settings.database_url),
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """SQLAlchemy declarative base."""


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except HTTPException:
            await session.rollback()
            raise
        except Exception:
            logger.exception("database.session.error transaction rolled back")
            await session.rollback()
            raise
