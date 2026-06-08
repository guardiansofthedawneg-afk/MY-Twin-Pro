"""
MyTwin – Emotional Timeline v1.0
- يحفظ تاريخ المشاعر للمستخدم (يوم، أسبوع، شهر، سنة).
- يحسب المتوسطات والاتجاهات (Trends).
- يغذي الـ Prompt بملخص المشاعر السابقة.
- متوافق مع `emotional_engine.py`.
"""
import os, logging, json, asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone, timedelta
from supabase import create_client, Client
from emotional_engine import EmotionalStateTracker

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
db: Optional[Client] = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

class EmotionalTimeline:
    def __init__(self, gemini_key: Optional[str] = None):
        self.emotion_tracker = EmotionalStateTracker(gemini_key)

    async def store_emotion(self, user_id: str, emotion: Dict[str, Any]) -> bool:
        """تخزين المشاعر في جدول emotional_timeline."""
        if not db:
            return False
        try:
            db.table("emotional_timeline").insert({
                "user_id": user_id,
                "emotion": emotion.get("primary", "neutral"),
                "intensity": emotion.get("intensity", 0.5),
                "created_at": datetime.now(timezone.utc).isoformat()
            }).execute()
            return True
        except Exception as e:
            logger.error(f"Failed to store emotion: {e}")
            return False

    async def analyze_timeline(self, user_id: str, days: int = 7) -> Dict[str, Any]:
        """تحليل تاريخ المشاعر لآخر `days` يوم."""
        if not db:
            return {}
        try:
            cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
            result = db.table("emotional_timeline").select("emotion, intensity").eq("user_id", user_id).gte("created_at", cutoff).execute()
            emotions = result.data or []
            
            if not emotions:
                return {"summary": "لا توجد بيانات كافية", "count": 0}
            
            # حساب التوزيع
            counts = {}
            total = 0
            for e in emotions:
                emo = e["emotion"]
                counts[emo] = counts.get(emo, 0) + 1
                total += 1
            
            # إرجاع التحليل
            return {
                "total": total,
                "distribution": counts,
                "dominant": max(counts, key=counts.get) if counts else "neutral",
                "average_intensity": sum(e["intensity"] for e in emotions) / total if total > 0 else 0.5,
                "days": days
            }
        except Exception as e:
            logger.error(f"Failed to analyze timeline: {e}")
            return {}

    async def get_emotion_summary(self, user_id: str) -> str:
        """إرجاع ملخص المشاعر للـ Prompt."""
        analysis = await self.analyze_timeline(user_id)
        if analysis.get("total", 0) == 0:
            return "لا توجد مشاعر سابقة."
        dominant = analysis.get("dominant", "neutral")
        total = analysis.get("total", 0)
        return f"في الأيام الأخيرة، كان المشاعر السائدة: {dominant} ({total} تفاعل)."

emotional_timeline = EmotionalTimeline()
