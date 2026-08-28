from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, get_current_user
from app.models.user import User
from app.schemas.auth import UserCreate, UserOut, Token, LoginRequest

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserOut)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email==data.email, User.deleted_at.is_(None)))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email zaten kayıtlı")
    user = User(email=data.email, hashed_password=hash_password(data.password), full_name=data.full_name)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.post("/login", response_model=Token)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email==data.email, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Geçersiz kimlik")
    access = create_access_token({"sub": str(user.id), "email": user.email})
    refresh = create_refresh_token({"sub": str(user.id)})
    return Token(access_token=access, refresh_token=refresh)

@router.get("/me", response_model=UserOut)
async def me(current=Depends(get_current_user)):
    return current

@router.post("/refresh", response_model=Token)
async def refresh(refresh_token: str, db: AsyncSession = Depends(get_db)):
    from jose import jwt, JWTError
    from app.core.config import settings
    try:
        payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Geçersiz refresh")
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Geçersiz refresh")
    result = await db.execute(select(User).where(User.id==int(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Kullanıcı yok")
    access = create_access_token({"sub": str(user.id)})
    new_refresh = create_refresh_token({"sub": str(user.id)})
    return Token(access_token=access, refresh_token=new_refresh)
