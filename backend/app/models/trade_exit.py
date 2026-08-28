from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Float, ForeignKey, String, DateTime
from datetime import datetime
from app.core.database import Base, TimestampMixin

class TradeExit(Base, TimestampMixin):
    __tablename__ = "trade_exits"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    trade_id: Mapped[int] = mapped_column(ForeignKey("trades.id", ondelete="CASCADE"), nullable=False, index=True)
    exit_price: Mapped[float] = mapped_column(Float, nullable=False)
    exit_quantity: Mapped[float] = mapped_column(Float, nullable=False)
    exit_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    exit_reason: Mapped[str] = mapped_column(String(30), nullable=False)  # TP1/TP2/TP3/SL/Manual/BE/Panic Close
    pnl_cash: Mapped[float | None] = mapped_column(Float)
    pnl_r: Mapped[float | None] = mapped_column(Float)

    trade: Mapped["Trade"] = relationship("Trade", back_populates="exits")
