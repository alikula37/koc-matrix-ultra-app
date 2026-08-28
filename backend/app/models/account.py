from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey
from app.core.database import Base, TimestampMixin

class Account(Base, TimestampMixin):
    __tablename__ = "accounts"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "Binance Futures", "BIST"
    base_currency: Mapped[str] = mapped_column(String(10), default="USDT")
    description: Mapped[str | None] = mapped_column(String(500))
    # relationships
    # trades = relationship("Trade", back_populates="account")
