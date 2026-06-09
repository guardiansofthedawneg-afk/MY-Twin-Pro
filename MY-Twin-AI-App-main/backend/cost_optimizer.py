"""
MyTwin – Cost Intelligence Optimizer v3.0
- يختار أرخص مزود نموذج (OpenRouter مجاني > Groq > Gemini) حسب الباقة.
- يتتبع التكلفة التقديرية لكل طلب ويُخزِّنها.
- يقدم تقارير استهلاك يومية ويتنبأ بالتكلفة.
- يستخدم Redis للكاش (عدادات الاستخدام).
"""
import os, logging, time, hashlib
from typing import Dict, Any, Optional, Tuple, List
from datetime import date, datetime, timedelta
from cache import get as cache_get, set as cache_set, redis_cache

logger = logging.getLogger(__name__)

# ── تكلفة تقريبية لكل 1000 توكن (بالدولار) ──────────
MODEL_COST_PER_1K_TOKENS = {
    "groq/llama-3.3-70b": 0.0,           # مجاني ضمن حد معين
    "openrouter/deepseek-v4-flash": 0.0, # مجاني
    "openrouter/llama-4-maverick": 0.0,  # مجاني
    "openrouter/gemini-2.5-flash": 0.0,  # مجاني
    "gemini-2.0-flash": 0.0,             # مجاني ضمن حد
    "elevenlabs-tts": 0.001,             # تقديري
}

# ── Feature Flags (متوافقة مع message_limits) ────────
# سنستخدم message_limits داخلياً لتجنب التكرار
def _get_tier_features(tier: str) -> Dict[str, Any]:
    try:
        from message_limits import get_tier_features
        return get_tier_features(tier)
    except:
        # احتياطي
        return {}

class CostOptimizer:
    def __init__(self):
        self.daily_cost_threshold = {
            "free": 0.0,
            "plus": 0.05,
            "premium": 0.2,
            "pro": 1.0,
            "yearly": 5.0,
        }

    def get_feature_flags(self, tier: str) -> Dict[str, Any]:
        """
        جلب الميزات من message_limits (متوافق مع الاستخدام القديم).
        """
        return _get_tier_features(tier)

    def check_usage(self, user_id: str, tier: str) -> Tuple[bool, int]:
        """
        التحقق من استخدام الرسائل اليومية (مُعاد توجيهه إلى message_limits).
        """
        try:
            from message_limits import check_message_limit
            allowed, remaining, _ = check_message_limit(user_id, tier)
            return allowed, remaining
        except:
            # احتياطي
            today = date.today().isoformat()
            key = f"usage:{user_id}:{today}"
            used = cache_get(key) or 0
            limit = _get_tier_features(tier).get("messages", 15)
            if used >= limit:
                return False, 0
            return True, limit - used

    def increment_usage(self, user_id: str) -> int:
        """زيادة عداد الاستخدام اليومي (محلي + Redis)"""
        today = date.today().isoformat()
        key = f"usage:{user_id}:{today}"
        used = cache_get(key) or 0
        new_used = used + 1
        cache_set(key, new_used, 86400)
        return new_used

    def estimate_request_cost(self, model_name: str, tokens_used: int) -> float:
        """تقدير تكلفة الطلب بناءً على النموذج وعدد التوكنات"""
        rate = MODEL_COST_PER_1K_TOKENS.get(model_name, 0.0)
        return (tokens_used / 1000) * rate

    def select_cheapest_model(self, tier: str, task: str = "general") -> str:
        """
        اختيار أرخص نموذج متاح للباقة والمهمة.
        يُستخدم لتحسين التكلفة تلقائياً.
        """
        # الأولوية للنماذج المجانية أولاً
        free_models = {
            "general": "openrouter/gemini-2.5-flash",
            "coding": "openrouter/deepseek-v4-flash",
            "reasoning": "openrouter/llama-4-maverick",
            "emotional": "openrouter/llama-4-maverick",
        }
        return free_models.get(task, "openrouter/gemini-2.5-flash")

    def get_daily_cost(self, user_id: str) -> float:
        """حساب التكلفة التقديرية لليوم الحالي لمستخدم"""
        today = date.today().isoformat()
        key = f"cost:{user_id}:{today}"
        return float(cache_get(key) or 0.0)

    def add_daily_cost(self, user_id: str, amount: float):
        """إضافة تكلفة ليوم المستخدم"""
        today = date.today().isoformat()
        key = f"cost:{user_id}:{today}"
        current = self.get_daily_cost(user_id)
        cache_set(key, current + amount, 86400)

    def is_daily_cost_exceeded(self, user_id: str, tier: str) -> bool:
        """هل تجاوز المستخدم حد التكلفة اليومي؟"""
        threshold = self.daily_cost_threshold.get(tier, 0.0)
        return self.get_daily_cost(user_id) >= threshold

    def get_cost_summary(self, user_id: str, days: int = 7) -> Dict[str, Any]:
        """ملخص التكلفة لآخر أيام"""
        today = date.today()
        costs = []
        for i in range(days):
            day = today - timedelta(days=i)
            key = f"cost:{user_id}:{day.isoformat()}"
            costs.append({
                "date": day.isoformat(),
                "cost": float(cache_get(key) or 0.0)
            })
        return {
            "days": costs,
            "total": sum(c["cost"] for c in costs)
        }

# نسخة عالمية للتوافق
cost_optimizer = CostOptimizer()
print("✅ Cost Intelligence Optimizer v3.0 | اختيار النموذج الأرخص، تتبع التكلفة")
