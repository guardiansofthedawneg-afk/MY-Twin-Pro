"""
MyTwin – Memory Engine v2.0
يدعم:
- استرجاع الذكريات (نصية + عاطفية)
- تخزين الذكريات
- تلخيص تلقائي للمحادثات الطويلة وتخزينها كسياق
"""
import os
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from supabase import create_client, Client

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.warning("Supabase credentials missing. Memory engine will use fallback.")

db: Optional[Client] = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

# ========== استرجاع الذكريات ==========

def retrieve(uid: str, query: str, days: int = 7, lim: int = 5, emotion_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    استرجاع الذكريات من Supabase.
    إذا كان هناك مرشح عاطفي، نبحث عن ذكريات ذات صلة عاطفية.
    """
    if not db:
        return []
    try:
        # البحث الأساسي
        req = db.table("memories").select("*").eq("user_id", uid).order("created_at", desc=True).limit(lim)
        
        if emotion_filter:
            # فلترة حسب المشاعر
            req = req.eq("emotion", emotion_filter)
        
        res = req.execute()
        mems = res.data or []
        
        # إضافة الملخصات المخزنة كسياق إضافي
        summaries = get_summaries(uid)
        if summaries:
            # تحويل الملخصات إلى صيغة مشابهة للذكريات
            for s in summaries:
                mems.append({
                    "content": s["summary"],
                    "emotion": "summary",
                    "created_at": s["created_at"],
                })
        
        return mems[:lim]
    except Exception as e:
        logger.error(f"Memory retrieval error: {e}")
        return []

def store_mem(uid: str, content: str, importance: float = 0.5, emotion: str = "neutral") -> None:
    """تخزين ذكرى جديدة"""
    if not db:
        return
    try:
        db.table("memories").insert({
            "user_id": uid,
            "content": content,
            "importance": importance,
            "emotion": emotion,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception as e:
        logger.error(f"Memory store error: {e}")

# ========== التلخيص التلقائي ==========

SUMMARIZE_THRESHOLD = 20  # عدد الرسائل قبل التلخيص

async def check_and_summarize(uid: str, chat_history: List[Dict[str, str]], twin_name: str) -> None:
    """
    إذا تجاوزت المحادثة الحد المحدد، قم بتلخيصها وتخزين الملخص.
    تُستدعى هذه الدالة من main.py بعد كل رد.
    """
    if len(chat_history) < SUMMARIZE_THRESHOLD:
        return
    
    try:
        # استدعاء نموذج AI لعمل التلخيص
        from twin_brain import TwinBrain
        brain = TwinBrain()
        
        # تجميع نص المحادثة
        conversation = "\n".join([
            f"{'المستخدم' if m['role'] == 'user' else twin_name}: {m['content']}"
            for m in chat_history[-SUMMARIZE_THRESHOLD:]
        ])
        
        # طلب التلخيص (نستخدم نفس النموذج السريع)
        summary = await brain.multi.get_best_reply(
            f"لخص هذه المحادثة في 3-5 جمل بالعربية، مع التركيز على أهم المواضيع والمشاعر:\n\n{conversation}",
            task="general"
        )
        
        if summary:
            store_summary(uid, summary)
            logger.info(f"✅ Chat summarized for user {uid}")
    except Exception as e:
        logger.error(f"Summarization error: {e}")

def store_summary(uid: str, summary: str) -> None:
    """تخزين ملخص محادثة في جدول خاص"""
    if not db:
        return
    try:
        db.table("chat_summaries").insert({
            "user_id": uid,
            "summary": summary,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception as e:
        logger.error(f"Summary store error: {e}")

def get_summaries(uid: str, limit: int = 3) -> List[Dict[str, Any]]:
    """جلب آخر الملخصات المخزنة"""
    if not db:
        return []
    try:
        res = db.table("chat_summaries").select("*").eq("user_id", uid).order("created_at", desc=True).limit(limit).execute()
        return res.data or []
    except Exception as e:
        logger.error(f"Summary retrieval error: {e}")
        return []
