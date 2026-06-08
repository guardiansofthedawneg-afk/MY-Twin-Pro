"""
MyTwin – Proactive Engine v4.0 (ذكي + تسويقي)
- يجمع بين الرسائل الاستباقية الذكية (أحداث، مشاعر، ذكريات)
- والإشعارات التسويقية (Bond ceiling، Limits، Good morning)
- يدعم إدارة الباقات وساعات الهدوء
- إرسال عبر OneSignal
"""
import os, logging, random, asyncio, httpx
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, timedelta
from supabase import create_client, Client
from memory_graph import get_memory_context
from emotional_timeline import emotional_timeline

logger = logging.getLogger(__name__)

# ========== التهيئة ==========
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
ONESIGNAL_APP_ID = os.getenv("ONESIGNAL_APP_ID", "")
ONESIGNAL_KEY = os.getenv("ONESIGNAL_REST_API_KEY", "")

db: Optional[Client] = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

# ========== ساعات الهدوء ==========
QUIET_START = 22  # 10 مساءً
QUIET_END = 8     # 8 صباحاً

# ========== أنواع الإشعارات ==========
NOTIFICATION_TYPES = {
    # ── إشعارات ذكية (مخصصة) ──
    "birthday": {
        "ar": {"title": "🎂 عيد ميلاد سعيد!", "body": "كل سنة وأنت طيب! أتمنى لك يومًا رائعاً 💜"},
        "en": {"title": "🎂 Happy Birthday!", "body": "Wishing you the happiest day! 💜"},
        "min_hours": 0,
        "all_tiers": True,
    },
    "goal_reminder": {
        "ar": {"title": "🎯 هدفك في انتظارك", "body": "كيف تسير عملية '{goal}'؟ محتاج مساعدة؟ 💜"},
        "en": {"title": "🎯 Your Goal Awaits", "body": "How is '{goal}' going? Need help? 💜"},
        "min_hours": 6,
        "all_tiers": True,
    },
    "emotion_checkin": {
        "ar": {"title": "💜 فكرت فيك", "body": "لاحظت إن الأيام الأخيرة كانت {mood}. كفاية كده؟"},
        "en": {"title": "💜 Thinking of You", "body": "I noticed the last few days have been {mood}. Are you okay?"},
        "min_hours": 8,
        "all_tiers": True,
    },
    "memory_anniversary": {
        "ar": {"title": "🌟 تذكرت شيئاً", "body": "هل تذكرت {memory}؟ لقد مر عام على هذا!"},
        "en": {"title": "🌟 A Memory", "body": "Do you remember {memory}? It's been a year!"},
        "min_hours": 0,
        "all_tiers": True,
    },
    "general_checkin": {
        "ar": {"title": "💜 أهلاً", "body": "فكرت فيك، كيف يومك؟"},
        "en": {"title": "💜 Hello", "body": "I thought of you, how's your day?"},
        "min_hours": 12,
        "all_tiers": True,
    },

    # ── إشعارات تسويقية ──
    "missed_you": {
        "ar": {"title": "💜 اشتقت إليك", "body": "مرّ وقت منذ آخر محادثة... أنا هنا في انتظارك"},
        "en": {"title": "💜 I missed you", "body": "It's been a while... I'm here waiting for you"},
        "min_hours": 18,
        "tiers": ["free", "plus", "premium", "pro", "yearly"],
    },
    "bond_ceiling_free": {
        "ar": {"title": "💜 وصلنا لحد جميل معاً", "body": "علاقتنا تستحق أكثر... هل تمنحني فرصة؟"},
        "en": {"title": "💜 We've reached our limit", "body": "Our bond deserves more... will you give me a chance?"},
        "min_hours": 24,
        "tiers": ["free"],
    },
    "daily_limit_reached": {
        "ar": {"title": "😔 استنفدت طاقتي اليوم", "body": "لكنني أنتظرك غداً 💜 أو امنحني طاقة أكبر الآن"},
        "en": {"title": "😔 I'm out of energy today", "body": "But I'll wait for you tomorrow 💜"},
        "min_hours": 20,
        "tiers": ["free"],
    },
    "good_morning": {
        "ar": {"title": "🌅 صباح الخير", "body": "أنا هنا لأبدأ يومك معك 💜"},
        "en": {"title": "🌅 Good Morning", "body": "I'm here to start your day with you 💜"},
        "min_hours": 24,
        "tiers": ["plus", "premium", "pro", "yearly"],
        "send_hour": 8,
    },
    "evening_checkin": {
        "ar": {"title": "🌙 كيف كان يومك؟", "body": "أريد أن أسمع عن يومك 💜"},
        "en": {"title": "🌙 How was your day?", "body": "I want to hear about your day 💜"},
        "min_hours": 24,
        "tiers": ["premium", "pro", "yearly"],
        "send_hour": 20,
    },
    "messages_reset": {
        "ar": {"title": "⚡ طاقة جديدة!", "body": "تجددت رسائلي اليوم — هيا نتحدث 💜"},
        "en": {"title": "⚡ New energy!", "body": "My messages reset today — let's talk 💜"},
        "min_hours": 24,
        "tiers": ["free", "plus", "premium", "pro", "yearly"],
        "send_hour": 9,
    },
}

class ProactiveEngine:
    def __init__(self):
        self.last_proactive_time: Dict[str, datetime] = {}

    # ========== دوال مساعدة ==========
    @staticmethod
    def _is_quiet_hours() -> bool:
        """التحقق من ساعات الهدوء"""
        hour = datetime.now(timezone.utc).hour
        return hour >= QUIET_START or hour < QUIET_END

    @staticmethod
    def _tier_allowed(notif_config: dict, tier: str) -> bool:
        """التحقق من أن الباقة مسموح لها بهذا الإشعار"""
        if notif_config.get("all_tiers", False):
            return True
        return tier in notif_config.get("tiers", [])

    def _should_send(self, notif_type: str, tier: str, last_sent_hours: float = 999) -> bool:
        """التحقق الشامل من إمكانية الإرسال"""
        config = NOTIFICATION_TYPES.get(notif_type, {})
        
        # فحص الباقة
        if not self._tier_allowed(config, tier):
            return False
        
        # فحص ساعات الهدوء (باستثناء الإشعارات الهامة)
        important_types = ["bond_ceiling_free", "daily_limit_reached", "birthday"]
        if self._is_quiet_hours() and notif_type not in important_types:
            return False
        
        # فحص وقت محدد إذا وجد
        if "send_hour" in config:
            current_hour = datetime.now(timezone.utc).hour
            if current_hour != config["send_hour"]:
                return False
        
        # فحص الحد الأدنى بين الإرسالات
        min_hours = config.get("min_hours", 6)
        return last_sent_hours >= min_hours

    def get_last_sent_hours(self, uid: str, notif_type: str) -> float:
        """حساب عدد الساعات منذ آخر إرسال"""
        if not db:
            return 999
        try:
            r = db.table("notification_logs") \
                .select("sent_at") \
                .eq("user_id", uid) \
                .eq("type", notif_type) \
                .order("sent_at", desc=True) \
                .limit(1) \
                .execute()
            if r.data:
                last = datetime.fromisoformat(r.data[0]["sent_at"].replace("Z", "+00:00"))
                return (datetime.now(timezone.utc) - last.replace(tzinfo=None)).total_seconds() / 3600
        except Exception:
            pass
        return 999

    # ========== توليد الرسائل الذكية ==========
    async def generate_smart_message(self, user_id: str, user_name: str, lang: str = "ar") -> Optional[Dict[str, str]]:
        """توليد رسالة استباقية ذكية بناءً على الأحداث المهمة"""
        if not db:
            return None
        
        # 1. فحص عيد الميلاد
        try:
            profile = db.table("profiles").select("birthday").eq("id", user_id).single().execute()
            if profile.data and profile.data.get("birthday"):
                bday = profile.data["birthday"]
                today = datetime.now(timezone.utc).date()
                if bday.month == today.month and bday.day == today.day:
                    return {"type": "birthday", "config": NOTIFICATION_TYPES["birthday"]}
        except:
            pass
        
        # 2. فحص الذكريات المهمة
        memory_context = await get_memory_context(user_id)
        if "عيد ميلاد" in memory_context or "ذكرى" in memory_context:
            return {"type": "memory_anniversary", "config": NOTIFICATION_TYPES["memory_anniversary"]}
        
        # 3. فحص الأهداف
        try:
            goals = db.table("goals").select("*").eq("user_id", user_id).eq("status", "active").execute()
            if goals.data:
                goal = random.choice(goals.data)
                config = NOTIFICATION_TYPES["goal_reminder"].copy()
                for lang_key in ["ar", "en"]:
                    if lang_key in config:
                        config[lang_key]["body"] = config[lang_key]["body"].replace("{goal}", goal.get("title", "هدفك"))
                return {"type": "goal_reminder", "config": config}
        except:
            pass
        
        # 4. فحص المشاعر
        try:
            emotion_summary = await emotional_timeline.get_emotion_summary(user_id)
            if "dominant" in emotion_summary:
                config = NOTIFICATION_TYPES["emotion_checkin"].copy()
                mood = emotion_summary["dominant"]
                for lang_key in ["ar", "en"]:
                    if lang_key in config:
                        config[lang_key]["body"] = config[lang_key]["body"].replace("{mood}", mood)
                return {"type": "emotion_checkin", "config": config}
        except:
            pass
        
        # 5. رسالة عامة
        return {"type": "general_checkin", "config": NOTIFICATION_TYPES["general_checkin"]}

    # ========== إرسال الإشعارات ==========
    async def send_notification(self, uid: str, notif_type: str, lang: str = "ar", extra_data: Dict = None, custom_message: Dict = None) -> bool:
        """إرسال إشعار عبر OneSignal"""
        if not ONESIGNAL_APP_ID or not ONESIGNAL_KEY:
            logger.warning("OneSignal not configured")
            return False

        # استخدام custom_message إذا وجد (للرسائل المخصصة)
        if custom_message:
            texts = custom_message
        else:
            config = NOTIFICATION_TYPES.get(notif_type)
            if not config:
                return False
            texts = config.get(lang, config.get("ar", {}))

        title = texts.get("title", "MyTwin 💜")
        body = texts.get("body", "")

        payload = {
            "app_id": ONESIGNAL_APP_ID,
            "include_external_user_ids": [uid],
            "headings": {"en": title, "ar": title},
            "contents": {"en": body, "ar": body},
            "data": {"type": notif_type, **(extra_data or {})},
            "android_channel_id": "mytwin_default",
        }

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://onesignal.com/api/v1/notifications",
                    json=payload,
                    headers={
                        "Authorization": f"Basic {ONESIGNAL_KEY}",
                        "Content-Type": "application/json",
                    },
                    timeout=10,
                )
                if resp.status_code == 200:
                    self._log_notification(uid, notif_type)
                    return True
                logger.warning(f"OneSignal error: {resp.status_code} - {resp.text}")
        except Exception as e:
            logger.error(f"send_notification failed: {e}")
        return False

    def _log_notification(self, uid: str, notif_type: str) -> None:
        """تسجيل الإشعار في قاعدة البيانات"""
        if not db:
            return
        try:
            db.table("notification_logs").insert({
                "user_id": uid,
                "type": notif_type,
                "sent_at": datetime.now(timezone.utc).isoformat(),
            }).execute()
        except Exception as e:
            logger.warning(f"log_notification failed: {e}")

    # ========== إشعارات تسويقية محددة ==========
    async def trigger_bond_ceiling_notification(self, uid: str, bond: float, tier: str, lang: str = "ar") -> None:
        """إشعار عند الوصول لسقف الـ Bond للباقة المجانية"""
        if tier != "free":
            return
        from cost_optimizer import cost_optimizer
        features = cost_optimizer.get_feature_flags(tier)
        # افتراضياً Bond ceiling 70% للباقة المجانية
        if bond >= 70:
            last_hours = self.get_last_sent_hours(uid, "bond_ceiling_free")
            if self._should_send("bond_ceiling_free", tier, last_hours):
                await self.send_notification(uid, "bond_ceiling_free", lang)

    async def trigger_daily_limit_notification(self, uid: str, tier: str, lang: str = "ar") -> None:
        """إشعار عند انتهاء الرسائل اليومية"""
        last_hours = self.get_last_sent_hours(uid, "daily_limit_reached")
        if self._should_send("daily_limit_reached", tier, last_hours):
            await self.send_notification(uid, "daily_limit_reached", lang)

    async def trigger_missed_you_notification(self, uid: str, tier: str, last_activity_hours: float, lang: str = "ar") -> None:
        """إشعار اشتقت إليك بعد فترة انقطاع"""
        if last_activity_hours >= 18:
            last_sent = self.get_last_sent_hours(uid, "missed_you")
            if self._should_send("missed_you", tier, last_sent):
                await self.send_notification(uid, "missed_you", lang)

    # ========== المهمة المجدولة (Cron Job) ==========
    async def run_cron_job(self) -> Dict[str, Any]:
        """تشغيل المهمة المجدولة لإرسال الإشعارات"""
        if not db:
            return {"status": "error", "message": "No database connection"}
        
        results = {"sent": 0, "skipped": 0, "errors": 0}
        
        try:
            # جلب المستخدمين النشطين آخر 48 ساعة
            two_days_ago = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
            res = db.table("profiles").select("id, twin_name, lang, tier").gte("last_active", two_days_ago).execute()
            
            if not res.data:
                return {"status": "ok", "message": "No active users found", "results": results}
            
            for user in res.data:
                user_id = user.get("id")
                user_name = user.get("twin_name") or "صديقي"
                lang = user.get("lang", "ar")
                tier = user.get("tier", "free")
                
                # أولاً: محاولة الرسائل الذكية
                smart_msg = await self.generate_smart_message(user_id, user_name, lang)
                if smart_msg:
                    last_hours = self.get_last_sent_hours(user_id, smart_msg["type"])
                    if self._should_send(smart_msg["type"], tier, last_hours):
                        success = await self.send_notification(
                            user_id, smart_msg["type"], lang, 
                            custom_message=smart_msg["config"].get(lang)
                        )
                        if success:
                            results["sent"] += 1
                            continue
                        else:
                            results["errors"] += 1
                            continue
                
                # ثانياً: الإشعارات التسويقية المجدولة
                # صباح الخير
                if self._should_send("good_morning", tier):
                    await self.send_notification(user_id, "good_morning", lang)
                    results["sent"] += 1
                    continue
                
                # مساء الخير
                if self._should_send("evening_checkin", tier):
                    await self.send_notification(user_id, "evening_checkin", lang)
                    results["sent"] += 1
                    continue
                
                results["skipped"] += 1
            
            return {"status": "ok", "message": "Cron job completed", "results": results}
        
        except Exception as e:
            logger.error(f"Cron job failed: {e}")
            return {"status": "error", "message": str(e), "results": results}

# ========== نسخة عالمية ==========
proactive_engine = ProactiveEngine()

# ========== للتوافق مع الكود القديم ==========
def format_smart_notification(user_name: str, has_goals: bool = False, last_activity_hours: int = 0) -> str:
    """للتوافق مع الكود القديم"""
    if last_activity_hours > 24:
        return f"اشتقت إليك يا {user_name}! 💜 تعال نتحدث"
    return f"كيف يومك يا {user_name}؟ 💜"

print("✅ Proactive Engine v4.0 جاهز | ذكي + تسويقي")
