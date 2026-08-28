from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Float, ForeignKey, DateTime, func, JSON
from datetime import datetime
from app.core.database import Base

class DraftTrade(Base):
    __tablename__ = "draft_trades"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(String(20), nullable=False)
    signal_type: Mapped[str] = mapped_column(String(20), nullable=False)  # BUY / SELL
    price: Mapped[float] = mapped_column(Float, nullable=False)
    sl: Mapped[float | None] = mapped_column(Float)
    tp: Mapped[float | None] = mapped_column(Float)
    raw_payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    source: Mapped[str] = mapped_column(String(50), default="tradingview")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
