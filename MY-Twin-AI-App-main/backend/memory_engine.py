"""MyTwin – Memory Engine v3.0 (Semantic + Personal Knowledge Graph)
- تصنيف الذكريات: Core, Emotional, Preference, Relationship
- تخزين في Supabase + استرجاع ذكي
- يغذي الـ Prompt بالسياق المناسب
- متكامل مع personal_knowledge_graph
- يستخدم Groq بدلاً من Gemini (لتقليل الاستهلاك)
"""
import os, logging, json, asyncio
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from supabase import create_client, Client
from groq_helper import call_groq

logger = logging.getLogger("memory_engine")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

db: Optional[Client] = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

# ========== تصنيف الذكريات ==========
MEMORY_TYPES = {
    "core": "معلومة أساسية عن المستخدم (اسم، مهنة، عمر، مكان إقامة)",
    "emotional": "لحظة عاطفية قوية (فرح، حزن، خوف، حب)",
    "preference": "شيء يحبه أو يكرهه المستخدم (طعام، موسيقى، هوايات)",
    "relationship": "معلومة عن علاقة المستخدم مع شخص آخر (أم، أب، صديق)",
}

async def classify_memory(text: str) -> str:
    """استخدم Groq لتصنيف نوع الذاكرة"""
    try:
        prompt = f"""صنف هذه الذكرى إلى واحدة من: {', '.join(MEMORY_TYPES.keys())}
        أجب بنوع واحد فقط (core, emotional, preference, relationship).
        الذكرى: "{text}"
        النوع:"""
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(None, call_groq, prompt)
        if result:
            resp_text = result.strip().lower()
            if resp_text in MEMORY_TYPES:
                return resp_text
    except Exception as e:
        logger.warning(f"Memory classification failed: {e}")
    return "core"

# ========== تخزين الذكريات ==========
async def store_mem(uid: str, content: str, importance: float = 0.5, emotion: str = "neutral"):
    if not db:
        return
    try:
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
async def retrieve(uid: str, query: str = "", days: int = 30, lim: int = 5, memory_type: Optional[str] = None) -> List[Dict[str, Any]]:
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

# ========== استرجاع للـ Prompt (معزز بالمعرفة الشخصية) ==========
async def get_memory_context(uid: str) -> str:
    if not db:
        return ""
    try:
        core = await retrieve(uid, memory_type="core", lim=3)
        emotional = await retrieve(uid, memory_type="emotional", lim=2)
        preferences = await retrieve(uid, memory_type="preference", lim=3)
        relationships = await retrieve(uid, memory_type="relationship", lim=2)

        context = ""
        if core:
            context += "معلومات أساسية عن المستخدم: " + " | ".join([m["content"] for m in core]) + "\n"
        if emotional:
            context += "لحظات عاطفية مهمة: " + " | ".join([m["content"] for m in emotional]) + "\n"
        if preferences:
            context += "تفضيلات المستخدم: " + " | ".join([m["content"] for m in preferences]) + "\n"
        if relationships:
            context += "علاقات مهمة: " + " | ".join([m["content"] for m in relationships]) + "\n"

        # --- دمج المعرفة الشخصية من Personal Knowledge Graph ---
        try:
            from personal_knowledge_graph import get_knowledge_context
            knowledge = await get_knowledge_context(uid)
            if knowledge:
                context += "معرفة شخصية: " + knowledge + "\n"
        except:
            pass

        return context
    except Exception as e:
        logger.error(f"Memory context error: {e}")
        return ""

# ========== تلخيص تلقائي ==========
async def check_and_summarize(uid: str, chat_history: List[Dict[str, str]], twin_name: str):
    if len(chat_history) < 20:
        return
    try:
        conversation = "\n".join([f"{'المستخدم' if m['role']=='user' else twin_name}: {m['content']}" for m in chat_history[-20:]])
        prompt = f"لخص هذه المحادثة في جملتين بالعربية، مع التركيز على أهم المواضيع والمشاعر:\n{conversation}"
        loop = asyncio.get_running_loop()
        summary = await loop.run_in_executor(None, call_groq, prompt)
        if summary:
            await store_mem(uid, summary.strip(), importance=0.7, emotion="neutral")
            logger.info(f"✅ Chat summarized for user {uid}")
    except Exception as e:
        logger.error(f"Summarization error: {e}")

# ========== دوال للتوافق ==========
class DeepMemorySystem:
    def retrieve(self, uid: str, query: str, days: int = 30, lim: int = 5, emotion_filter: Optional[str] = None) -> List[Dict[str, Any]]:
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
