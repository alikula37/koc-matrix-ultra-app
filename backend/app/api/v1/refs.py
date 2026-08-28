"""
CRUD for setups / indicators / emotions — user-scoped reference tables.
Prompt: hardcoded enum değil, kullanıcı zamanla yeni ekleyebilmeli.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.setup import Setup, Indicator, Emotion
from app.models.user import User

router = APIRouter(prefix="/refs", tags=["refs"])

class RefCreate(BaseModel):
    name: str
    description: str | None = None

class RefOut(RefCreate):
    id: int
    class Config:
        from_attributes = True

# Generic factory
def make_crud(model, prefix: str):
    r = APIRouter(prefix=prefix, tags=[prefix.strip("/")])

    @r.get("", response_model=list[RefOut])
    async def list_refs(db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
        res = await db.execute(select(model).where(model.user_id==current.id, model.deleted_at.is_(None)).order_by(model.name))
        return res.scalars().all()

    @r.post("", response_model=RefOut, status_code=201)
    async def create_ref(data: RefCreate, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
        # unique per user
        ex = await db.execute(select(model).where(model.user_id==current.id, model.name==data.name, model.deleted_at.is_(None)))
        if ex.scalar_one_or_none():
            raise HTTPException(400, f"{data.name} zaten var")
        obj = model(user_id=current.id, **data.model_dump())
        db.add(obj)
        await db.commit()
        await db.refresh(obj)
        return obj

    @r.put("/{item_id}", response_model=RefOut)
    async def update_ref(item_id: int, data: RefCreate, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
        res = await db.execute(select(model).where(model.id==item_id, model.user_id==current.id, model.deleted_at.is_(None)))
        obj = res.scalar_one_or_none()
        if not obj:
            raise HTTPException(404, "Bulunamadı")
        for k,v in data.model_dump().items():
            setattr(obj, k, v)
        await db.commit()
        await db.refresh(obj)
        return obj

    @r.delete("/{item_id}")
    async def delete_ref(item_id: int, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
        from datetime import datetime
        res = await db.execute(select(model).where(model.id==item_id, model.user_id==current.id, model.deleted_at.is_(None)))
        obj = res.scalar_one_or_none()
        if not obj:
            raise HTTPException(404, "Bulunamadı")
        obj.deleted_at = datetime.utcnow()
        await db.commit()
        return {"ok": True}
    return r

# mount three sub-routers
setups_router = make_crud(Setup, "/setups")
indicators_router = make_crud(Indicator, "/indicators")
emotions_router = make_crud(Emotion, "/emotions")

# For inclusion via single router, we expose them separately in main.py
