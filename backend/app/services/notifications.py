"""
Notification triggers — Web Push + Telegram (optional)
- Gün/hafta/ay kapanışı, drawdown eşiği, streak
"""
import os
from datetime import datetime, timezone
from typing import Optional

TELEGRAM_ENABLED = bool(os.getenv("TELEGRAM_BOT_TOKEN"))

async def send_telegram(message: str):
    if not TELEGRAM_ENABLED:
        return
    bot = os.getenv("TELEGRAM_BOT_TOKEN")
    chat = os.getenv("TELEGRAM_CHAT_ID")
    if not bot or not chat:
        return
    import httpx
    async with httpx.AsyncClient() as c:
        await c.post(f"https://api.telegram.org/bot{bot}/sendMessage", json={"chat_id": chat, "text": message, "parse_mode": "Markdown"})

def check_triggers(metrics: dict) -> list[dict]:
    """
    metrics: compute_basic_metrics sonucu
    Returns list of notification dicts to be created
    """
    notifs = []
    # Drawdown -5R
    if metrics.get("max_drawdown_r", 0) <= -5:
        notifs.append({"type":"drawdown", "title":"Drawdown Uyarısı", "body": f"Max DD {metrics['max_drawdown_r']}R — risk yönetimi gözden geçir"})
    # 3 kayıp üst üste
    if metrics.get("consecutive_losses",0) >=3:
        notifs.append({"type":"streak", "title":"Mola Ver", "body": f"{metrics['consecutive_losses']} kayıp üst üste — ara ver, planı gözden geçir"})
    return notifs
