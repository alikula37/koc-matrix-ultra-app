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
