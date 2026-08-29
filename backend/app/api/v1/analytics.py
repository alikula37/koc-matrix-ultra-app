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
    q = select(Trade).where(Trade.user_id==current.id, Trade.deleted_at.is_(None), Trade.status.in_(["CLOSED","PARTIAL","OPEN","CANCELLED"]))
    # note: basic metrics & most breakdowns use CLOSED/PARTIAL only; OPEN/CANCELLED kept for floating + direction stats
    if account_id: q = q.where(Trade.account_id==account_id)
    if date_from: q = q.where(Trade.entry_date>=date_from)
    if date_to: q = q.where(Trade.entry_date<=date_to)
    res = await db.execute(q)
    trades = res.scalars().all()
    # closed dicts for metrics
    closed_trades = [t for t in trades if t.status in ("CLOSED","PARTIAL")]
    # convert to dicts
    dicts = [
        {
            "net_pnl_r": t.net_pnl_r,
            "net_pnl_cash": t.net_pnl_cash,
            "planned_rr": t.planned_rr,
            "realized_rr": t.realized_rr,
            "symbol": t.symbol,
            "direction": t.direction,
            "emotions": t.emotions,
            "indicators_used": t.indicators_used,
            "setups": t.setups,
            "entry_date": t.entry_date,
            "account_id": t.account_id,
            "status": t.status,
        }
        for t in closed_trades
    ]
    basic = compute_basic_metrics(dicts)
    # breakdowns
    emotion_bd = breakdown_by(dicts, "emotions")
    setup_bd = breakdown_by(dicts, "setups")
    indicator_bd = breakdown_by(dicts, "indicators_used")
    # account
    account_bd = breakdown_by(dicts, "account_id")
    # time: weekday & hour — İstanbul'a normalize (prompt §3)
    from zoneinfo import ZoneInfo
    IST = ZoneInfo("Europe/Istanbul")
    for d in dicts:
        dt = d["entry_date"]
        if dt:
            # ensure timezone aware, convert to IST
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=ZoneInfo("UTC"))
            dt_ist = dt.astimezone(IST)
            # Map English weekday to Turkish for UI, but keep English key for now
            tr_weekday = {"Monday":"Pazartesi","Tuesday":"Salı","Wednesday":"Çarşamba","Thursday":"Perşembe","Friday":"Cuma","Saturday":"Cumartesi","Sunday":"Pazar"}.get(dt_ist.strftime("%A"), dt_ist.strftime("%A"))
            d["weekday"] = tr_weekday
            d["hour_bucket"] = f"{dt_ist.hour:02d}:00"
            # also keep IST date for heatmap grouping
            d["ist_date"] = dt_ist.date().isoformat()
        else:
            d["weekday"] = "Bilinmeyen"
            d["hour_bucket"] = "00:00"
    weekday_bd = breakdown_by(dicts, "weekday")
    hour_bd = breakdown_by(dicts, "hour_bucket")
    # symbol & direction breakdowns
    symbol_bd = breakdown_by(dicts, "symbol")
    direction_bd = breakdown_by(dicts, "direction")

    # equity curve (sorted by entry_date) — CLOSED/PARTIAL only
    dicts_sorted = sorted([d for d in dicts if d["entry_date"]], key=lambda x: x["entry_date"])
    equity_r = []
    cum = 0
    for d in dicts_sorted:
        cum += d["net_pnl_r"] or 0
        equity_r.append({
            "date": d["entry_date"].isoformat(),
            "equity_r": round(cum,3),
            "cash": d["net_pnl_cash"],
            "symbol": d.get("symbol"),
            "win": (d.get("net_pnl_r") or 0) > 0,
            "pnl_r": d.get("net_pnl_r") or 0,
        })

    payoff = (basic["avg_win_r"]/basic["avg_loss_r"]) if basic["avg_loss_r"] else 0
    ror = risk_of_ruin(basic["win_rate"]/100 if basic["win_rate"] else 0, payoff)

    # OPEN trades — for Unrealized / Floating equity second line (frontend computes live PnL, backend gives count)
    open_trades = [t for t in trades if t.status == "OPEN"]
    open_summary = {
        "count": len(open_trades),
        "symbols": list({t.symbol for t in open_trades}),
    }

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
            "by_symbol": symbol_bd,
            "by_direction": direction_bd,
        },
        "equity_curve": equity_r,
        "open_trades": open_summary,
    }

@router.get("/heatmap")
async def heatmap(
    year: int = Query(...),
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user)
):
    from zoneinfo import ZoneInfo
    IST = ZoneInfo("Europe/Istanbul")
    q = select(Trade).where(Trade.user_id==current.id, Trade.deleted_at.is_(None), Trade.status.in_(["CLOSED","PARTIAL"]))
    res = await db.execute(q)
    trades = res.scalars().all()
    from collections import defaultdict
    by_date = defaultdict(list)
    for t in trades:
        if not t.entry_date:
            continue
        dt = t.entry_date
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=ZoneInfo("UTC"))
        d = dt.astimezone(IST).date().isoformat()
        if str(dt.astimezone(IST).year)==str(year):
            by_date[d].append(t)
    out = []
    for d, lst in by_date.items():
        total_r = sum(x.net_pnl_r or 0 for x in lst)
        total_cash = sum(x.net_pnl_cash or 0 for x in lst)
        wins = sum(1 for x in lst if (x.net_pnl_r or 0) > 0)
        win_rate = round(wins / len(lst) * 100, 1) if lst else 0
        out.append({"date": d, "total_r": round(total_r,2), "total_cash": round(total_cash,2), "count": len(lst), "win_rate": win_rate, "avg_r": round(total_r/len(lst),3) if lst else 0})
    return sorted(out, key=lambda x: x["date"])

@router.get("/period-summary")
async def period_summary(
    period: str = Query("monthly", description="daily|weekly|monthly"),
    year: int | None = None,
    month: int | None = None,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user)
):
    """Haftalık & aylık otomatik özet kartı — PDF export için JSON"""
    from zoneinfo import ZoneInfo
    IST = ZoneInfo("Europe/Istanbul")
    import calendar
    from datetime import datetime
    now = datetime.now(IST)
    y = year or now.year
    m = month or now.month
    q = select(Trade).where(Trade.user_id==current.id, Trade.deleted_at.is_(None))
    res = await db.execute(q)
    trades = res.scalars().all()
    # filter by period
    filtered = []
    for t in trades:
        if not t.entry_date: continue
        dt = t.entry_date
        if dt.tzinfo is None: dt = dt.replace(tzinfo=ZoneInfo("UTC"))
        dt = dt.astimezone(IST)
        if period=="daily" and dt.date()==now.date():
            filtered.append(t)
        elif period=="weekly" and dt.isocalendar()[1]==now.isocalendar()[1] and dt.year==y:
            filtered.append(t)
        elif period=="monthly" and dt.year==y and dt.month==m:
            filtered.append(t)
        elif period not in ("daily","weekly","monthly"):
            filtered.append(t)
    dicts = [{"net_pnl_r":t.net_pnl_r,"net_pnl_cash":t.net_pnl_cash,"planned_rr":t.planned_rr,"realized_rr":t.realized_rr,"emotions":t.emotions,"setups":t.setups,"indicators_used":t.indicators_used,"account_id":t.account_id,"entry_date":t.entry_date} for t in filtered]
    basic = compute_basic_metrics(dicts)
    # best setup by expectancy
    from app.services.analytics import breakdown_by
    by_setup = breakdown_by(dicts, "setups")
    best_setup = max(by_setup.items(), key=lambda x: x[1]["expectancy"])[0] if by_setup else None
    return {"period":period, "year":y, "month":m, "basic":basic, "best_setup":best_setup, "by_setup":by_setup, "count":len(filtered)}
