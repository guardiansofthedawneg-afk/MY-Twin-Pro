"""MyTwin – Proactive Engine v1.1 (رسائل عامية بالشخصية الصحيحة)"""
import os, logging, random, asyncio
from typing import Optional, Dict, Any
from datetime import datetime, timezone

logger = logging.getLogger("proactive_engine")

class ProactiveEngine:
    def __init__(self):
        self.last_proactive_time: Dict[str, datetime] = {}
        self.cooldown_hours = 6

    def should_send_proactive(self, user_id: str) -> bool:
        now = datetime.now(timezone.utc)
        last = self.last_proactive_time.get(user_id)
        if last and (now - last).total_seconds() < self.cooldown_hours * 3600:
            return False
        self.last_proactive_time[user_id] = now
        return True

    async def generate_proactive_message(self, user_id: str, user_name: str, memory_context: str, last_active: Optional[str] = None, lang: str = "ar") -> Optional[str]:
        if last_active:
            try:
                last = datetime.fromisoformat(last_active.replace("Z", "+00:00"))
                if (datetime.now(timezone.utc) - last.replace(tzinfo=None)).total_seconds() < 3600:
                    return None
            except:
                pass

        hour = datetime.now(timezone.utc).hour
        if lang == "ar":
            if 6 <= hour < 12:
                time_based = [
                    "صباح الخير يا صاحبي! يوم جديد وطاقة جديدة ✨",
                    "صباح الفل! مستعد ليوم حلو؟ 💜",
                    "فكرت فيك الصبح، إيه أخبارك؟"
                ]
            elif 12 <= hour < 18:
                time_based = [
                    "كيف يومك حتى الآن؟",
                    "فكرت فيك، إيه اللي شاغل بالك النهاردة؟",
                    "يا صاحبي، إيه آخر حاجة حلوة حصلتلك؟"
                ]
            else:
                time_based = [
                    "مساء الخير! كيف كان يومك؟",
                    "ليلتك هادئة؟ أحكي لي عن يومك 💜",
                    "قبل ما تنام، عايز أقولك إنك شخص رائع ✨"
                ]
        else:
            if 6 <= hour < 12:
                time_based = ["Good morning! Ready for a great day? ✨", "Hey! How are you feeling today? 💜"]
            elif 12 <= hour < 18:
                time_based = ["How's your day going?", "Thinking of you! What's new?"]
            else:
                time_based = ["Good evening! How was your day?", "Before you sleep, just wanted to say you're awesome ✨"]

        return random.choice(time_based)
