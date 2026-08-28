"""
Async SQLAlchemy 2.0 database setup.
- async engine + session
- Base with soft-delete mixin
"""
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import DateTime, func
from datetime import datetime
import os
from .config import settings

# Use DATABASE_URL from env if provided
db_url = os.getenv("DATABASE_URL", settings.DATABASE_URL)
engine = create_async_engine(db_url, echo=False, future=True, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
