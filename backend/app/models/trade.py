from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Float, Integer, DateTime, ForeignKey, Text, JSON
from datetime import datetime
from app.core.database import Base, TimestampMixin

class Trade(Base, TimestampMixin):
    __tablename__ = "trades"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    trade_no: Mapped[str] = mapped_column(String(50), unique=True, index=True)  # e.g. TRD-2025-0001
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), nullable=False, index=True)

    entry_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    exit_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    symbol: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    direction: Mapped[str] = mapped_column(String(10), nullable=False)  # LONG / SHORT

    entry_price: Mapped[float] = mapped_column(Float, nullable=False)
    stop_loss: Mapped[float | None] = mapped_column(Float)
    take_profit_1: Mapped[float | None] = mapped_column(Float)
    take_profit_2: Mapped[float | None] = mapped_column(Float)
    take_profit_3: Mapped[float | None] = mapped_column(Float)

    position_size: Mapped[float] = mapped_column(Float, nullable=False)
    account_risk_percent: Mapped[float | None] = mapped_column(Float)
    leverage: Mapped[float | None] = mapped_column(Float)
    margin_used: Mapped[float | None] = mapped_column(Float)
    commission_fees: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(20), default="OPEN")  # OPEN/CLOSED/PARTIAL

    emotions: Mapped[list | None] = mapped_column(JSON)  # list of emotion ids/names
    indicators_used: Mapped[list | None] = mapped_column(JSON)
    setups: Mapped[list | None] = mapped_column(JSON)
    execution_quality_score: Mapped[int | None] = mapped_column(Integer)
    trade_setup_notes: Mapped[str | None] = mapped_column(Text)
    chart_snapshot_paths: Mapped[list | None] = mapped_column(JSON)

    # calculated
    planned_rr: Mapped[float | None] = mapped_column(Float)
    realized_rr: Mapped[float | None] = mapped_column(Float)
    net_pnl_cash: Mapped[float | None] = mapped_column(Float)
    net_pnl_r: Mapped[float | None] = mapped_column(Float)

    # relationships
    exits: Mapped[list["TradeExit"]] = relationship("TradeExit", back_populates="trade", cascade="all, delete-orphan")
