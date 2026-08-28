"""
Trades CRUD + exits + edit history + soft delete
WS broadcast on create/update via in-memory manager (replaced by Redis in prod).
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from datetime import datetime
import json

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.trade import Trade
from app.models.trade_exit import TradeExit
from app.models.trade_edit_history import TradeEditHistory
from app.schemas.trade import TradeCreate, TradeOut, TradeExitCreate, TradeExitOut
from app.models.user import User

router = APIRouter(prefix="/trades", tags=["trades"])

# Simple WS manager (in-memory)
class WSManager:
    def __init__(self):
        self.connections: list = []
    async def connect(self, ws):
        await ws.accept()
        self.connections.append(ws)
    def disconnect(self, ws):
        if ws in self.connections:
            self.connections.remove(ws)
    async def broadcast(self, data: dict):
        for ws in self.connections[:]:
            try:
                await ws.send_json(data)
            except:
                self.disconnect(ws)

manager = WSManager()

def calc_planned_rr(entry: float, sl: float | None, tp1: float | None, direction: str) -> float | None:
    if not sl or not tp1: return None
    risk = abs(entry - sl)
    reward = abs(tp1 - entry)
    return round(reward/risk, 2) if risk else None

def calc_pnl(entry: float, exit_price: float, size: float, direction: str, leverage: float | None) -> tuple[float, float]:
    # cash pnl, r pnl (approx)
    pnl_cash = (exit_price - entry) * size if direction=="LONG" else (entry - exit_price) * size
    # leverage adjusted? margin_used = size*entry/leverage
    return pnl_cash, 0  # R will be computed after we know risk per trade

@router.get("", response_model=list[TradeOut])
async def list_trades(
    account_id: int | None = None,
    status: str | None = None,
    symbol: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user)
):
    q = select(Trade).where(Trade.user_id==current.id, Trade.deleted_at.is_(None)).options(selectinload(Trade.exits)).order_by(Trade.entry_date.desc())
    if account_id: q = q.where(Trade.account_id==account_id)
    if status: q = q.where(Trade.status==status)
    if symbol: q = q.where(Trade.symbol==symbol)
    if date_from: q = q.where(Trade.entry_date>=date_from)
    if date_to: q = q.where(Trade.entry_date<=date_to)
    res = await db.execute(q)
    return res.scalars().all()

@router.post("", response_model=TradeOut, status_code=201)
async def create_trade(data: TradeCreate, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    # generate trade_no if not provided
    if not data.trade_no:
        cnt = await db.execute(select(func.count()).select_from(Trade).where(Trade.user_id==current.id))
        n = (cnt.scalar() or 0) + 1
        data.trade_no = f"TRD-{datetime.now().year}-{n:04d}"
    planned_rr = calc_planned_rr(data.entry_price, data.stop_loss, data.take_profit_1, data.direction)
    trade = Trade(**data.model_dump(), user_id=current.id, planned_rr=planned_rr)
    # net_pnl initial 0
    db.add(trade)
    await db.commit()
    await db.refresh(trade)
    await manager.broadcast({"event": "trade_created", "trade_id": trade.id})
    # need to reload with exits
    res = await db.execute(select(Trade).where(Trade.id==trade.id).options(selectinload(Trade.exits)))
    return res.scalar_one()

@router.get("/{trade_id}", response_model=TradeOut)
async def get_trade(trade_id: int, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    res = await db.execute(select(Trade).where(Trade.id==trade_id, Trade.user_id==current.id, Trade.deleted_at.is_(None)).options(selectinload(Trade.exits)))
    trade = res.scalar_one_or_none()
    if not trade: raise HTTPException(404, "Trade yok")
    return trade

@router.put("/{trade_id}", response_model=TradeOut)
async def update_trade(trade_id: int, data: TradeCreate, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    res = await db.execute(select(Trade).where(Trade.id==trade_id, Trade.user_id==current.id, Trade.deleted_at.is_(None)).options(selectinload(Trade.exits)))
    trade = res.scalar_one_or_none()
    if not trade: raise HTTPException(404, "Trade yok")
    old = {c.name: getattr(trade, c.name) for c in trade.__table__.columns}
    # diff
    for k, v in data.model_dump().items():
        setattr(trade, k, v)
    trade.planned_rr = calc_planned_rr(trade.entry_price, trade.stop_loss, trade.take_profit_1, trade.direction)
    # history
    new = {c.name: getattr(trade, c.name) for c in trade.__table__.columns}
    diff = {k: {"old": str(old.get(k)), "new": str(new.get(k))} for k in new if old.get(k) != new.get(k)}
    hist = TradeEditHistory(trade_id=trade.id, edited_by=current.id, old_data=json.loads(json.dumps(old, default=str)), new_data=json.loads(json.dumps(new, default=str)), diff=diff)
    db.add(hist)
    await db.commit()
    await db.refresh(trade)
    await manager.broadcast({"event": "trade_updated", "trade_id": trade.id})
    return trade

@router.delete("/{trade_id}")
async def delete_trade(trade_id: int, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    res = await db.execute(select(Trade).where(Trade.id==trade_id, Trade.user_id==current.id, Trade.deleted_at.is_(None)))
    trade = res.scalar_one_or_none()
    if not trade: raise HTTPException(404, "Trade yok")
    trade.deleted_at = datetime.utcnow()
    await db.commit()
    await manager.broadcast({"event": "trade_deleted", "trade_id": trade_id})
    return {"ok": True}

# Exits sub-resource
@router.post("/{trade_id}/exits", response_model=TradeExitOut)
async def add_exit(trade_id: int, data: TradeExitCreate, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    res = await db.execute(select(Trade).where(Trade.id==trade_id, Trade.user_id==current.id, Trade.deleted_at.is_(None)).options(selectinload(Trade.exits)))
    trade = res.scalar_one_or_none()
    if not trade: raise HTTPException(404, "Trade yok")
    # calculate pnl per exit
    pnl_cash = (data.exit_price - trade.entry_price) * data.exit_quantity if trade.direction=="LONG" else (trade.entry_price - data.exit_price) * data.exit_quantity
    pnl_cash -= trade.commission_fees  # distribute? simplified deduct full each exit first -> later aggregate will be sum
    # R: risk per unit = |entry - sl|
    risk_per_unit = abs(trade.entry_price - trade.stop_loss) if trade.stop_loss else trade.entry_price * 0.02  # fallback 2%
    pnl_r = pnl_cash / (risk_per_unit * trade.position_size) if risk_per_unit else 0
    exit_row = TradeExit(trade_id=trade_id, **data.model_dump(), pnl_cash=round(pnl_cash,2), pnl_r=round(pnl_r,3))
    db.add(exit_row)
    # update trade aggregates: sum of exits
    # flush to get ids
    await db.flush()
    # aggregate
    res2 = await db.execute(select(TradeExit).where(TradeExit.trade_id==trade_id))
    exits = res2.scalars().all()
    total_cash = sum(e.pnl_cash or 0 for e in exits)
    total_r = sum(e.pnl_r or 0 for e in exits)
    # if fully exited -> CLOSED else PARTIAL
    total_qty = sum(e.exit_quantity for e in exits)
    if total_qty >= trade.position_size:
        trade.status = "CLOSED"
        trade.exit_date = data.exit_time
    else:
        trade.status = "PARTIAL"
    trade.net_pnl_cash = round(total_cash,2)
    trade.net_pnl_r = round(total_r,3)
    # realized RR = total_r (if risk 1R)
    trade.realized_rr = round(total_r,2)
    await db.commit()
    await db.refresh(exit_row)
    await manager.broadcast({"event": "trade_exit", "trade_id": trade_id, "exit_id": exit_row.id})
    return exit_row

@router.get("/{trade_id}/history")
async def get_history(trade_id: int, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    # verify trade belongs to user
    res = await db.execute(select(Trade).where(Trade.id==trade_id, Trade.user_id==current.id))
    if not res.scalar_one_or_none(): raise HTTPException(404, "Trade yok")
    res = await db.execute(select(TradeEditHistory).where(TradeEditHistory.trade_id==trade_id).order_by(TradeEditHistory.created_at.desc()))
    return res.scalars().all()

# Calendar heatmap aggregation endpoint is in analytics, but also quick by-trades
@router.get("/calendar/summary")
async def calendar_summary(
    year: int = Query(2025), month: int | None = None,
    db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)
):
    # returns dict date -> total R/cash
    from sqlalchemy import func, cast, Date
    # we group by entry_date::date, sum net_pnl
    # Using raw query for simplicity
    q = select(func.date(Trade.entry_date).label("d"), func.sum(Trade.net_pnl_r).label("total_r"), func.sum(Trade.net_pnl_cash).label("total_cash"), func.count().label("cnt")).where(Trade.user_id==current.id, Trade.deleted_at.is_(None), func.extract("year", Trade.entry_date)==year)
    if month:
        q = q.where(func.extract("month", Trade.entry_date)==month)
    q = q.group_by(func.date(Trade.entry_date))
    res = await db.execute(q)
    rows = res.all()
    return [{"date": str(r.d), "total_r": float(r.total_r or 0), "total_cash": float(r.total_cash or 0), "count": r.cnt} for r in rows]
