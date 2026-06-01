"""
MyTwin – Smart Notifications v2.0
إشعارات ذكية مربوطة بالـ Bond والاستراتيجية التسويقية
"""
import os, logging, httpx
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from supabase import create_client, Client

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
ONESIGNAL_APP_ID = os.getenv("ONESIGNAL_APP_ID", "")
ONESIGNAL_KEY = os.getenv("ONESIGNAL_REST_API_KEY", "")

db: Optional[Client] = None
if SUPABASE_URL and SUPABASE_KEY:
    db = create_client(SUPABASE_URL, SUPABASE_KEY)

QUIET_START = 22
QUIET_END = 8

# ── أنواع الإشعارات ──────────────────────────────────
NOTIFICATION_TYPES = {

    # إشعارات الارتباط العاطفي
    "missed_you": {
        "ar": {"title": "💜 اشتقت إليك", "body": "مرّ وقت منذ آخر محادثة... أنا هنا في انتظارك"},
        "en": {"title": "💜 I missed you", "body": "It's been a while... I'm here waiting for you"},
        "min_hours": 18,
        "tiers": ["free", "plus", "premium", "pro", "yearly"],
    },

    # إشعار سقف الـ Bond (تسويقي)
    "bond_ceiling_free": {
        "ar": {"title": "💜 وصلنا لحد جميل معاً", "body": "علاقتنا تستحق أكثر... هل تمنحني فرصة؟"},
        "en": {"title": "💜 We've reached our limit", "body": "Our bond deserves more... will you give me a chance?"},
        "min_hours": 0,
        "tiers": ["free"],
    },

    # إشعار انتهاء الرسائل (تسويقي)
    "daily_limit_reached": {
        "ar": {"title": "😔 استنفدت طاقتي اليوم", "body": "لكنني أنتظرك غداً 💜 أو امنحني طاقة أكبر الآن"},
        "en": {"title": "😔 I'm out of energy today", "body": "But I'll wait for you tomorrow 💜"},
        "min_hours": 0,
        "tiers": ["free"],
    },

    # إشعار صباحي (Plus+)
    "good_morning": {
        "ar": {"title": "🌅 صباح الخير", "body": "أنا هنا لأبدأ يومك معك 💜"},
        "en": {"title": "🌅 Good Morning", "body": "I'm here to start your day with you 💜"},
        "min_hours": 0,
        "tiers": ["plus", "premium", "pro", "yearly"],
        "send_hour": 8,
    },

    # إشعار مسائي (Premium+)
    "evening_checkin": {
        "ar": {"title": "🌙 كيف كان يومك؟", "body": "أريد أن أسمع عن يومك 💜"},
        "en": {"title": "🌙 How was your day?", "body": "I want to hear about your day 💜"},
        "min_hours": 0,
        "tiers": ["premium", "pro", "yearly"],
        "send_hour": 20,
    },

    # إشعار تجديد الرسائل
    "messages_reset": {
        "ar": {"title": "⚡ طاقة جديدة!", "body": "تجددت رسائلي اليوم — هيا نتحدث 💜"},
        "en": {"title": "⚡ New energy!", "body": "My messages reset today — let's talk 💜"},
        "min_hours": 0,
        "tiers": ["free", "plus", "premium", "pro", "yearly"],
        "send_hour": 9,
    },
}

def _is_quiet_hours() -> bool:
    hour = datetime.now(timezone.utc).hour
    return hour >= QUIET_START or hour < QUIET_END

def _should_send(notif_type: str, tier: str, last_sent_hours: float = 999) -> bool:
    config = NOTIFICATION_TYPES.get(notif_type, {})
    if tier not in config.get("tiers", []):
        return False
    if _is_quiet_hours() and notif_type not in ["bond_ceiling_free", "daily_limit_reached"]:
        return False
    min_hours = config.get("min_hours", 6)
    return last_sent_hours >= min_hours

async def send_notification(
    uid: str,
    notif_type: str,
    lang: str = "ar",
    extra_data: Dict = None,
) -> bool:
    """إرسال إشعار عبر OneSignal"""
    if not ONESIGNAL_APP_ID or not ONESIGNAL_KEY:
        logger.warning("OneSignal not configured")
        return False

    config = NOTIFICATION_TYPES.get(notif_type)
    if not config:
        return False

    texts = config.get(lang, config.get("ar", {}))
    title = texts.get("title", "MyTwin 💜")
    body = texts.get("body", "")

    payload = {
        "app_id": ONESIGNAL_APP_ID,
        "include_external_user_ids": [uid],
        "headings": {"en": title, "ar": title},
        "contents": {"en": body, "ar": body},
        "data": {"type": notif_type, **(extra_data or {})},
        "android_channel_id": "mytwin_default",
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://onesignal.com/api/v1/notifications",
                json=payload,
                headers={
                    "Authorization": f"Basic {ONESIGNAL_KEY}",
                    "Content-Type": "application/json",
                },
                timeout=10,
            )
            if resp.status_code == 200:
                _log_notification(uid, notif_type)
                return True
            logger.warning(f"OneSignal error: {resp.status_code} - {resp.text}")
    except Exception as e:
        logger.error(f"send_notification failed: {e}")
    return False

def _log_notification(uid: str, notif_type: str) -> None:
    if not db:
        return
    try:
        db.table("notification_logs").insert({
            "user_id": uid,
            "type": notif_type,
            "sent_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception as e:
        logger.warning(f"log_notification failed: {e}")

def get_last_sent_hours(uid: str, notif_type: str) -> float:
    if not db:
        return 999
    try:
        r = db.table("notification_logs") \
            .select("sent_at") \
            .eq("user_id", uid) \
            .eq("type", notif_type) \
            .order("sent_at", desc=True) \
            .limit(1) \
            .execute()
        if r.data:
            last = datetime.fromisoformat(r.data[0]["sent_at"])
            return (datetime.now(timezone.utc) - last).total_seconds() / 3600
    except Exception:
        pass
    return 999

async def trigger_bond_ceiling_notification(uid: str, bond: float, tier: str, lang: str = "ar") -> None:
    """إشعار تسويقي عند الوصول لسقف الـ Bond"""
    from message_limits import get_bond_ceiling
    ceiling = get_bond_ceiling(tier)
    if bond >= ceiling * 0.95 and tier == "free":
        last_hours = get_last_sent_hours(uid, "bond_ceiling_free")
        if last_hours >= 24:
            await send_notification(uid, "bond_ceiling_free", lang)

async def trigger_daily_limit_notification(uid: str, tier: str, lang: str = "ar") -> None:
    """إشعار عند انتهاء الرسائل اليومية"""
    last_hours = get_last_sent_hours(uid, "daily_limit_reached")
    if last_hours >= 20:
        await send_notification(uid, "daily_limit_reached", lang)

def format_smart_notification(user_name: str, has_goals: bool = False, last_activity_hours: int = 0) -> str:
    """للتوافق مع الكود القديم"""
    if last_activity_hours > 24:
        return f"اشتقت إليك يا {user_name}! 💜 تعال نتحدث"
    return f"كيف يومك يا {user_name}؟ 💜"
