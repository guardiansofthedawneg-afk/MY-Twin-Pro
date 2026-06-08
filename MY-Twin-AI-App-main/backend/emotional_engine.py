"""
MyTwin – Emotional Engine v7.0 (Optimized with Local Fallback)
- تحليل المشاعر باستخدام الكلمات المفتاحية أولاً (سريع ومجاني).
- إذا كان التحليل غير دقيق، يستخدم Groq كاحتياطي.
- يدعم العربية والإنجليزية.
"""
import os, logging, re
from typing import Dict, Any

logger = logging.getLogger(__name__)

class EmotionalStateTracker:
    # الكلمات المفتاحية للتحليل المحلي
    KEYWORDS = {
        "joy": ["سعيد", "فرح", "مبسوط", "happy", "joy", "glad"],
        "sadness": ["حزين", "مؤلم", "بكي", "sad", "pain", "cry"],
        "anger": ["غاضب", "محبط", "angry", "mad", "furious"],
        "fear": ["خائف", "قلق", "خوف", "scared", "afraid"],
        "love": ["أحبك", "حبيب", "قلبي", "love", "dear"],
        "surprise": ["مفاجأة", "عجيب", "surprise", "wow"],
        "neutral": ["طبيعي", "عادي", "تمام", "okay", "ok"],
    }

    def _local_analyze(self, text: str) -> Dict[str, Any]:
        """تحليل سريع باستخدام الكلمات المفتاحية (مجاني)."""
        text_lower = text.lower()
        scores = {}
        for emotion, words in self.KEYWORDS.items():
            score = sum(1 for w in words if w in text_lower)
            if score > 0:
                scores[emotion] = score
        if scores:
            primary = max(scores, key=scores.get)
            intensity = min(scores[primary] / 3.0, 1.0)
            return {"primary": primary, "intensity": intensity, "needs_support": primary in ["sadness", "fear", "anger"] and intensity > 0.5}
        return {"primary": "neutral", "intensity": 0.5, "needs_support": False}

    async def analyze(self, text: str, gemini_key: Optional[str] = None) -> Dict[str, Any]:
        """تحليل المشاعر مع احتياطي Groq."""
        # 1. التحليل المحلي أولاً (سريع)
        local = self._local_analyze(text)
        if local["intensity"] > 0.8:
            return local
        # 2. إذا كان التحليل المحلي غير دقيق، استخدم Groq (احتياطي)
        if not gemini_key:
            return local
        try:
            import groq_helper
            prompt = f"""Analyze the emotion of this message and return ONLY JSON:
{{"primary": "neutral", "intensity": 0.5}}
Message: "{text}"
JSON:"""
            result = await groq_helper.call_groq(prompt)
            if result:
                import json
                data = json.loads(result)
                data["needs_support"] = data.get("primary") in ["sadness", "fear", "anger"] and data.get("intensity", 0) > 0.5
                return data
        except:
            pass
        return local
