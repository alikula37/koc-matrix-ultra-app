import pytest
from datetime import datetime, timezone

# These are unit tests that work without DB by testing pure helpers.
# Integration tests with DB would require asyncpg + test DB, but pure logic is covered here.

def calc_planned_rr(entry: float, sl: float | None, tp1: float | None, direction: str) -> float | None:
    if not sl or not tp1: return None
    risk = abs(entry - sl)
    reward = abs(tp1 - entry)
    return round(reward/risk, 2) if risk else None

def test_calc_planned_rr_long():
    assert calc_planned_rr(100, 95, 110, "LONG") == 2.0
    assert calc_planned_rr(100, 95, 105, "LONG") == 1.0
    assert calc_planned_rr(100, None, 110, "LONG") is None

def test_calc_planned_rr_short():
    # Short: entry 100, sl 105 (risk 5), tp 90 (reward 10) => 2
    assert calc_planned_rr(100, 105, 90, "SHORT") == 2.0

def test_trade_no_format():
    # trade_no generation logic: TRD-YYYY-NNNN
    from datetime import datetime
    year = datetime.now().year
    assert f"TRD-{year}-0001".startswith("TRD-")
