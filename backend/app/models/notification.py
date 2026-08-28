from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, ForeignKey, Boolean, DateTime, func, JSON
from datetime import datetime
from app.core.database import Base

class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # daily_summary, weekly_summary, drawdown, streak
    channel: Mapped[str] = mapped_column(String(20), default="web_push")  # web_push / telegram
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(String(1000), nullable=False)
    payload: Mapped[dict | None] = mapped_column(JSON)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
