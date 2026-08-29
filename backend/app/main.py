"""
FastAPI main — Trading Journal & Execution Analytics Engine
OpenAPI schema sabit kalacak (frontend bağımsız).
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.api.v1.auth import router as auth_router
from app.api.v1.trades import router as trades_router, manager
from app.api.v1.analytics import router as analytics_router
from app.api.v1.webhooks import router as webhooks_router
from app.api.v1.accounts import router as accounts_router
from app.api.v1.refs import setups_router, indicators_router, emotions_router
from app.api.v1.media import router as media_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.market import router as market_router
from fastapi.staticfiles import StaticFiles
import pathlib

app = FastAPI(
    title="Koç Matrix Ultra — Trading Journal Engine",
    version="1.0.0",
    description="Trading Journal & Execution Analytics Engine — OpenAPI sabit sözleşme",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(trades_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(webhooks_router, prefix="/api/v1")
app.include_router(accounts_router, prefix="/api/v1")
app.include_router(setups_router, prefix="/api/v1/refs")
app.include_router(indicators_router, prefix="/api/v1/refs")
app.include_router(emotions_router, prefix="/api/v1/refs")
app.include_router(media_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(market_router, prefix="/api/v1")

# Scheduler — daily/weekly/monthly + drawdown/streak via IST
try:
    from app.services.scheduler import start_scheduler
    start_scheduler(app)
except Exception as e:
    print(f"[scheduler] not started: {e}")

# Serve media statically if exists (fallback)
media_path = pathlib.Path("/app/media")
if media_path.exists():
    app.mount("/media", StaticFiles(directory=str(media_path)), name="media")

@app.get("/openapi.json", include_in_schema=False)
async def export_openapi():
    return app.openapi()

# Export on startup for CI to commit openapi.json
@app.on_event("startup")
async def dump_openapi():
    try:
        import json, pathlib
        p = pathlib.Path("/app/openapi.json")
        if not p.exists():
            p.write_text(json.dumps(app.openapi(), indent=2, ensure_ascii=False))
    except Exception:
        pass

@app.get("/api/v1/health")
async def health(db: AsyncSession = Depends(get_db)):
    # DB check
    try:
        await db.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {e}"
    return {"status": "ok", "db": db_status, "webhook_enabled": settings.WEBHOOK_ENABLED}

@app.get("/")
async def root():
    return {"service": "koc-matrix-ultra", "docs": "/docs", "health": "/api/v1/health"}

# Realtime WS — bir cihazdan trade eklenince diğer cihazlarda auto update
@app.websocket("/ws/trades")
async def ws_trades(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            data = await ws.receive_text()
            # echo + broadcast (client heartbeat)
            await manager.broadcast({"event": "ping", "data": data})
    except WebSocketDisconnect:
        manager.disconnect(ws)
