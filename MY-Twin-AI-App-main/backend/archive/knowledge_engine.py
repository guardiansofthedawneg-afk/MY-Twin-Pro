"""
MyTwin - Knowledge Engine v1.0
محرك المعرفة الشخصية — قلب التوأم الحقيقي
"""
import os, logging, json, asyncio
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from supabase import create_client, Client
import google.generativeai as genai

logger = logging.getLogger("knowledge_engine")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")

db: Optional[Client] = None
if SUPABASE_URL and SUPABASE_KEY:
    db = create_client(SUPABASE_URL, SUPABASE_KEY)

if GEMINI_KEY:
    genai.configure(api_key=GEMINI_KEY)
    _model = genai.GenerativeModel(
        "gemini-2.0-flash",
        generation_config=genai.GenerationConfig(
            max_output_tokens=500,
            temperature=0.3,
        )
    )

class KnowledgeEngine:

    # ── استخراج المعرفة من الرسالة ──────────────────────
    async def extract_from_message(
        self, uid: str, message: str, reply: str
    ) -> Dict[str, Any]:
        """استخراج حقائق وعلاقات وأهداف من المحادثة"""
        if not GEMINI_KEY:
            return {}
        try:
            prompt = f"""
حلّل هذه المحادثة واستخرج المعلومات بتنسيق JSON فقط:

المستخدم: {message}
التوأم: {reply}

استخرج:
{{
  "entities": [
    {{"name": "...", "type": "person|project|place|habit|fear|dream", "description": "..."}}
  ],
  "relationships": [
    {{"from": "المستخدم", "to": "...", "type": "works_on|friend_of|fears|loves|wants|hates"}}
  ],
  "goals": [
    {{"title": "...", "priority": "low|medium|high", "status": "active"}}
  ],
  "facts": [
    {{"content": "...", "type": "fact|belief|preference"}}
  ]
}}

لو مافيش معلومات جديدة، رجّع مصفوفات فاضية.
رد بـ JSON فقط بدون أي نص إضافي.
"""
            loop = asyncio.get_running_loop()
            resp = await loop.run_in_executor(
                None,
                lambda: _model.generate_content(prompt)
            )
            text = resp.text.strip()
            # تنظيف الـ JSON
            if "```" in text:
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            return json.loads(text)
        except Exception as e:
            logger.warning(f"extract_from_message failed: {e}")
            return {}

    # ── تحديث الـ Life Graph ─────────────────────────────
    async def update_life_graph(self, uid: str, extracted: Dict) -> None:
        if not db or not extracted:
            return
        try:
            loop = asyncio.get_running_loop()

            # حفظ الـ entities
            for entity in extracted.get("entities", []):
                await loop.run_in_executor(None, lambda e=entity: 
                    db.table("user_entities").upsert({
                        "user_id": uid,
                        "name": e["name"],
                        "type": e.get("type", "fact"),
                        "description": e.get("description", ""),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }, on_conflict="user_id,name").execute()
                )

            # حفظ الـ goals
            for goal in extracted.get("goals", []):
                await loop.run_in_executor(None, lambda g=goal:
                    db.table("goals").insert({
                        "user_id": uid,
                        "title": g["title"],
                        "priority": g.get("priority", "medium"),
                        "status": g.get("status", "active"),
                    }).execute()
                )

            # حفظ الـ facts
            for fact in extracted.get("facts", []):
                await loop.run_in_executor(None, lambda f=fact:
                    db.table("knowledge_nodes").insert({
                        "user_id": uid,
                        "content": f["content"],
                        "node_type": f.get("type", "fact"),
                        "source": "conversation",
                    }).execute()
                )
        except Exception as e:
            logger.error(f"update_life_graph failed: {e}")

    # ── جلب السياق الكامل للمستخدم ──────────────────────
    async def get_user_context(self, uid: str) -> Dict[str, Any]:
        """جلب كل ما نعرفه عن المستخدم لبناء رد عميق"""
        if not db:
            return {}
        try:
            loop = asyncio.get_running_loop()

            # الهوية
            identity = await loop.run_in_executor(None, lambda:
                db.table("user_identity")
                .select("*").eq("user_id", uid).single().execute()
            )

            # الأهداف النشطة
            goals = await loop.run_in_executor(None, lambda:
                db.table("goals")
                .select("title, priority, progress")
                .eq("user_id", uid)
                .eq("status", "active")
                .order("priority", desc=True)
                .limit(5).execute()
            )

            # الكيانات المهمة
            entities = await loop.run_in_executor(None, lambda:
                db.table("user_entities")
                .select("name, type, description")
                .eq("user_id", uid)
                .order("importance", desc=True)
                .limit(10).execute()
            )

            # آخر الحقائق
            facts = await loop.run_in_executor(None, lambda:
                db.table("knowledge_nodes")
                .select("content, node_type")
                .eq("user_id", uid)
                .order("created_at", desc=True)
                .limit(10).execute()
            )

            return {
                "identity": identity.data or {},
                "active_goals": goals.data or [],
                "entities": entities.data or [],
                "recent_facts": facts.data or [],
            }
        except Exception as e:
            logger.error(f"get_user_context failed: {e}")
            return {}

    # ── Reflection Engine — يشتغل كل ليلة ──────────────
    async def nightly_reflection(self, uid: str) -> None:
        """مراجعة يومية — تحديث كل شيء"""
        if not db or not GEMINI_KEY:
            return
        try:
            from memory_engine import get_mems
            loop = asyncio.get_running_loop()

            # جلب ذكريات اليوم
            today_mems = await loop.run_in_executor(
                None, lambda: get_mems(uid, "", days=1, lim=20)
            )
            if not today_mems:
                return

            combined = "\n".join([m.get("content", "") for m in today_mems])

            prompt = f"""
بناءً على هذه المحادثات اليومية:
{combined[:2000]}

أنشئ ملخص تأملي بتنسيق JSON:
{{
  "emotional_summary": "ملخص الحالة العاطفية اليوم",
  "new_facts": ["حقيقة جديدة 1", "حقيقة جديدة 2"],
  "growth_notes": "ملاحظات عن النمو والتطور",
  "updated_goals": [
    {{"title": "...", "progress_delta": 0.1}}
  ]
}}
رد بـ JSON فقط.
"""
            resp = await loop.run_in_executor(
                None, lambda: _model.generate_content(prompt)
            )
            reflection = json.loads(resp.text.strip())

            # حفظ التأمل
            await loop.run_in_executor(None, lambda:
                db.table("daily_reflections").upsert({
                    "user_id": uid,
                    "date": datetime.now(timezone.utc).date().isoformat(),
                    "events": today_mems[:5],
                    "new_facts": reflection.get("new_facts", []),
                    "emotional_summary": reflection.get("emotional_summary", ""),
                    "growth_notes": reflection.get("growth_notes", ""),
                }).execute()
            )

            # تحديث الأهداف
            for goal_update in reflection.get("updated_goals", []):
                await loop.run_in_executor(None, lambda g=goal_update:
                    db.table("goals")
                    .update({"progress": min(1.0, g.get("progress_delta", 0))})
                    .eq("user_id", uid)
                    .eq("title", g["title"])
                    .execute()
                )

            logger.info(f"✅ Nightly reflection done for {uid}")
        except Exception as e:
            logger.error(f"nightly_reflection failed: {e}")

knowledge_engine = KnowledgeEngine()
