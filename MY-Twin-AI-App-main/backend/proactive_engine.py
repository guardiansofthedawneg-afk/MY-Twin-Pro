"""
MyTwin – Proactive Engine v1.2 (Cron-Ready)
- رسائل عامية بشخصية GenZ Sage
- دعم الإرسال الجماعي عبر Cron Job
- تكامل مع OneSignal للإشعارات
"""
import os, logging, random, asyncio, json
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, timedelta
from supabase import create_client, Client
import httpx

logger = logging.getLogger("proactive_engine")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
ONESIGNAL_APP_ID = os.getenv("ONESIGNAL_APP_ID", "")
ONESIGNAL_REST_API_KEY = os.getenv("ONESIGNAL_REST_API_KEY", "")

class ProactiveEngine:
    def __init__(self):
        self.db = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None
        self.last_proactive_time: Dict[str, datetime] = {}

    def should_send_proactive(self, user_id: str) -> bool:
        """يتحقق مما إذا كان يجب إرسال رسالة استباقية لهذا المستخدم."""
        if not self.db:
            return False
        try:
            # جلب آخر وقت تم إرسال رسالة استباقية فيه
            res = self.db.table("proactive_logs").select("sent_at").eq("user_id", user_id).order("sent_at", desc=True).limit(1).execute()
            if res.data and len(res.data) > 0:
                last_sent = datetime.fromisoformat(res.data[0]["sent_at"].replace("Z", "+00:00"))
                if (datetime.now(timezone.utc) - last_sent.replace(tzinfo=None)).total_seconds() < 6 * 3600:
                    return False
            return True
        except:
            return True

    async def generate_proactive_message(
        self,
        user_id: str,
        user_name: str,
        lang: str = "ar"
    ) -> Optional[str]:
        """يولد رسالة استباقية مناسبة بناءً على الوقت واللغة."""
        hour = datetime.now(timezone.utc).hour
        
        if lang == "ar":
            if 6 <= hour < 12:
                messages = [
                    f"صباح الخير يا {user_name}! يوم جديد وفرصة جديدة ✨",
                    f"صباح الفل يا صاحبي! مستعد ليوم حلو؟ 💜",
                    f"فكرت فيك الصبح، إيه أخبارك يا {user_name}؟",
                ]
            elif 12 <= hour < 18:
                messages = [
                    f"كيف يومك حتى الآن يا {user_name}؟",
                    f"فكرت فيك، إيه اللي شاغل بالك النهاردة؟",
                    f"يا صاحبي، إيه آخر حاجة حلوة حصلتلك؟",
                ]
            else:
                messages = [
                    f"مساء الخير يا {user_name}! كيف كان يومك؟",
                    f"ليلتك هادئة؟ أحكي لي عن يومك 💜",
                    f"قبل ما تنام، عايز أقولك إنك شخص رائع ✨",
                ]
        else:
            if 6 <= hour < 12:
                messages = [
                    f"Good morning {user_name}! Ready for a great day? ✨",
                    f"Hey {user_name}! How are you feeling today? 💜",
                ]
            elif 12 <= hour < 18:
                messages = [
                    f"How's your day going, {user_name}?",
                    f"Thinking of you! What's new?",
                ]
            else:
                messages = [
                    f"Good evening {user_name}! How was your day?",
                    f"Before you sleep, just wanted to say you're awesome ✨",
                ]

        return random.choice(messages)

    async def send_notification(self, user_id: str, title: str, message: str) -> bool:
        """إرسال إشعار عبر OneSignal."""
        if not ONESIGNAL_REST_API_KEY or not ONESIGNAL_APP_ID:
            logger.warning("OneSignal keys not configured")
            return False

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://onesignal.com/api/v1/notifications",
                    json={
                        "app_id": ONESIGNAL_APP_ID,
                        "headings": {"en": title, "ar": title},
                        "contents": {"en": message, "ar": message},
                        "include_external_user_ids": [user_id],
                    },
                    headers={
                        "Authorization": f"Basic {ONESIGNAL_REST_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    timeout=10.0
                )
                if resp.status_code == 200:
                    logger.info(f"✅ Notification sent to {user_id}")
                    return True
                logger.warning(f"OneSignal error: {resp.status_code}")
                return False
        except Exception as e:
            logger.error(f"Failed to send notification: {e}")
            return False

    async def log_proactive(self, user_id: str, message: str):
        """تسجيل الرسالة الاستباقية في قاعدة البيانات."""
        if not self.db:
            return
        try:
            self.db.table("proactive_logs").insert({
                "user_id": user_id,
                "message": message,
                "sent_at": datetime.now(timezone.utc).isoformat(),
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to log proactive: {e}")

    async def run_cron_job(self) -> Dict[str, Any]:
        """
        تشغيل المهمة الدورية:
        1. جلب جميع المستخدمين النشطين.
        2. التحقق من استحقاق كل مستخدم لرسالة استباقية.
        3. إرسال الإشعار وتسجيله.
        """
        if not self.db:
            return {"status": "error", "message": "No database connection"}

        results = {"sent": 0, "skipped": 0, "errors": 0}

        try:
            # جلب المستخدمين النشطين خلال آخر 24 ساعة
            yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
            res = self.db.table("profiles").select("id, full_name, lang").gte("last_active", yesterday).execute()
            
            if not res.data:
                return {"status": "ok", "message": "No active users found", "results": results}

            for user in res.data:
                user_id = user.get("id")
                user_name = user.get("full_name", "صديقي")
                lang = user.get("lang", "ar")

                if not self.should_send_proactive(user_id):
                    results["skipped"] += 1
                    continue

                message = await self.generate_proactive_message(user_id, user_name, lang)
                if not message:
                    continue

                success = await self.send_notification(user_id, "MyTwin 💜", message)
                if success:
                    await self.log_proactive(user_id, message)
                    results["sent"] += 1
                else:
                    results["errors"] += 1

            return {"status": "ok", "message": "Cron job completed", "results": results}
        except Exception as e:
            logger.error(f"Cron job failed: {e}")
            return {"status": "error", "message": str(e), "results": results}


# كائن عالمي للاستخدام في main.py
proactive_engine = ProactiveEngine()
