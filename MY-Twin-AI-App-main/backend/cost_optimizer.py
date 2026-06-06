"""
MyTwin – Cost Optimizer v1.1 (يدعم العربية)
- يقرر ما إذا كان السؤال يحتاج إلى LLM قوي أم يمكن الرد من الذاكرة
- يدعم الأنماط العربية والإنجليزية
"""
import os, logging, hashlib
from typing import Optional, Dict, Any, Tuple

logger = logging.getLogger("cost_optimizer")

MODEL_COSTS = {
    "gemini_flash": 0.00002,
    "groq": 0.00003,
    "openrouter_llama4": 0.00005,
    "openrouter_deepseek": 0.00007,
    "elevenlabs": 0.005,
}

TIER_BUDGETS = {
    "free": 0.001,
    "plus": 0.005,
    "premium": 0.02,
    "pro": 0.05,
    "yearly": 0.10,
}

class CostOptimizer:
    def __init__(self):
        self.cache = {}
        self.daily_costs: Dict[str, float] = {}

    def should_use_llm(self, message: str, tier: str) -> Tuple[bool, str]:
        # 1. تحيات بسيطة — لا تحتاج LLM
        simple_patterns = [
            "مرحبا", "هاي", "hello", "hi", "كيف حالك", "شكرا", "thanks",
            "صباح الخير", "مساء الخير", "good morning", "good night",
            "أهلا", "ياهلا", "السلام عليكم", "وعليكم السلام", "هاي",
        ]
        if any(p in message.lower() for p in simple_patterns):
            return False, "simple_greeting"

        # 2. تحقق من الذاكرة المؤقتة
        msg_hash = hashlib.md5(message.encode()).hexdigest()
        if msg_hash in self.cache:
            logger.info("💾 Served from cache")
            return False, "cache_hit"

        # 3. أسئلة معقدة تحتاج LLM
        complex_patterns = [
            "لماذا", "كيف", "اشرح", "حلل", "قارن", "لخص", "why", "how",
            "explain", "analyze", "compare", "summarize", "ما رأيك", "شو رأيك",
            "إيه رأيك", "عايز أعرف", "بدي أعرف", "أبغى أعرف",
        ]
        if any(p in message.lower() for p in complex_patterns):
            return True, "complex_query"

        return True, "default"

    def get_appropriate_model(self, message: str, intent: str, tier: str) -> str:
        if tier in ["free", "plus"]:
            return "gemini_flash"
        if intent in ["general", "greeting"]:
            return "groq"
        if intent in ["emotional", "coaching", "dream"]:
            return "openrouter_llama4"
        if intent in ["coding", "deep_reasoning"]:
            return "openrouter_deepseek"
        return "gemini_flash"

    def track_cost(self, user_id: str, model: str, tokens: int):
        cost = MODEL_COSTS.get(model, 0.00002) * (tokens / 1000)
        self.daily_costs[user_id] = self.daily_costs.get(user_id, 0) + cost
        logger.info(f"💰 Cost for {user_id}: ${self.daily_costs[user_id]:.6f}")

    def is_within_budget(self, user_id: str, tier: str) -> bool:
        budget = TIER_BUDGETS.get(tier, 0.001)
        current = self.daily_costs.get(user_id, 0)
        return current < budget

    def cache_response(self, message: str, response: str):
        msg_hash = hashlib.md5(message.encode()).hexdigest()
        self.cache[msg_hash] = response

    def get_cached_response(self, message: str) -> Optional[str]:
        msg_hash = hashlib.md5(message.encode()).hexdigest()
        return self.cache.get(msg_hash)


cost_optimizer = CostOptimizer()
