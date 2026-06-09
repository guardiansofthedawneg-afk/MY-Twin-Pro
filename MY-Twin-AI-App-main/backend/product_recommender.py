"""
MyTwin – Product Recommender v2.0 (Ad Engine)
محرك توصية المنتجات (إعلانات سياقية) داخل المحادثة.
يكتشف نية الشراء، يجلب أفضل منتج حسب الباقة، ويسجل مرات الظهور والنقرات.
يتكامل مع twin_brain و reasoning_engine.
"""
import os, logging, hashlib, random
from datetime import datetime, timezone
from typing import Optional, Dict, Tuple
from supabase import create_client, Client
from cache import get as cache_get, set as cache_set

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

db: Optional[Client] = None
if SUPABASE_URL and SUPABASE_KEY:
    db = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    logger.warning("Supabase missing – product recommender disabled.")

# ── فئات المنتجات والكلمات المفتاحية ──────────────────
INTENT_KEYWORDS = {
    "health": ["رياضة", "جيم", "صحة", "مكمل", "نادي", "جري", "دايت", "gym", "health", "fitness", "diet", "protein", "vitamin"],
    "productivity": ["عمل", "إنتاجية", "مكتب", "تنظيم", "وقت", "work", "productivity", "time management", "planner", "tool"],
    "learning": ["تعلم", "دورة", "كتاب", "قراءة", "كورس", "تعليم", "course", "book", "learn", "udemy", "skillshare"],
    "entertainment": ["فيلم", "لعبة", "موسيقى", "ترفيه", "نتفلكس", "game", "movie", "music", "netflix", "spotify"],
    "lifestyle": ["عناية", "بشرة", "شعر", "موضة", "ملابس", "skin", "hair", "fashion", "clothes", "perfume"],
}

# ── تواتر التوصيات حسب الباقة (مرة كل X تفاعلات) ─────
RECO_FREQUENCY = {
    "free": 3,       # كل 3 تفاعلات
    "plus": 5,
    "premium": 10,
    "pro": 0,        # لا توصيات
    "yearly": 0,
}

class ProductRecommender:
    def __init__(self):
        # عداد لكل مستخدم (يمكن تخزينه في الكاش)
        self.interaction_counter: Dict[str, int] = {}

    def _get_multi_client(self):
        try:
            from multi_ai import MultiAIClient
            return MultiAIClient()
        except:
            return None

    async def detect_purchase_intent(self, message: str, user_id: Optional[str] = None) -> Optional[str]:
        """
        استخراج نية الشراء باستخدام الكلمات المفتاحية أولاً،
        ثم عبر multi_ai إذا كانت غير واضحة.
        """
        if not message or len(message.strip()) < 10:
            return None

        # مفتاح كاش
        text_hash = hashlib.md5(message.encode()).hexdigest()
        cache_key = f"intent:{text_hash}"
        cached = cache_get(cache_key)
        if cached is not None:
            return cached if cached != "none" else None

        # تحليل محلي
        msg_lower = message.lower()
        for category, keywords in INTENT_KEYWORDS.items():
            if any(kw in msg_lower for kw in keywords):
                cache_set(cache_key, category, 3600)
                return category

        # نموذج احتياطي (باستخدام multi_ai)
        client = self._get_multi_client()
        if client:
            try:
                prompt = f"""
                Analyze this message and extract product category if user shows purchase intent.
                Categories: health, productivity, learning, entertainment, lifestyle, none.
                Return ONLY one word.
                Message: "{message}"
                """
                result = await client.get_best_reply(prompt, task="deep_reasoning")
                if result:
                    result = result.strip().lower()
                    for cat in ["health", "productivity", "learning", "entertainment", "lifestyle"]:
                        if cat in result:
                            cache_set(cache_key, cat, 3600)
                            return cat
                    cache_set(cache_key, "none", 3600)
                    return None
            except Exception as e:
                logger.warning(f"Intent detection via AI failed: {e}")

        cache_set(cache_key, "none", 3600)
        return None

    def should_recommend(self, user_id: str, tier: str) -> bool:
        """يقرر ما إذا كان يجب عرض توصية بناءً على الباقة وعدد التفاعلات."""
        freq = RECO_FREQUENCY.get(tier, 999)
        if freq == 0:
            return False
        # الحصول على عداد التفاعلات الحالي (استخدم الكاش)
        key = f"rec_counter:{user_id}"
        count = cache_get(key) or 0
        count += 1
        cache_set(key, count, 86400)
        if count % freq == 0:
            return True
        return False

    async def get_best_product(self, category: str, tier: str = "free") -> Optional[Dict]:
        """
        جلب أفضل منتج من قاعدة البيانات حسب الفئة والباقة.
        يُفضل المنتجات ذات الأولوية الأعلى (priority) ونسبة العمولة الأعلى.
        """
        if not db:
            return None

        try:
            # للمستخدمين المميزين: منتجات ذات جودة أعلى، أقل ترويجًا
            if tier in ["premium", "pro", "yearly"]:
                # يمكن تخصيصه لاحقًا
                pass

            result = (
                db.table("products")
                .select("*")
                .eq("category", category)
                .eq("active", True)
                .order("priority", desc=True)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            return result.data[0] if result.data else None

        except Exception as e:
            logger.error(f"Error fetching product: {e}")
            return None

    def format_suggestion(self, product: Dict, lang: str = "ar") -> str:
        """تنسيق التوصية بشكل جذاب."""
        name = product.get("name", "منتج")
        desc = product.get("description", "")
        link = product.get("affiliate_link", "#")
        price = product.get("price", "")
        rating = product.get("rating", "")

        stars = "⭐" * int(float(rating)) if rating else ""
        price_str = f"💰 {price}" if price else ""

        if lang == "ar":
            return (
                f"\n\n💡 *اكتشاف قد يعجبك*\n"
                f"**{name}** {stars}\n"
                f"_{desc}_\n"
                f"{price_str}\n"
                f"🔗 [تسوق الآن]({link})"
            )
        else:
            return (
                f"\n\n💡 *You might like*\n"
                f"**{name}** {stars}\n"
                f"_{desc}_\n"
                f"{price_str}\n"
                f"🔗 [Shop now]({link})"
            )

    def log_impression(self, user_id: str, product_id: str, message_id: str = "") -> bool:
        """تسجيل مشاهدة التوصية."""
        if not db: return False
        try:
            db.table("product_impressions").insert({
                "user_id": user_id,
                "product_id": product_id,
                "message_id": message_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }).execute()
            return True
        except Exception as e:
            logger.error(f"Impression log error: {e}")
            return False

    # ستُستدعى من الواجهة عند النقر على الرابط
    def log_click(self, user_id: str, product_id: str) -> bool:
        """تسجيل نقرة على الرابط التابع."""
        if not db: return False
        try:
            db.table("product_clicks").insert({
                "user_id": user_id,
                "product_id": product_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }).execute()
            return True
        except Exception as e:
            logger.error(f"Click log error: {e}")
            return False

    async def process_and_attach(self, user_id: str, message: str, reply: str,
                                 tier: str, lang: str = "ar") -> str:
        """
        الوظيفة الكاملة: تكتشف النية، تضمن التوصية إن كان مسموحاً،
        وتُسجل الظهور.
        """
        # لا توصيات في حالات الطوارئ
        if "🆘" in reply or "safety_alert" in reply:
            return reply

        # تحقق من إمكانية العرض
        if not self.should_recommend(user_id, tier):
            return reply

        # استخراج النية
        category = await self.detect_purchase_intent(message, user_id)
        if not category:
            return reply

        # جلب منتج
        product = await self.get_best_product(category, tier)
        if not product:
            return reply

        # تنسيق وإضافة
        suggestion = self.format_suggestion(product, lang)
        final_reply = reply + suggestion

        # تسجيل الظهور
        self.log_impression(user_id, product["id"], str(hashlib.md5(message.encode()).hexdigest())[:10])

        return final_reply

# ── نسخة عالمية ─────────────────────────────────────
product_recommender = ProductRecommender()

print("✅ Product Recommender v2.0 | متكامل مع الباقة والمحادثة")
