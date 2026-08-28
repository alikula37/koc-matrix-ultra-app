from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.account import Account
from app.models.user import User

router = APIRouter(prefix="/accounts", tags=["accounts"])

class AccountCreate(BaseModel):
    name: str
    base_currency: str = "USDT"
    description: str | None = None

class AccountOut(AccountCreate):
    id: int
    user_id: int
    class Config:
        from_attributes = True

@router.get("", response_model=list[AccountOut])
async def list_accounts(db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    res = await db.execute(select(Account).where(Account.user_id==current.id, Account.deleted_at.is_(None)))
    return res.scalars().all()

@router.post("", response_model=AccountOut, status_code=201)
async def create_account(data: AccountCreate, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    acc = Account(**data.model_dump(), user_id=current.id)
    db.add(acc)
    await db.commit()
    await db.refresh(acc)
    return acc

@router.put("/{account_id}", response_model=AccountOut)
async def update_account(account_id: int, data: AccountCreate, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    res = await db.execute(select(Account).where(Account.id==account_id, Account.user_id==current.id, Account.deleted_at.is_(None)))
    acc = res.scalar_one_or_none()
    if not acc: raise HTTPException(404, "Hesap yok")
    for k,v in data.model_dump().items():
        setattr(acc, k, v)
    await db.commit()
    await db.refresh(acc)
    return acc

@router.delete("/{account_id}")
async def delete_account(account_id: int, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    from datetime import datetime
    res = await db.execute(select(Account).where(Account.id==account_id, Account.user_id==current.id, Account.deleted_at.is_(None)))
    acc = res.scalar_one_or_none()
    if not acc: raise HTTPException(404, "Hesap yok")
    acc.deleted_at = datetime.utcnow()
    await db.commit()
    return {"ok": True}
