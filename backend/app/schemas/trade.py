from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, List

class TradeExitCreate(BaseModel):
    exit_price: float
    exit_quantity: float
    exit_time: datetime
    exit_reason: str = Field(description="TP1/TP2/TP3/SL/Manual/BE/Panic Close")

class TradeExitOut(TradeExitCreate):
    id: int
    pnl_cash: Optional[float] = None
    pnl_r: Optional[float] = None
    model_config = ConfigDict(from_attributes=True)

class TradeCreate(BaseModel):
    trade_no: Optional[str] = None
    account_id: int
    entry_date: datetime
    exit_date: Optional[datetime] = None
    symbol: str
    direction: str  # LONG/SHORT
    entry_price: float
    stop_loss: Optional[float] = None
    take_profit_1: Optional[float] = None
    take_profit_2: Optional[float] = None
    take_profit_3: Optional[float] = None
    position_size: float
    account_risk_percent: Optional[float] = None
    leverage: Optional[float] = None
    margin_used: Optional[float] = None
    commission_fees: float = 0
    status: str = "OPEN"
    emotions: Optional[List[str]] = None
    indicators_used: Optional[List[str]] = None
    setups: Optional[List[str]] = None
    execution_quality_score: Optional[int] = Field(None, ge=1, le=10)
    trade_setup_notes: Optional[str] = None
    chart_snapshot_paths: Optional[List[str]] = None

class TradeUpdate(TradeCreate):
    pass

class TradeOut(TradeCreate):
    id: int
    user_id: int
    planned_rr: Optional[float] = None
    realized_rr: Optional[float] = None
    net_pnl_cash: Optional[float] = None
    net_pnl_r: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    exits: List[TradeExitOut] = []
    model_config = ConfigDict(from_attributes=True)
