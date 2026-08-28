import pytest
from app.services.analytics import compute_basic_metrics, breakdown_by, risk_of_ruin

def test_basic_win_rate_profit_factor():
    trades = [
        {"net_pnl_r": 2.0, "net_pnl_cash": 200, "planned_rr": 2, "realized_rr": 2},
        {"net_pnl_r": 1.5, "net_pnl_cash": 150, "planned_rr": 2, "realized_rr": 1.5},
        {"net_pnl_r": -1.0, "net_pnl_cash": -100, "planned_rr": 2, "realized_rr": -1},
        {"net_pnl_r": -0.5, "net_pnl_cash": -50, "planned_rr": 2, "realized_rr": -0.5},
    ]
    m = compute_basic_metrics(trades)
    assert m["total_trades"]==4
    assert m["win_rate"]==50.0
    assert m["profit_factor"]== pytest.approx((3.5/1.5), rel=0.01)
    assert m["total_r"]== pytest.approx(2.0)
    assert m["consecutive_wins"]==2

def test_sharpe_sortino_max_dd():
    trades = [{"net_pnl_r": r, "net_pnl_cash": r*100, "planned_rr":2, "realized_rr":r} for r in [1, -0.5, 2, -1, 1.5, -0.3]]
    m = compute_basic_metrics(trades)
    assert "sharpe" in m
    assert "sortino" in m
    assert m["max_drawdown_r"] <=0

def test_partial_exit_pnl_aggregation():
    # Simüle: tek trade'in 2 kısmi çıkışı
    # Entry 100, SL 95 (risk 5), TP1 110
    # Exit1: 50% @108, Exit2: 50% @112
    # PnL hesapları service içinde trade_exits tablosundan aggregate ediliyor, burada sadece metric test
    trades = [
        {"net_pnl_r": 1.6, "net_pnl_cash": 800, "planned_rr":2, "realized_rr":1.6},
        {"net_pnl_r": -1.0, "net_pnl_cash": -500, "planned_rr":2, "realized_rr":-1},
    ]
    m = compute_basic_metrics(trades)
    assert m["expectancy"] !=0

def test_breakdown_by_emotion():
    trades = [
        {"net_pnl_r": 2, "net_pnl_cash":200, "emotions":["FOMO"], "setups":["Breakout"], "indicators_used":["RSI"], "weekday":"Monday", "account_id":1, "entry_date": None, "planned_rr":2, "realized_rr":2},
        {"net_pnl_r": -1, "net_pnl_cash":-100, "emotions":["FOMO"], "setups":["Breakout"], "indicators_used":["RSI"], "weekday":"Monday", "account_id":1, "entry_date": None, "planned_rr":2, "realized_rr":-1},
        {"net_pnl_r": 1.5, "net_pnl_cash":150, "emotions":["Disiplinli"], "setups":["Pullback"], "indicators_used":["EMA"], "weekday":"Tuesday", "account_id":2, "entry_date": None, "planned_rr":2, "realized_rr":1.5},
    ]
    bd = breakdown_by(trades, "emotions")
    assert "FOMO" in bd
    assert bd["FOMO"]["count"]==2
    assert bd["Disiplinli"]["win_rate"]==100.0

def test_risk_of_ruin():
    ror = risk_of_ruin(0.55, 1.5, 0.01)
    assert 0 <= ror <= 1
    ror_bad = risk_of_ruin(0.4, 1.0, 0.02)
    assert ror_bad > ror  # lower edge -> higher ruin

def test_empty():
    m = compute_basic_metrics([])
    assert m["total_trades"]==0
    assert m["win_rate"]==0

def test_multi_account_equity():
    trades = [
        {"net_pnl_r": 1, "net_pnl_cash":100, "account_id":1, "entry_date": None, "planned_rr":1, "realized_rr":1, "emotions":[], "setups":[], "indicators_used":[]},
        {"net_pnl_r": 2, "net_pnl_cash":200, "account_id":2, "entry_date": None, "planned_rr":1, "realized_rr":1, "emotions":[], "setups":[], "indicators_used":[]},
    ]
    bd = breakdown_by(trades, "account_id")
    assert "1" in bd and "2" in bd
    assert bd["1"]["total_r"]==1
    assert bd["2"]["total_r"]==2
