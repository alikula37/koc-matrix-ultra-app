from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.trade import Trade
from app.models.user import User
from app.services.analytics import compute_basic_metrics, breakdown_by, risk_of_ruin

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/summary")
async def summary(
    account_id: int | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user)
):
    q = select(Trade).where(Trade.user_id==current.id, Trade.deleted_at.is_(None), Trade.status.in_(["CLOSED","PARTIAL"]))
    if account_id: q = q.where(Trade.account_id==account_id)
    if date_from: q = q.where(Trade.entry_date>=date_from)
    if date_to: q = q.where(Trade.entry_date<=date_to)
    res = await db.execute(q)
    trades = res.scalars().all()
    # convert to dicts
    dicts = [
        {
            "net_pnl_r": t.net_pnl_r,
            "net_pnl_cash": t.net_pnl_cash,
            "planned_rr": t.planned_rr,
            "realized_rr": t.realized_rr,
            "symbol": t.symbol,
            "emotions": t.emotions,
            "indicators_used": t.indicators_used,
            "setups": t.setups,
            "entry_date": t.entry_date,
            "account_id": t.account_id,
        }
        for t in trades
    ]
    basic = compute_basic_metrics(dicts)
    # breakdowns
    emotion_bd = breakdown_by(dicts, "emotions")
    setup_bd = breakdown_by(dicts, "setups")
    indicator_bd = breakdown_by(dicts, "indicators_used")
    # account
    account_bd = breakdown_by(dicts, "account_id")
    # time: weekday
    for d in dicts:
        d["weekday"] = d["entry_date"].strftime("%A") if d["entry_date"] else "Bilinmeyen"
        # hour bucket Istanbul (trade dates are already Istanbul)
        d["hour_bucket"] = f"{d['entry_date'].hour:02d}:00" if d["entry_date"] else "00:00"
    weekday_bd = breakdown_by(dicts, "weekday")
    hour_bd = breakdown_by(dicts, "hour_bucket")

    # equity curve (sorted by entry_date)
    dicts_sorted = sorted([d for d in dicts if d["entry_date"]], key=lambda x: x["entry_date"])
    equity_r = []
    cum = 0
    for d in dicts_sorted:
        cum += d["net_pnl_r"] or 0
        equity_r.append({"date": d["entry_date"].isoformat(), "equity_r": round(cum,3), "cash": d["net_pnl_cash"]})

    payoff = (basic["avg_win_r"]/basic["avg_loss_r"]) if basic["avg_loss_r"] else 0
    ror = risk_of_ruin(basic["win_rate"]/100 if basic["win_rate"] else 0, payoff)

    return {
        "basic": basic,
        "risk_of_ruin": round(ror,4),
        "breakdown": {
            "by_emotion": emotion_bd,
            "by_setup": setup_bd,
            "by_indicator": indicator_bd,
            "by_account": account_bd,
            "by_weekday": weekday_bd,
            "by_hour": hour_bd,
        },
        "equity_curve": equity_r,
    }

@router.get("/heatmap")
async def heatmap(
    year: int = Query(...),
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user)
):
    q = select(Trade).where(Trade.user_id==current.id, Trade.deleted_at.is_(None))
    res = await db.execute(q)
    trades = res.scalars().all()
    # group by date
    from collections import defaultdict
    by_date = defaultdict(list)
    for t in trades:
        d = t.entry_date.date().isoformat() if t.entry_date else None
        if d and str(t.entry_date.year)==str(year):
            by_date[d].append(t)
    out = []
    for d, lst in by_date.items():
        total_r = sum(x.net_pnl_r or 0 for x in lst)
        total_cash = sum(x.net_pnl_cash or 0 for x in lst)
        out.append({"date": d, "total_r": round(total_r,2), "total_cash": round(total_cash,2), "count": len(lst)})
    return sorted(out, key=lambda x: x["date"])
