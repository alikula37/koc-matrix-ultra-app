"""
Scheduler — daily/weekly/monthly summaries + drawdown/streak checks.
Runs as asyncio background task inside FastAPI (no separate cron container needed).
Uses zoneinfo Europe/Istanbul.
"""
import asyncio
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.trade import Trade
from app.models.notification import Notification
from app.services.analytics import compute_basic_metrics
from app.services.notifications import send_telegram
from app.api.v1.notifications import send_web_push

IST = ZoneInfo("Europe/Istanbul")

async def create_notification(db: AsyncSession, user_id: int, ntype: str, channel: str, title: str, body: str, payload: dict | None = None):
    # dedup: same type today?
    from sqlalchemy import func
    today = datetime.now(IST).date()
    # check if already sent today for daily/weekly/monthly
    res = await db.execute(select(Notification).where(Notification.user_id==user_id, Notification.type==ntype, func.date(Notification.sent_at)==today))
    if res.scalars().first() and ntype in ("daily_summary","weekly_summary","monthly_summary"):
        return
    n = Notification(user_id=user_id, type=ntype, channel=channel, title=title, body=body, payload=payload)
    db.add(n)
    await db.commit()
    # push + telegram
    try:
        await send_web_push(user_id, title, body)
    except: pass
    if channel in ("telegram","both"):
        await send_telegram(f"*{title}*\n{body}")

async def check_user(db: AsyncSession, user: User):
    # load closed trades
    res = await db.execute(select(Trade).where(Trade.user_id==user.id, Trade.deleted_at.is_(None), Trade.status.in_(["CLOSED","PARTIAL"])))
    trades = res.scalars().all()
    dicts = [{"net_pnl_r":t.net_pnl_r,"net_pnl_cash":t.net_pnl_cash,"planned_rr":t.planned_rr,"realized_rr":t.realized_rr} for t in trades]
    m = compute_basic_metrics(dicts)
    now = datetime.now(IST)
    # drawdown -5R
    if m["max_drawdown_r"] <= -5:
        await create_notification(db, user.id, "drawdown", "web_push", "Drawdown Uyarısı", f"Max DD {m['max_drawdown_r']}R — mola ver", m)
        await send_telegram(f"⚠️ Drawdown {m['max_drawdown_r']}R — {user.email}")
    # streak 3 losses
    if m["consecutive_losses"] >=3:
        await create_notification(db, user.id, "streak", "web_push", "Mola Ver", f"{m['consecutive_losses']} kayıp üst üste — planı gözden geçir", m)

    # daily summary at 23:55 IST
    # weekly Sunday 23:55, monthly last day 23:55 — handled via time check in loop
    # For scheduler invocation, we check current hour/minute
    if now.hour==23 and now.minute>=55:
        # daily
        await create_notification(db, user.id, "daily_summary", "both", f"Gün Özeti — {now.date()}", f"Bugün {m['total_trades']} işlem, WR {m['win_rate']}%, Net {m['total_r']}R / {m['total_cash']}₺", m)
        # weekly on Sunday
        if now.weekday()==6:
            await create_notification(db, user.id, "weekly_summary", "both", f"Hafta Özeti — W{now.isocalendar()[1]}", f"Hafta {m['total_r']}R, PF {m['profit_factor']}, Expectancy {m['expectancy']}R", m)
        # monthly on last day
        tomorrow = now + timedelta(days=1)
        if tomorrow.month != now.month:
            await create_notification(db, user.id, "monthly_summary", "both", f"Ay Özeti — {now.strftime('%Y-%m')}", f"Ay kapanışı: {m['total_trades']} işlem, Net {m['total_r']}R, En iyi setup analizi dashboard'da", m)

async def scheduler_loop():
    print("[scheduler] started — IST Europe/Istanbul, checks every 60s")
    while True:
        try:
            async with AsyncSessionLocal() as db:
                res = await db.execute(select(User).where(User.deleted_at.is_(None), User.is_active==True))
                users = res.scalars().all()
                for u in users:
                    try:
                        await check_user(db, u)
                    except Exception as e:
                        print(f"[scheduler] user {u.id} error {e}")
        except Exception as e:
            print(f"[scheduler] loop error {e}")
        await asyncio.sleep(60)  # check every minute

def start_scheduler(app):
    @app.on_event("startup")
    async def _start():
        asyncio.create_task(scheduler_loop())
