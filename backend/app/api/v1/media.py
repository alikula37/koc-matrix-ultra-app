"""
Media upload — chart snapshots (giriş/çıkış grafiği ayrı ayrı)
Stores to ./media (docker volume backend_media) and returns path.
Soft, production-grade: validates image mime, size 10MB limit.
"""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
import shutil, os, uuid, pathlib
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/media", tags=["media"])
# Docker path /app/media may not exist when running locally (no /app perms) — fallback gracefully
try:
    MEDIA_ROOT = pathlib.Path("/app/media")
    MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
    if not MEDIA_ROOT.exists():
        raise OSError
except (PermissionError, OSError):
    MEDIA_ROOT = pathlib.Path(__file__).resolve().parents[3] / "media"
    MEDIA_ROOT.mkdir(parents=True, exist_ok=True)

ALLOWED = {"image/png","image/jpeg","image/jpg","image/webp","image/gif"}
MAX = 10*1024*1024

@router.post("/upload")
async def upload_chart(
    file: UploadFile = File(...),
    current: User = Depends(get_current_user)
):
    if file.content_type not in ALLOWED:
        raise HTTPException(400, f"Desteklenmeyen tip: {file.content_type}")
    data = await file.read()
    if len(data) > MAX:
        raise HTTPException(400, "Dosya 10MB'dan büyük")
    ext = pathlib.Path(file.filename or "image.png").suffix or ".png"
    # user-scoped subfolder
    user_dir = MEDIA_ROOT / str(current.id)
    user_dir.mkdir(exist_ok=True)
    fname = f"{uuid.uuid4().hex}{ext}"
    p = user_dir / fname
    p.write_bytes(data)
    # return relative path for trade.chart_snapshot_paths
    rel = f"/api/v1/media/file/{current.id}/{fname}"
    return {"path": rel, "filename": fname, "size": len(data), "content_type": file.content_type}

@router.get("/file/{user_id}/{filename}")
async def get_file(user_id: int, filename: str, current: User = Depends(get_current_user)):
    # user can only access own files (or admin later)
    if current.id != user_id:
        raise HTTPException(403, "Yetkisiz")
    p = MEDIA_ROOT / str(user_id) / filename
    if not p.exists():
        raise HTTPException(404, "Dosya yok")
    return FileResponse(str(p))
