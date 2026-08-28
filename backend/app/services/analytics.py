"""
Analytics Engine — tüm hesaplamalar R ve cash paralel.
- Win Rate, Profit Factor, Expectancy, Sharpe, Sortino, Max Drawdown, Streak, Risk of Ruin
- Duygu/setup/indikator/zaman/account kırılımları
"""
import math
from typing import List, Dict, Any
import numpy as np

def compute_basic_metrics(trades: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    trades: list of dict with keys net_pnl_r, net_pnl_cash, ... (closed trades)
    """
    if not trades:
        return {
            "total_trades": 0,
            "win_count": 0, "loss_count": 0, "win_rate": 0,
            "profit_factor": 0, "expectancy": 0, "total_r": 0, "total_cash": 0,
            "avg_rr": 0, "sharpe": 0, "sortino": 0, "max_drawdown_r": 0, "max_drawdown_cash": 0,
            "consecutive_wins": 0, "consecutive_losses": 0,
        }
    pnls_r = [t["net_pnl_r"] or 0 for t in trades]
    pnls_cash = [t["net_pnl_cash"] or 0 for t in trades]
    wins = [p for p in pnls_r if p > 0]
    losses = [p for p in pnls_r if p <= 0]
    win_rate = len(wins) / len(pnls_r) * 100 if pnls_r else 0
    gross_profit = sum(wins) if wins else 0
    gross_loss = abs(sum(losses)) if losses else 0
    profit_factor = gross_profit / gross_loss if gross_loss != 0 else float("inf") if gross_profit>0 else 0
    avg_win = sum(wins)/len(wins) if wins else 0
    avg_loss = abs(sum(losses)/len(losses)) if losses else 0
    expectancy = (win_rate/100 * avg_win) - ((1-win_rate/100)*avg_loss)

    # Sharpe & Sortino (R returns)
    returns = np.array(pnls_r, dtype=float)
    sharpe = float(returns.mean() / returns.std(ddof=1) * math.sqrt(252)) if returns.std(ddof=1) !=0 else 0
    downside = returns[returns<0]
    sortino = float(returns.mean() / downside.std(ddof=1) * math.sqrt(252)) if downside.size>1 and downside.std(ddof=1)!=0 else 0

    # Max Drawdown
    equity = np.cumsum(returns)
    peak = np.maximum.accumulate(equity)
    dd = equity - peak
    max_dd_r = float(dd.min()) if dd.size else 0
    # cash DD
    equity_cash = np.cumsum(np.array(pnls_cash, dtype=float))
    peak_cash = np.maximum.accumulate(equity_cash)
    dd_cash = equity_cash - peak_cash
    max_dd_cash = float(dd_cash.min()) if dd_cash.size else 0

    # Streaks
    max_win_streak = max_loss_streak = cur_w = cur_l = 0
    for p in pnls_r:
        if p>0:
            cur_w+=1; cur_l=0
            max_win_streak=max(max_win_streak,cur_w)
        else:
            cur_l+=1; cur_w=0
            max_loss_streak=max(max_loss_streak,cur_l)

    # Realized vs Planned RR sapma
    planned = [t.get("planned_rr") for t in trades if t.get("planned_rr") is not None]
    realized = [t.get("realized_rr") for t in trades if t.get("realized_rr") is not None]
    rr_dev = float(np.mean([abs(r-p) for r,p in zip(realized, planned)])) if planned and realized else 0

    return {
        "total_trades": len(trades),
        "win_count": len(wins),
        "loss_count": len(losses),
        "win_rate": round(win_rate,2),
        "profit_factor": round(profit_factor,2) if profit_factor!=float("inf") else 999,
        "expectancy": round(expectancy,3),
        "total_r": round(sum(pnls_r),3),
        "total_cash": round(sum(pnls_cash),2),
        "avg_win_r": round(avg_win,3),
        "avg_loss_r": round(avg_loss,3),
        "avg_rr": round((avg_win/avg_loss if avg_loss else 0),2),
        "sharpe": round(sharpe,3),
        "sortino": round(sortino,3),
        "max_drawdown_r": round(max_dd_r,3),
        "max_drawdown_cash": round(max_dd_cash,2),
        "consecutive_wins": max_win_streak,
        "consecutive_losses": max_loss_streak,
        "rr_deviation": round(rr_dev,3),
    }

def breakdown_by(trades: List[Dict], key: str) -> Dict[str, Any]:
    """Duygu/setup/indicator/account/time gibi key'e göre gruplayıp expectancy kırılımı."""
    from collections import defaultdict
    groups: Dict[str, List[Dict]] = defaultdict(list)
    for t in trades:
        vals = t.get(key)
        if isinstance(vals, list):
            for v in vals:
                groups[v].append(t)
        elif vals:
            groups[str(vals)].append(t)
        else:
            groups["Bilinmeyen"].append(t)
    result = {}
    for k, group in groups.items():
        m = compute_basic_metrics(group)
        result[k] = {"count": len(group), "win_rate": m["win_rate"], "expectancy": m["expectancy"], "total_r": m["total_r"], "profit_factor": m["profit_factor"]}
    return result

def risk_of_ruin(win_rate: float, payoff_ratio: float, risk_per_trade: float = 0.01) -> float:
    """
    Basit Risk of Ruin (Kim's approx). 0-1 arası.
    """
    if payoff_ratio <=0 or win_rate in (0,1):
        return 1.0 if win_rate<0.5 else 0.0
    q = 1-win_rate
    p = win_rate
    # edge
    if p*payoff_ratio <= q:
        return 1.0
    # Kelly fraction / RoR approx: ((1 - edge)/(1+edge))^(capital/risk)
    edge = p - q/payoff_ratio
    # Simplified: RoR ~ exp(-2*edge*capital / risk)
    # capital/risk ~ 100 (1% risk)
    ror = math.exp(-2 * edge * (1/risk_per_trade))
    return max(0.0, min(1.0, ror))
