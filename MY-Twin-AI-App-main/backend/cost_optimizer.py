"""
MyTwin – Cost Optimizer v2.0 (Feature Flags per Tier)
- يدير حدود الاستخدام والتكلفة بناءً على الباقة (Free, Plus, Premium, Pro, Yearly).
- يوفر Feature Flags لتفعيل/تعطيل الميزات حسب الباقة.
- يستخدم `cache` لتخزين الاستخدام اليومي.
"""
import os, logging
from typing import Dict, Any, Optional, Tuple
from datetime import date
from cache import get as cache_get, set as cache_set

logger = logging.getLogger(__name__)

# ========== Feature Flags لكل باقة ==========
TIER_FEATURES = {
    "free": {
        "messages": 15,
        "memory_days": 3,
        "dream_analysis": False,
        "coaching": False,
        "youtube": False,
        "spotify": False,
        "weather": True,
        "voice": False,
        "emotion_analysis": True,
        "smart_home": False,
        "proactive": False,
    },
    "plus": {
        "messages": 50,
        "memory_days": 7,
        "dream_analysis": False,
        "coaching": False,
        "youtube": False,
        "spotify": False,
        "weather": True,
        "voice": True,
        "emotion_analysis": True,
        "smart_home": False,
        "proactive": True,
    },
    "premium": {
        "messages": 150,
        "memory_days": 30,
        "dream_analysis": True,
        "coaching": True,
        "youtube": True,
        "spotify": True,
        "weather": True,
        "voice": True,
        "emotion_analysis": True,
        "smart_home": False,
        "proactive": True,
    },
    "pro": {
        "messages": 500,
        "memory_days": 90,
        "dream_analysis": True,
        "coaching": True,
        "youtube": True,
        "spotify": True,
        "weather": True,
        "voice": True,
        "emotion_analysis": True,
        "smart_home": True,
        "proactive": True,
    },
    "yearly": {
        "messages": 9999,
        "memory_days": 365,
        "dream_analysis": True,
        "coaching": True,
        "youtube": True,
        "spotify": True,
        "weather": True,
        "voice": True,
        "emotion_analysis": True,
        "smart_home": True,
        "proactive": True,
    },
}

class CostOptimizer:
    def __init__(self):
        self.features = TIER_FEATURES

    def get_feature_flags(self, tier: str) -> Dict[str, Any]:
        """إرجاع Feature Flags للباقة المحددة."""
        return self.features.get(tier, self.features["free"])

    def check_usage(self, user_id: str, tier: str) -> Tuple[bool, int]:
        """
        التحقق من استخدام الرسائل اليومية.
        إرجاع (مسموح, متبقي).
        """
        today = date.today().isoformat()
        key = f"usage:{user_id}:{today}"
        used = cache_get(key) or 0
        limit = self.features.get(tier, self.features["free"])["messages"]
        if used >= limit:
            return False, 0
        return True, limit - used

    def increment_usage(self, user_id: str) -> int:
        """زيادة عداد الاستخدام اليومي."""
        today = date.today().isoformat()
        key = f"usage:{user_id}:{today}"
        used = cache_get(key) or 0
        new_used = used + 1
        cache_set(key, new_used, 86400)
        return new_used

cost_optimizer = CostOptimizer()
