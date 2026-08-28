from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.notification import Notification
from app.models.user import User

router = APIRouter(prefix="/notifications", tags=["notifications"])

class SubCreate(BaseModel):
    endpoint: str
    keys: dict  # p256dh, auth
    # VAPID subscription object

# In-memory subs (prod'da DB'ye yazılmalı)
subs: dict[int, list[dict]] = {}

@router.get("", response_model=list[dict])
async def list_notifications(db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    res = await db.execute(select(Notification).where(Notification.user_id==current.id).order_by(desc(Notification.sent_at)).limit(50))
    rows = res.scalars().all()
    return [{"id":r.id,"type":r.type,"channel":r.channel,"title":r.title,"body":r.body,"is_read":r.is_read,"sent_at":r.sent_at.isoformat()} for r in rows]

@router.post("/subscribe")
async def subscribe(data: SubCreate, current: User = Depends(get_current_user)):
    # store VAPID subscription for Web Push
    subs.setdefault(current.id, [])
    # avoid duplicates
    if data.endpoint not in [s["endpoint"] for s in subs[current.id]]:
        subs[current.id].append(data.model_dump())
    return {"ok": True, "count": len(subs[current.id])}

@router.post("/mark-read/{nid}")
async def mark_read(nid: int, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    res = await db.execute(select(Notification).where(Notification.id==nid, Notification.user_id==current.id))
    n = res.scalar_one_or_none()
    if n:
        n.is_read = True
        await db.commit()
    return {"ok": True}

# Internal helper for scheduler to send web push
async def send_web_push(user_id: int, title: str, body: str):
    import os
    subs_list = subs.get(user_id, [])
    if not subs_list or not os.getenv("VAPID_PRIVATE_KEY"):
        return
    try:
        from pywebpush import webpush
        vapid_priv = os.getenv("VAPID_PRIVATE_KEY")
        vapid_pub = os.getenv("VAPID_PUBLIC_KEY")
        for sub in subs_list:
            webpush(subscription_info=sub, data=json.dumps({"title":title,"body":body}), vapid_private_key=vapid_priv, vapid_claims={"sub":"mailto:trader@kocmatrix.local"})
    except Exception as e:
        print(f"[push] failed {e}")

import json
