"""MyTwin – Telegram Webhook (ربط تلقائي)"""
import os
import httpx
import logging
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
router = APIRouter()

@router.post("/api/telegram/webhook")
async def telegram_webhook(request: Request):
    """استقبال رسائل تيليجرام تلقائيًا"""
    try:
        body = await request.json()
        message = body.get("message", {})
        chat_id = message.get("chat", {}).get("id")
        text = message.get("text", "")
        user = message.get("from", {})
        username = user.get("username", "")
        first_name = user.get("first_name", "")
        
        if not chat_id:
            return JSONResponse({"status": "ignored"})
        
        if text == "/start":
            import hashlib
            link_code = hashlib.md5(str(chat_id).encode()).hexdigest()[:8]
            
            from supabase import create_client
            db = create_client(
                os.getenv("SUPABASE_URL", ""),
                os.getenv("SUPABASE_SERVICE_KEY", "")
            )
            
            db.table("telegram_links").upsert({
                "chat_id": chat_id,
                "username": username,
                "first_name": first_name,
                "link_code": link_code,
                "linked_at": "now()",
            }).execute()
            
            await send_telegram_message(
                chat_id,
                f"👋 مرحبًا {first_name}!\n\nتم ربط حسابك بـ MyTwin.\nرمز الربط: `{link_code}`\n\nستتلقى إشعارات من توأمك الرقمي هنا. 💜"
            )
        
        return JSONResponse({"status": "ok"})
    except Exception as e:
        logger.error(f"Telegram Webhook Error: {e}")
        return JSONResponse({"status": "error"})

async def send_telegram_message(chat_id: str, text: str) -> bool:
    if not TELEGRAM_BOT_TOKEN:
        return False
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"},
                timeout=10.0
            )
            return resp.status_code == 200
    except Exception as e:
        logger.error(f"Telegram Error: {e}")
        return False

async def setup_webhook():
    if not TELEGRAM_BOT_TOKEN:
        return
    base_url = os.getenv("EXPO_PUBLIC_API_URL", "").replace("/$", "")
    webhook_url = f"{base_url}/api/telegram/webhook"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/setWebhook",
                json={"url": webhook_url},
                timeout=10.0
            )
            if resp.status_code == 200:
                logger.info(f"✅ Telegram Webhook set to: {webhook_url}")
    except Exception as e:
        logger.error(f"Webhook Error: {e}")
