"""
MyTwin – Memory Engine v2.0 (Memory Graph)
- تصنيف الذكريات: Core, Emotional, Preference, Relationship
- تخزين في Supabase + استرجاع ذكي
- يغذي الـ Prompt بالسياق المناسب
"""
import os, logging, json, asyncio
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from supabase import create_client, Client
import google.generativeai as genai

logger = logging.getLogger("memory_engine")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")

db: Optional[Client] = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

# ========== تصنيف الذكريات ==========
MEMORY_TYPES = {
    "core": "معلومة أساسية عن المستخدم (اسم، مهنة، عمر، مكان إقامة)",
    "emotional": "لحظة عاطفية قوية (فرح، حزن، خوف، حب)",
    "preference": "شيء يحبه أو يكرهه المستخدم (طعام، موسيقى، هوايات)",
    "relationship": "معلومة عن علاقة المستخدم مع شخص آخر (أم، أب، صديق)",
}

async def classify_memory(text: str) -> str:
    """استخدم Gemini لتصنيف نوع الذاكرة"""
    try:
        genai.configure(api_key=GEMINI_KEY)
        model = genai.GenerativeModel("gemini-2.0-flash")
        prompt = f"""صنف هذه الذكرى إلى واحدة من: {', '.join(MEMORY_TYPES.keys())}
        أجب بنوع واحد فقط (core, emotional, preference, relationship).
        الذكرى: "{text}"
        النوع:"""
        loop = asyncio.get_running_loop()
        resp = await loop.run_in_executor(None, lambda: model.generate_content(prompt))
        if resp and resp.text:
            result = resp.text.strip().lower()
            if result in MEMORY_TYPES:
                return result
    except Exception as e:
        logger.warning(f"Memory classification failed: {e}")
    return "core"  # افتراضي

# ========== تخزين الذكريات ==========
async def store_mem(uid: str, content: str, importance: float = 0.5, emotion: str = "neutral"):
    if not db:
        return
    try:
        # تصنيف الذاكرة
        mem_type = await classify_memory(content)
        db.table("memories").insert({
            "user_id": uid,
            "content": content,
            "importance": importance,
            "emotion": emotion,
            "memory_type": mem_type,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
        logger.info(f"✅ Memory stored [{mem_type}]: {content[:50]}...")
    except Exception as e:
        logger.error(f"Memory store error: {e}")

# ========== استرجاع الذكريات حسب النوع ==========
async def retrieve(uid: str, query: str, days: int = 30, lim: int = 5, memory_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """استرجاع الذكريات مع إمكانية التصفية حسب النوع"""
    if not db:
        return []
    try:
        req = db.table("memories").select("*").eq("user_id", uid).order("created_at", desc=True).limit(lim)
        if memory_type:
            req = req.eq("memory_type", memory_type)
        res = req.execute()
        return res.data or []
    except Exception as e:
        logger.error(f"Memory retrieval error: {e}")
        return []

# ========== استرجاع للـ Prompt ==========
async def get_memory_context(uid: str) -> str:
    """
    يبني سياقاً كاملاً للـ Prompt من جميع أنواع الذكريات.
    """
    if not db:
        return ""
    try:
        core = await retrieve(uid, "", memory_type="core", lim=3)
        emotional = await retrieve(uid, "", memory_type="emotional", lim=2)
        preferences = await retrieve(uid, "", memory_type="preference", lim=3)
        relationships = await retrieve(uid, "", memory_type="relationship", lim=2)

        context = ""
        if core:
            context += "معلومات أساسية عن المستخدم: " + " | ".join([m["content"] for m in core]) + "\n"
        if emotional:
            context += "لحظات عاطفية مهمة: " + " | ".join([m["content"] for m in emotional]) + "\n"
        if preferences:
            context += "تفضيلات المستخدم: " + " | ".join([m["content"] for m in preferences]) + "\n"
        if relationships:
            context += "علاقات مهمة: " + " | ".join([m["content"] for m in relationships]) + "\n"
        return context
    except Exception as e:
        logger.error(f"Memory context error: {e}")
        return ""

# ========== تلخيص تلقائي ==========
async def check_and_summarize(uid: str, chat_history: List[Dict[str, str]], twin_name: str):
    """إذا تجاوزت المحادثة 20 رسالة، لخصها وخزنها كذاكرة"""
    if len(chat_history) < 20:
        return
    try:
        genai.configure(api_key=GEMINI_KEY)
        model = genai.GenerativeModel("gemini-2.0-flash")
        conversation = "\n".join([f"{'المستخدم' if m['role']=='user' else twin_name}: {m['content']}" for m in chat_history[-20:]])
        prompt = f"لخص هذه المحادثة في جملتين بالعربية، مع التركيز على أهم المواضيع والمشاعر:\n{conversation}"
        loop = asyncio.get_running_loop()
        summary = await loop.run_in_executor(None, lambda: model.generate_content(prompt))
        if summary and summary.text:
            await store_mem(uid, summary.text.strip(), importance=0.7, emotion="neutral")
            logger.info(f"✅ Chat summarized for user {uid}")
    except Exception as e:
        logger.error(f"Summarization error: {e}")

# ========== دوال للتوافق مع الكود القديم ==========
class DeepMemorySystem:
    def retrieve(self, uid: str, query: str, days: int = 30, lim: int = 5, emotion_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """للاستدعاء المتزامن (Sync)"""
        if not db:
            return []
        try:
            req = db.table("memories").select("*").eq("user_id", uid).order("created_at", desc=True).limit(lim)
            if emotion_filter:
                req = req.eq("emotion", emotion_filter)
            res = req.execute()
            return res.data or []
        except:
            return []
