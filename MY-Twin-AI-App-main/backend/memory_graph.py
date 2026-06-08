"""
MyTwin – Memory Graph v1.0 (Graph-Based Memory System)
- ذاكرة متقدمة تعتمد على Graph حقيقي.
- تقوم بإنشاء وتحديث العلاقات بين الكيانات (أشخاص، أماكن، تفضيلات، أهداف).
- تستخدم للاسترجاع السياقي الذكي (Smart Context Retrieval).
- متوافقة مع `twin_brain.py` و `prompt_builder.py`.
"""
import os, logging, json, asyncio, hashlib
from typing import Optional, List, Dict, Any, Set, Tuple
from datetime import datetime, timezone
from supabase import create_client, Client
from groq_helper import call_groq

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
db: Optional[Client] = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

# ========== جداول الكيانات والعلاقات ==========
async def init_tables():
    """إنشاء جداول الكيانات والعلاقات إذا لم تكن موجودة."""
    if not db:
        return
    # سيتم إنشاء الجداول في Supabase يدويًا.

# ========== دالة مساعدة لتوليد ID للكيانات ==========
def _entity_id(content: str, entity_type: str) -> str:
    """توليد ID فريد للكيان بناءً على المحتوى والنوع."""
    return hashlib.sha256(f"{content}_{entity_type}".encode()).hexdigest()[:16]

# ========== استخراج الكيانات ==========
async def extract_entities(user_id: str, message: str, lang: str = "ar") -> List[Dict[str, Any]]:
    """
    استخراج الكيانات من رسالة المستخدم وتخزينها في Graph.
    - تحليل النص باستخدام Groq.
    - تخزين الكيانات في `knowledge_entities`.
    - إنشاء علاقات بين الكيانات والمستخدم.
    """
    if not db or not message.strip():
        return []
    prompt = f"""استخرج الكيانات التالية من هذه الرسالة وأعد ONLY JSON:
{{
  "people": ["اسم شخص", "علاقته (مثل زوجة، أخ، صديق)"],
  "places": ["اسم مكان"],
  "preferences": ["شيء يحبه أو يكرهه"],
  "goals": ["هدف أو طموح"],
  "habits": ["عادة أو روتين"],
  "facts": ["معلومة عامة عن المستخدم"]
}}
الرسالة: "{message}"
JSON:"""
    try:
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(None, call_groq, prompt)
        if result:
            raw = result.strip()
            if raw.startswith("```json"): raw = raw.split("```json")[1].split("```")[0].strip()
            elif raw.startswith("```"): raw = raw.split("```")[1].split("```")[0].strip()
            entities = json.loads(raw)
            stored_entities = []
            
            # تخزين الكيانات وربطها بالمستخدم
            for key, values in entities.items():
                entity_type = key.rstrip('s')  # people -> person
                for value in values:
                    # التحقق من وجود الكيان مسبقًا
                    eid = _entity_id(value, entity_type)
                    # تخزين الكيان
                    res = db.table("knowledge_entities").upsert({
                        "id": eid,
                        "user_id": user_id,
                        "entity_type": entity_type,
                        "content": value,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }, on_conflict="id").execute()
                    if res.data:
                        stored_entities.append(res.data[0])
                    # إنشاء علاقة "has_entity" بين المستخدم والكيان
                    db.table("entity_relations").upsert({
                        "user_id": user_id,
                        "from_entity": user_id,
                        "to_entity": eid,
                        "relation_type": "has_entity",
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }, on_conflict=["user_id", "to_entity", "relation_type"]).execute()
            
            logger.info(f"✅ Extracted and stored {len(stored_entities)} entities for {user_id}")
            return stored_entities
    except Exception as e:
        logger.warning(f"Entity extraction failed: {e}")
    return []

# ========== تصنيف الذكريات ==========
MEMORY_TYPES = {
    "core": "معلومة أساسية عن المستخدم (اسم، مهنة، عمر، مكان إقامة)",
    "emotional": "لحظة عاطفية قوية (فرح، حزن، خوف، حب)",
    "preference": "شيء يحبه أو يكرهه المستخدم (طعام، موسيقى، هوايات)",
    "relationship": "معلومة عن علاقة المستخدم مع شخص آخر (أم، أب، صديق)",
}

async def classify_memory(text: str) -> str:
    """تصنيف الذاكرة باستخدام Groq."""
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
    """تخزين ذكرى جديدة وربطها بالكيانات الموجودة."""
    if not db:
        return
    try:
        mem_type = await classify_memory(content)
        # تخزين الذاكرة
        res = db.table("memories").insert({
            "user_id": uid,
            "content": content,
            "importance": importance,
            "emotion": emotion,
            "memory_type": mem_type,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
        if res.data:
            memory_id = res.data[0]["id"]
            # ربط الذاكرة بالكيانات الموجودة
            entities = db.table("knowledge_entities").select("id").eq("user_id", uid).execute()
            for e in entities.data:
                db.table("entity_relations").insert({
                    "user_id": uid,
                    "from_entity": memory_id,
                    "to_entity": e["id"],
                    "relation_type": "related_to",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }).execute()
            logger.info(f"✅ Memory stored [{mem_type}]: {content[:50]}...")
    except Exception as e:
        logger.error(f"Memory store error: {e}")

# ========== استرجاع الذكريات (معزز) ==========
async def retrieve(uid: str, query: str = "", days: int = 30, lim: int = 5, memory_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """استرجاع الذكريات مع إمكانية التصفية حسب النوع."""
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

# ========== استرجاع السياق المركب (Graph-based) ==========
async def get_memory_context(user_id: str, limit: int = 10) -> str:
    """
    استرجاع سياق الذاكرة المركب بناءً على Graph.
    - يجلب الكيانات والعلاقات المرتبطة.
    - يبني نصًا منظمًا للـ Prompt.
    """
    if not db:
        return ""
    try:
        # جلب الكيانات
        entities = db.table("knowledge_entities").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
        entity_map = {e["id"]: e for e in entities.data}
        
        # جلب العلاقات
        relations = db.table("entity_relations").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit * 2).execute()
        
        # بناء النص
        lines = []
        for e in entities.data:
            lines.append(f"- {e['entity_type']}: {e['content']}")
            # إضافة العلاقات المرتبطة
            for r in relations.data:
                if r["from_entity"] == e["id"]:
                    target = entity_map.get(r["to_entity"])
                    if target:
                        lines.append(f"  → {r['relation_type']}: {target['content']}")
                elif r["to_entity"] == e["id"]:
                    source = entity_map.get(r["from_entity"])
                    if source:
                        lines.append(f"  ← {r['relation_type']}: {source['content']}")
        return "\n".join(lines) if lines else "لا توجد ذكريات مرتبطة بعد."
    except Exception as e:
        logger.error(f"Memory context error: {e}")
        return ""

# ========== دالة تلخيص تلقائي ==========
async def check_and_summarize(uid: str, chat_history: List[Dict[str, str]], twin_name: str):
    """تلخيص المحادثة تلقائيًا وتخزينها كذكرى."""
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
