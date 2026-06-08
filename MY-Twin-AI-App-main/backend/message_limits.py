"""
MyTwin – Unified Limits & Tier Manager v3.1
يجمع: حدود الرسائل + حدود التوكن + ميزات الباقات + سقف Bond + مكافآت الإحالة
"""
from datetime import datetime, timezone, timedelta
from typing import Tuple, Optional, Dict
import os
from supabase import create_client, Client
from cache import get, set as cache_set

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
db: Optional[Client] = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

# ── حدود الرسائل اليومية ─────────────────────────────
DAILY_MESSAGES = {
    "free": 15, "free_week1": 20, "free_week2": 17, "free_week3": 15,
    "plus": 50, "premium": 150, "pro": 500, "yearly": 9999,
}

# ── حدود التوكن اليومية ──────────────────────────────
BASE_TOK = {
    "free": 500, "free_week1": 1500, "free_week2": 1000, "free_week3": 700,
    "plus": 1500, "premium": 4000, "pro": 7000, "yearly": 15000,
}

# ── سقف الـ Bond حسب الباقة ──────────────────────────
BOND_CEILING = {
    "free": 28, "free_week1": 28, "free_week2": 28, "free_week3": 28,
    "plus": 70, "premium": 90, "pro": 100, "yearly": 100,
}

# ── نماذج AI حسب الباقة ──────────────────────────────
TIER_MODELS = {
    "free":     ["groq", "gemma4"],
    "plus":     ["groq", "llama4", "deepseek", "gemma4"],
    "premium":  ["groq", "llama4", "deepseek", "qwen", "minimax", "gemma4"],
    "pro":      ["groq", "llama4", "deepseek", "qwen", "minimax", "gemma4", "gptoss", "gemini"],
    "yearly":   ["groq", "llama4", "deepseek", "qwen", "minimax", "gemma4", "gptoss", "gemini"],
}

# ── ميزات مقفولة حسب الباقة (شاملة القيود الجديدة) ──
TIER_FEATURES = {
    "free": {
        "tts": False,
        "dreams": False,
        "coaching": False,
        "proactive": False,
        "long_memory": False,
        "weekly_report": False,
        "smart_home": False,
        # قيود الاستخدام اليومي للميزات المسموح بها
        "daily_limits": {
            "youtube": 2,      # مرتين يومياً
            "search": 1,       # مرة واحدة يومياً
            "weather": 3,      # ثلاث مرات يومياً
            "spotify": 0,      # معطل
            "stt": 0,          # معطل
        }
    },
    "plus": {
        "tts": True,
        "dreams": False,
        "coaching": False,
        "proactive": True,
        "long_memory": True,
        "weekly_report": False,
        "smart_home": False,
        "daily_limits": {
            "youtube": 5,
            "search": 5,
            "weather": 10,
            "spotify": 3,
            "stt": 5,
        }
    },
    "premium": {
        "tts": True,
        "dreams": True,
        "coaching": True,
        "proactive": True,
        "long_memory": True,
        "weekly_report": True,
        "smart_home": False,
        "daily_limits": {
            "youtube": 10,
            "search": 10,
            "weather": 20,
            "spotify": 10,
            "stt": 10,
        }
    },
    "pro": {
        "tts": True,
        "dreams": True,
        "coaching": True,
        "proactive": True,
        "long_memory": True,
        "weekly_report": True,
        "smart_home": True,
        "daily_limits": {
            "youtube": 30,
            "search": 30,
            "weather": 50,
            "spotify": 30,
            "stt": 20,
        }
    },
    "yearly": {
        "tts": True,
        "dreams": True,
        "coaching": True,
        "proactive": True,
        "long_memory": True,
        "weekly_report": True,
        "smart_home": True,
        "daily_limits": {
            "youtube": 999,
            "search": 999,
            "weather": 999,
            "spotify": 999,
            "stt": 999,
        }
    },
}

REFERRAL_BONUS_TOK = 500
REFERRAL_DAILY_MSG_BONUS = 5

def _get_effective_tier(tier: str, signup_date: Optional[str] = None) -> str:
    if tier == "free" and signup_date:
        try:
            signup = datetime.fromisoformat(signup_date)
            days = (datetime.now(timezone.utc) - signup).days
            if days < 7:  return "free_week1"
            if days < 14: return "free_week2"
            if days < 21: return "free_week3"
        except: pass
    return tier

def _get_daily_referral_bonus(uid: str) -> int:
    referral_data = get(f"referral:{uid}")
    if not referral_data: return 0
    try:
        activated_at = datetime.fromisoformat(referral_data.get("activated_at", ""))
        days_since = (datetime.now(timezone.utc) - activated_at).days
        if days_since < 7: return REFERRAL_DAILY_MSG_BONUS
    except: pass
    return 0

def _get_referral_tok_bonus(uid: str) -> int:
    cache_key = f"referral_bonus:{uid}"
    cached = get(cache_key)
    if cached is not None: return cached
    if db:
        try:
            total = 0
            now = datetime.now(timezone.utc)
            res = db.table("referral_usage").select("activated_at").eq("inviter_id", uid).execute()
            if res.data:
                for row in res.data:
                    activated = datetime.fromisoformat(row["activated_at"].replace("Z", "+00:00"))
                    if (now - activated).days < 30: total += REFERRAL_BONUS_TOK
            res2 = db.table("referral_usage").select("activated_at").eq("id", uid).execute()
            if res2.data:
                for row in res2.data:
                    activated = datetime.fromisoformat(row["activated_at"].replace("Z", "+00:00"))
                    if (now - activated).days < 30: total += REFERRAL_BONUS_TOK
            cache_set(cache_key, total, 3600)
            return total
        except Exception as e:
            print(f"Referral bonus error: {e}")
    return 0

def check_message_limit(uid: str, tier: str, signup_date: Optional[str] = None) -> Tuple[bool, int, str]:
    effective = _get_effective_tier(tier, signup_date)
    today = datetime.now(timezone.utc).date().isoformat()
    key = f"msg:{uid}:{today}"
    used = get(key) or 0
    base = DAILY_MESSAGES.get(effective, 15)
    limit = base + _get_daily_referral_bonus(uid)
    if used >= limit: return False, 0, "daily_limit_reached"
    cache_set(key, used + 1, 86400)
    return True, limit - used - 1, "ok"

def check_tok(uid: str, tier: str, est: int, signup_date: Optional[str] = None) -> Tuple[bool, int]:
    effective = _get_effective_tier(tier, signup_date)
    today = datetime.now(timezone.utc).date().isoformat()
    key = f"tok:{uid}:{today}"
    used = get(key) or 0
    limit = BASE_TOK.get(effective, 500) + _get_referral_tok_bonus(uid)
    if used + est > limit: return False, max(0, limit - used)
    cache_set(key, used + est, 86400)
    return True, limit - used - est

def get_bond_ceiling(tier: str, signup_date: Optional[str] = None) -> int:
    effective = _get_effective_tier(tier, signup_date)
    return BOND_CEILING.get(effective, 28)

def apply_bond_ceiling(bond: float, tier: str, signup_date: Optional[str] = None) -> float:
    return min(bond, float(get_bond_ceiling(tier, signup_date)))

def get_tier_models(tier: str) -> list:
    base = tier.split("_")[0] if "_" in tier else tier
    return TIER_MODELS.get(base, TIER_MODELS["free"])

def get_tier_features(tier: str) -> dict:
    base = tier.split("_")[0] if "_" in tier else tier
    return TIER_FEATURES.get(base, TIER_FEATURES["free"])

def get_daily_feature_limit(tier: str, feature_name: str) -> int:
    """الحد اليومي لميزة معينة مثل youtube, search, weather"""
    features = get_tier_features(tier)
    return features.get("daily_limits", {}).get(feature_name, 0)

def check_feature_usage(uid: str, tier: str, feature_name: str) -> Tuple[bool, int]:
    """التحقق من استهلاك الميزة اليومية (True=مسموح, remaining)"""
    limit = get_daily_feature_limit(tier, feature_name)
    if limit == 0:
        return False, 0
    today = datetime.now(timezone.utc).date().isoformat()
    key = f"feat:{uid}:{feature_name}:{today}"
    used = get(key) or 0
    if used >= limit:
        return False, 0
    cache_set(key, used + 1, 86400)
    return True, limit - used - 1

def activate_referral_bonus(uid: str) -> None:
    cache_set(f"referral:{uid}", {
        "activated_at": datetime.now(timezone.utc).isoformat(),
        "daily_bonus": REFERRAL_DAILY_MSG_BONUS,
        "duration_days": 7,
    }, 86400 * 7)

def add_referral_tok_bonus(uid: str) -> None:
    cache_set(f"referral_bonus:{uid}", None, 1)

def get_usage_summary(uid: str, tier: str, signup_date: Optional[str] = None) -> Dict:
    effective = _get_effective_tier(tier, signup_date)
    today = datetime.now(timezone.utc).date().isoformat()
    msg_used = get(f"msg:{uid}:{today}") or 0
    tok_used = get(f"tok:{uid}:{today}") or 0
    msg_limit = DAILY_MESSAGES.get(effective, 15) + _get_daily_referral_bonus(uid)
    tok_limit = BASE_TOK.get(effective, 500) + _get_referral_tok_bonus(uid)
    now = datetime.now(timezone.utc)
    midnight = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    hours = int((midnight - now).total_seconds() / 3600)
    return {
        "messages": {"used": msg_used, "limit": msg_limit, "remaining": max(0, msg_limit - msg_used)},
        "tokens":   {"used": tok_used, "limit": tok_limit, "remaining": max(0, tok_limit - tok_used)},
        "bond_ceiling": get_bond_ceiling(tier, signup_date),
        "hours_until_reset": hours,
        "effective_tier": effective,
        "features": get_tier_features(tier),
    }

print("✅ Unified Limits Manager v3.1 | رسائل + توكن + ميزات + حدود يومية | جاهز")
