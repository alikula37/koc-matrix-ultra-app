"""
Seed — 10+ farklı senaryo: kısmi çıkış, çoklu emotion, farklı indikatör, farklı hesap
Usage: docker compose exec backend python seed.py
Or locally: DATABASE_URL=... python seed.py
"""
import asyncio, os, random
from datetime import datetime, timedelta, timezone
from sqlalchemy import select

# setup path
import sys
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import AsyncSessionLocal, engine, Base
from app.core.security import hash_password
from app.models.user import User
from app.models.account import Account
from app.models.trade import Trade
from app.models.trade_exit import TradeExit
from app.models.setup import Setup, Indicator, Emotion

IST = timezone(timedelta(hours=3))

async def seed():
    async with AsyncSessionLocal() as db:
        # create tables if not exist (alembic should do, but fallback)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        # user
        result = await db.execute(select(User).where(User.email=="trader@kocmatrix.local"))
        user = result.scalar_one_or_none()
        if not user:
            user = User(email="trader@kocmatrix.local", hashed_password=hash_password("KocMatrix2025!"), full_name="Koç Trader")
            db.add(user)
            await db.commit()
            await db.refresh(user)
            print(f"user {user.email} id={user.id}")
        else:
            print(f"user exists id={user.id}")

        # accounts
        for name, cur in [("Binance Futures","USDT"), ("BIST","TRY")]:
            r = await db.execute(select(Account).where(Account.user_id==user.id, Account.name==name))
            if not r.scalar_one_or_none():
                db.add(Account(user_id=user.id, name=name, base_currency=cur))
        await db.commit()
        accs = (await db.execute(select(Account).where(Account.user_id==user.id))).scalars().all()
        acc_map = {a.name: a for a in accs}
        print(f"accounts: {[a.name for a in accs]}")

        # reference tables
        for model, vals in [
            (Setup, ["Breakout","Pullback","Fakeout","Trend Devam"]),
            (Indicator, ["RSI","MACD","EMA","Volume","Matrix Score"]),
            (Emotion, ["FOMO","Disiplinli","Korku","Açgözlülük","Nötr","Sabırlı"]),
        ]:
            for v in vals:
                r = await db.execute(select(model).where(model.user_id==user.id, model.name==v))
                if not r.scalar_one_or_none():
                    db.add(model(user_id=user.id, name=v))
        await db.commit()

        # trades — 12 senaryo
        scenarios = [
            # symbol, dir, entry, sl, tp1, tp2, size, acc, emotions, indicators, setups, partial exits?
            ("BTCUSDT","LONG",67000,66000,69000,70000,0.1,"Binance Futures",["Disiplinli"],["RSI","EMA"],["Breakout"], True),
            ("ETHUSDT","SHORT",3500,3600,3300,None,2,"Binance Futures",["FOMO"],["MACD"],["Fakeout"], False),
            ("SOLUSDT","LONG",140,135,150,155,10,"Binance Futures",["Sabırlı"],["Volume","Matrix Score"],["Trend Devam"], True),
            ("XU100","LONG",9800,9700,10000,None,100,"BIST",["Nötr"],["RSI"],["Pullback"], False),
            ("THYAO","SHORT",312,318,300,295,200,"BIST",["Korku"],["EMA"],["Fakeout"], True),
            ("GARAN","LONG",128,125,135,None,500,"BIST",["Disiplinli"],["MACD","RSI"],["Breakout"], False),
            ("AKBNK","LONG",62,60,65,67,1000,"BIST",["Açgözlülük"],["Volume"],["Trend Devam"], True),
            ("SASA","SHORT",42,44,38,None,1000,"BIST",["FOMO"],["RSI"],["Fakeout"], False),
            ("BTCUSDT","SHORT",68500,69500,67000,None,0.05,"Binance Futures",["Disiplinli"],["Matrix Score"],["Pullback"], False),
            ("ETHUSDT","LONG",3400,3350,3550,3600,1.5,"Binance Futures",["Sabırlı","Disiplinli"],["EMA","MACD"],["Breakout"], True),
            ("SOLUSDT","SHORT",145,148,138,None,8,"Binance Futures",["Korku"],["RSI"],["Fakeout"], False),
            ("XU100","SHORT",9900,10000,9700,None,50,"BIST",["Nötr"],["Volume"],["Trend Devam"], False),
        ]
        # clear old trades for idempotent seed? keep soft delete, check existing trade_no
        existing = (await db.execute(select(Trade).where(Trade.user_id==user.id))).scalars().all()
        if len(existing) >= 10:
            print(f"already {len(existing)} trades, skipping seed (delete to reseed)")
            return

        for i, (sym, direction, entry, sl, tp1, tp2, size, acc_name, emos, inds, setups, partial) in enumerate(scenarios):
            acc = acc_map[acc_name]
            entry_date = datetime.now(IST) - timedelta(days=random.randint(0,30), hours=random.randint(0,23))
            trade_no = f"TRD-{entry_date.year}-{(len(existing)+i+1):04d}"
            planned_rr = abs(tp1 - entry)/abs(entry - sl) if sl and tp1 else None
            trade = Trade(
                trade_no=trade_no, user_id=user.id, account_id=acc.id,
                entry_date=entry_date, symbol=sym, direction=direction,
                entry_price=entry, stop_loss=sl, take_profit_1=tp1, take_profit_2=tp2,
                position_size=size, account_risk_percent=1.0, leverage=5 if acc_name=="Binance Futures" else None,
                commission_fees=random.uniform(1,10),
                status="OPEN",
                emotions=emos, indicators_used=inds, setups=setups,
                execution_quality_score=random.randint(5,9),
                trade_setup_notes=f"Seed #{i+1} — {sym} {direction} test senaryosu. Risk {planned_rr:.2f}R" if planned_rr else "Seed",
                planned_rr=round(planned_rr,2) if planned_rr else None,
            )
            db.add(trade)
            await db.flush()  # get id
            # add exits for some
            if partial:
                # two partial exits
                qty1 = size * 0.5
                qty2 = size * 0.5
                # exit1 TP1
                price1 = tp1 if tp1 else entry + (10 if direction=="LONG" else -10)
                exit1 = TradeExit(trade_id=trade.id, exit_price=price1, exit_quantity=qty1, exit_time=entry_date+timedelta(hours=5), exit_reason="TP1")
                # pnl
                pnl1 = (price1 - entry)*qty1 if direction=="LONG" else (entry - price1)*qty1
                risk_per_unit = abs(entry - sl) if sl else entry*0.02
                exit1.pnl_cash = round(pnl1,2)
                exit1.pnl_r = round(pnl1/(risk_per_unit*size),3) if risk_per_unit else 0
                db.add(exit1)
                # exit2 manual or TP2
                price2 = tp2 if tp2 else price1 + (5 if direction=="LONG" else -5)
                exit2 = TradeExit(trade_id=trade.id, exit_price=price2, exit_quantity=qty2, exit_time=entry_date+timedelta(hours=12), exit_reason="TP2" if tp2 else "Manual")
                pnl2 = (price2 - entry)*qty2 if direction=="LONG" else (entry - price2)*qty2
                exit2.pnl_cash = round(pnl2,2)
                exit2.pnl_r = round(pnl2/(risk_per_unit*size),3) if risk_per_unit else 0
                db.add(exit2)
                # aggregate
                trade.net_pnl_cash = round((exit1.pnl_cash or 0)+(exit2.pnl_cash or 0) - trade.commission_fees,2)
                trade.net_pnl_r = round((exit1.pnl_r or 0)+(exit2.pnl_r or 0),3)
                trade.realized_rr = trade.net_pnl_r
                trade.status = "CLOSED"
                trade.exit_date = exit2.exit_time
            else:
                # single exit 50% win / 50% loss pattern
                win = i % 2 == 0
                qty = size
                exit_price = tp1 if win and tp1 else sl if sl else entry*0.98
                reason = "TP1" if win else "SL"
                pnl_cash = (exit_price - entry)*qty if direction=="LONG" else (entry - exit_price)*qty
                pnl_cash -= trade.commission_fees
                risk_per_unit = abs(entry - sl) if sl else entry*0.02
                pnl_r = pnl_cash/(risk_per_unit*size) if risk_per_unit else 0
                ex = TradeExit(trade_id=trade.id, exit_price=exit_price, exit_quantity=qty, exit_time=entry_date+timedelta(hours=8), exit_reason=reason, pnl_cash=round(pnl_cash,2), pnl_r=round(pnl_r,3))
                db.add(ex)
                trade.net_pnl_cash = round(pnl_cash,2)
                trade.net_pnl_r = round(pnl_r,3)
                trade.realized_rr = round(pnl_r,2)
                trade.status = "CLOSED"
                trade.exit_date = ex.exit_time
        await db.commit()
        print("seed done — 12 trades with exits, emotions, indicators, multi-account")

if __name__ == "__main__":
    asyncio.run(seed())
