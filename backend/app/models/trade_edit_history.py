from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import ForeignKey, JSON, DateTime, func
from datetime import datetime
from app.core.database import Base

class TradeEditHistory(Base):
    __tablename__ = "trade_edit_history"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    trade_id: Mapped[int] = mapped_column(ForeignKey("trades.id", ondelete="CASCADE"), nullable=False, index=True)
    edited_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    old_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    new_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    diff: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
