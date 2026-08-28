from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.core.config import settings
from app.core.database import get_db
from app.models.draft_trade import DraftTrade
import json

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

class TVPayload(BaseModel):
    symbol: str
    signal_type: str
    price: float
    sl: float | None = None
    tp: float | None = None

@router.post("/tradingview")
async def tradingview_webhook(
    payload: TVPayload,
    db: AsyncSession = Depends(get_db),
    x_tv_secret: str | None = Header(None),
):
    if not settings.WEBHOOK_ENABLED:
        raise HTTPException(status_code=403, detail="Webhook kapalı (WEBHOOK_ENABLED=false)")
    # Basic validation
    if payload.signal_type not in ("BUY","SELL","LONG","SHORT"):
        raise HTTPException(status_code=400, detail="Geçersiz signal_type")
    draft = DraftTrade(
        symbol=payload.symbol,
        signal_type=payload.signal_type,
        price=payload.price,
        sl=payload.sl,
        tp=payload.tp,
        raw_payload=payload.model_dump(),
        source="tradingview",
    )
    db.add(draft)
    await db.commit()
    await db.refresh(draft)
    return {"ok": True, "draft_id": draft.id, "message": "Sinyal kaydedildi, draft_trades tablosunda"}
