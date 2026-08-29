"""
Market proxy — Binance + Yahoo Finance via backend
- CORS koruması: frontend doğrudan dış API'ye gitmez, backend üzerinden geçer
- 3.5s in-memory cache per symbol (spec 3)
- Auth gerekli: get_current_user (sadece giriş yapmış trader)
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import time
import asyncio
import httpx
from typing import Dict, Any

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/market", tags=["market"])

# Cache: symbol -> (price, source, ts)
_CACHE: Dict[str, tuple[float, str, float]] = {}
_TTL = 3.5
_LOCK = asyncio.Lock()

def _norm(s: str) -> str:
    return s.strip().upper().replace("/", "").replace("-", "")

def _is_crypto(s: str) -> bool:
    n = _norm(s)
    return bool(
        n.endswith(("USDT", "USDC", "BUSD", "BTC", "ETH", "BNB", "TRY", "EUR"))
        or n in {"BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT","ADAUSDT","AVAXUSDT","DOTUSDT","DOGEUSDT","MATICUSDT"}
    )

async def _fetch_binance(symbol: str, client: httpx.AsyncClient) -> float | None:
    n = _norm(symbol)
    if not _is_crypto(n):
        return None
    urls = [
        f"https://data-api.binance.vision/api/v3/ticker/price?symbol={n}",
        f"https://api.binance.com/api/v3/ticker/price?symbol={n}",
        f"https://api1.binance.com/api/v3/ticker/price?symbol={n}",
    ]
    for url in urls:
        try:
            r = await client.get(url, timeout=4.0)
            if r.status_code != 200:
                continue
            j = r.json()
            price_str = j.get("price") if isinstance(j, dict) else None
            if price_str:
                p = float(price_str)
                if p > 0:
                    return p
        except Exception:
            continue
    return None

async def _fetch_yahoo(symbol: str, client: httpx.AsyncClient) -> float | None:
    n = _norm(symbol)
    candidates: list[str] = [n]
    if n.isalpha() and 3 <= len(n) <= 6 and "." not in n and not _is_crypto(n):
        candidates.append(f"{n}.IS")
    if symbol.strip().upper() != n:
        candidates.insert(0, symbol.strip().upper())
    for sym in candidates:
        try:
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}?interval=1m&range=1d"
            r = await client.get(url, timeout=4.0, headers={"User-Agent": "Mozilla/5.0"})
            if r.status_code != 200:
                continue
            j = r.json()
            result = (j.get("chart") or {}).get("result", [{}])[0] if isinstance(j, dict) else None
            if not result:
                continue
            meta_price = result.get("meta", {}).get("regularMarketPrice")
            if isinstance(meta_price, (int, float)) and meta_price > 0:
                return float(meta_price)
            quote = result.get("indicators", {}).get("quote", [{}])[0].get("close") if result.get("indicators") else None
            if isinstance(quote, list):
                for v in reversed(quote):
                    if isinstance(v, (int, float)) and v > 0:
                        return float(v)
        except Exception:
            continue
    return None

@router.get("/prices")
async def get_prices(
    symbols: str = Query(..., description="CSV örn: BTCUSDT,ETHUSDT,THYAO veya tek sembol"),
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Dict[str, Any]:
    # symbols can be "BTCUSDT,ETHUSDT" or "BTCUSDT"
    raw_list = [s.strip() for s in symbols.split(",") if s.strip()]
    # also support repeated query ?symbols=BTCUSDT&symbols=ETHUSDT is not parsed by this, but we handle CSV
    # normalize dedup preserve order
    seen = set()
    uniq: list[str] = []
    for s in raw_list:
        n = _norm(s)
        if n and n not in seen:
            seen.add(n)
            uniq.append(s.strip())
    if not uniq:
        raise HTTPException(400, "symbols gerekli")
    if len(uniq) > 20:
        raise HTTPException(400, "En fazla 20 sembol")

    now = time.time()
    result: Dict[str, Any] = {}
    to_fetch: list[str] = []

    async with _LOCK:
        for s in uniq:
            n = _norm(s)
            cached = _CACHE.get(n)
            if cached and (now - cached[2]) < _TTL:
                price, source, ts = cached
                result[n] = {"price": price, "source": source, "ts": int(ts * 1000)}
            else:
                to_fetch.append(s)

    if to_fetch:
        async with httpx.AsyncClient() as client:
            # fetch concurrently
            async def fetch_one(sym: str) -> tuple[str, float | None, str | None]:
                n = _norm(sym)
                p = None
                src = None
                if _is_crypto(n):
                    p = await _fetch_binance(sym, client)
                    if p is not None:
                        src = "binance"
                if p is None:
                    p2 = await _fetch_yahoo(sym, client)
                    if p2 is not None:
                        p = p2
                        src = "yahoo"
                if p is None and _is_crypto(n):
                    # fallback yahoo for crypto CORS
                    alt = n.replace("USDT", "-USD").replace("TRY", "-TRY")
                    p3 = await _fetch_yahoo(alt, client)
                    if p3 is not None:
                        p = p3
                        src = "yahoo"
                return n, p, src

            fetched = await asyncio.gather(*(fetch_one(s) for s in to_fetch))
            async with _LOCK:
                for n, p, src in fetched:
                    if p is not None and src:
                        ts = time.time()
                        _CACHE[n] = (p, src, ts)
                        result[n] = {"price": p, "source": src, "ts": int(ts * 1000)}
                    else:
                        # not found, keep missing (frontend fallback)
                        pass

    # Ensure we return only requested symbols that were found; missing ones omitted
    return result

@router.get("/price/{symbol}")
async def get_single_price(
    symbol: str,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Dict[str, Any]:
    res = await get_prices(symbols=symbol, db=db, current=current)
    n = _norm(symbol)
    if n not in res:
        raise HTTPException(404, f"Fiyat bulunamadı: {symbol}")
    return {n: res[n]}
