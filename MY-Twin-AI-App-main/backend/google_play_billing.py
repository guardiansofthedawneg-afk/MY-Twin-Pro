"""
Google Play Billing Simulator v2.0 (اختبار متقدم)
- يحاكي عمليات الشراء والاستعادة
- يخزن الاشتراكات في Supabase
- يدعم جميع الباقات
"""
import os, logging, hashlib
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from supabase import create_client, Client

logger = logging.getLogger("google_play_billing")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
db: Optional[Client] = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

SUBSCRIPTION_PRODUCTS = {
    "plus_monthly": {"tier": "plus", "name": "Plus", "price": "$9", "period": "شهر", "token_bonus": 1500},
    "premium_monthly": {"tier": "premium", "name": "Premium", "price": "$19", "period": "شهر", "token_bonus": 4000},
    "pro_semiannual": {"tier": "pro", "name": "Pro", "price": "$110", "period": "6 أشهر", "token_bonus": 7000},
    "yearly_annual": {"tier": "yearly", "name": "Yearly", "price": "$199", "period": "سنة", "token_bonus": 15000},
}

async def get_subscriptions() -> List[Dict[str, Any]]:
    return [{"productId": k, **v} for k, v in SUBSCRIPTION_PRODUCTS.items()]

async def purchase_subscription(user_id: str, product_id: str) -> bool:
    if not db or product_id not in SUBSCRIPTION_PRODUCTS:
        return False
    try:
        tier = SUBSCRIPTION_PRODUCTS[product_id]["tier"]
        token_bonus = SUBSCRIPTION_PRODUCTS[product_id]["token_bonus"]
        expires = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        db.table("profiles").update({
            "tier": tier,
            "subscription_id": f"sub_{hashlib.md5(user_id.encode()).hexdigest()[:8]}",
            "subscription_expires": expires,
            "token_bonus": token_bonus,
        }).eq("id", user_id).execute()
        logger.info(f"✅ Subscription activated: {user_id} -> {tier}")
        return True
    except Exception as e:
        logger.error(f"Purchase error: {e}")
        return False

async def restore_purchases(user_id: str) -> List[Dict[str, Any]]:
    if not db:
        return []
    try:
        res = db.table("profiles").select("tier, subscription_id").eq("id", user_id).single().execute()
        if res.data and res.data.get("tier") and res.data["tier"] != "free":
            return [{"productId": f"{res.data['tier']}_subscription"}]
    except:
        pass
    return []
