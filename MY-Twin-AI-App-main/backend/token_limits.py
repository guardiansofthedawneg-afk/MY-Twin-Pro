"""
MyTwin – Token Limits v2.1
- حدود التوكن حسب الباقة
- مكافأة إحالة: 500 توكن (تنتهي صلاحيتها بعد 30 يوم)
"""
from datetime import datetime, timezone, timedelta
from typing import Tuple, Optional
import os
from supabase import create_client, Client
from cache import get, set as cache_set

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
db: Optional[Client] = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

BASE_TOK = {
    "free": 500, "free_week1": 1500, "free_week2": 1000, "free_week3": 700,
    "plus": 1500, "premium": 4000, "pro": 7000, "yearly": 15000,
}

REFERRAL_BONUS = 500  # ثابت: 500 توكن لكل إحالة

def _get_effective_tier(tier: str, signup_date: Optional[str] = None) -> str:
    if tier == "free" and signup_date:
        try:
            signup = datetime.fromisoformat(signup_date)
            days = (datetime.now(timezone.utc) - signup).days
            if days < 7: return "free_week1"
            elif days < 14: return "free_week2"
            elif days < 21: return "free_week3"
        except: pass
    return tier

def check_tok(uid: str, tier: str, est: int, signup_date: Optional[str] = None, trial_start: Optional[str] = None) -> Tuple[bool, int]:
    effective = _get_effective_tier(tier, signup_date)
    key = f"tok:{uid}:{datetime.now(timezone.utc).date().isoformat()}"
    used = get(key) or 0
    limit = BASE_TOK.get(effective, 500)
    bonus = _get_referral_bonus(uid)
    limit += bonus
    if used + est > limit:
        return False, max(0, limit - used)
    cache_set(key, used + est, 86400)
    return True, limit - used - est

def _get_referral_bonus(uid: str) -> int:
    """جلب مكافآت الإحالة النشطة (غير المنتهية)"""
    cache_key = f"referral_bonus:{uid}"
    cached = get(cache_key)
    if cached is not None:
        return cached
    
    if db:
        try:
            now = datetime.now(timezone.utc).isoformat()
            # جمع كل المكافآت التي لم تنته صلاحيتها بعد
            res = db.table("referral_usage").select("activated_at").eq("inviter_id", uid).execute()
            if res.data:
                total_bonus = 0
                for row in res.data:
                    activated = datetime.fromisoformat(row["activated_at"].replace("Z", "+00:00"))
                    if (datetime.now(timezone.utc) - activated).days < 30:
                        total_bonus += REFERRAL_BONUS
                cache_set(cache_key, total_bonus, 3600)  # تخزين في الكاش لساعة واحدة
                return total_bonus
            
            # أيضًا جلب المكافآت التي حصل عليها كمدعو
            res2 = db.table("referral_usage").select("activated_at").eq("user_id", uid).execute()
            if res2.data:
                for row in res2.data:
                    activated = datetime.fromisoformat(row["activated_at"].replace("Z", "+00:00"))
                    if (datetime.now(timezone.utc) - activated).days < 30:
                        total_bonus += REFERRAL_BONUS
                cache_set(cache_key, total_bonus, 3600)
                return total_bonus
        except Exception as e:
            print(f"Referral bonus fetch error: {e}")
    
    return 0

def add_referral_bonus(uid: str, amount: int = REFERRAL_BONUS):
    """إضافة مكافأة إحالة (تخزن في Supabase فقط)"""
    cache_key = f"referral_bonus:{uid}"
    cache_set(cache_key, None, 1)  # مسح الكاش لإجبار إعادة الحساب
    
    # التخزين الفعلي يتم في referral.py عبر جدول referral_usage
    # هذه الدالة موجودة للتوافق مع الكود القديم
