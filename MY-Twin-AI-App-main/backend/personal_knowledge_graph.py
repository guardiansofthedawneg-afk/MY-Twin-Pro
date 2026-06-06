"""
MyTwin – Personal Knowledge Graph v1.0
- يستخرج الكيانات من رسائل المستخدم (أشخاص، أماكن، تفضيلات)
- يخزنها في جداول Supabase
- يسترجعها لتغذية الـ Prompt
"""
import os, logging, json, asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from supabase import create_client, Client
from groq_helper import call_groq

logger = logging.getLogger("knowledge_graph")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
db: Optional[Client] = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

async def extract_entities(user_id: str, message: str, lang: str = "ar"):
    """يستخرج الكيانات من رسالة المستخدم ويخزنها"""
    if not db or not message.strip():
        return

    prompt = f"""استخرج الكيانات التالية من هذه الرسالة وأعد ONLY JSON:
{{
  "people": ["اسم شخص وعلاقته"],
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

            # تخزين كل نوع في جدوله
            for person in entities.get("people", []):
                db.table("knowledge_people").insert({
                    "user_id": user_id, "content": person,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }).execute()

            for pref in entities.get("preferences", []):
                db.table("knowledge_preferences").insert({
                    "user_id": user_id, "content": pref,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }).execute()

            for goal in entities.get("goals", []):
                db.table("knowledge_goals").insert({
                    "user_id": user_id, "content": goal,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }).execute()

            for habit in entities.get("habits", []):
                db.table("knowledge_habits").insert({
                    "user_id": user_id, "content": habit,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }).execute()

            for fact in entities.get("facts", []):
                db.table("knowledge_facts").insert({
                    "user_id": user_id, "content": fact,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }).execute()

            logger.info(f"✅ Extracted {sum(len(v) for v in entities.values())} entities for {user_id}")
    except Exception as e:
        logger.warning(f"Entity extraction failed: {e}")


async def get_knowledge_context(user_id: str) -> str:
    """يسترجع ملخص المعرفة الشخصية للمستخدم لتغذية الـ Prompt"""
    if not db:
        return ""

    try:
        people = db.table("knowledge_people").select("content").eq("user_id", user_id).limit(5).execute()
        prefs = db.table("knowledge_preferences").select("content").eq("user_id", user_id).limit(5).execute()
        goals = db.table("knowledge_goals").select("content").eq("user_id", user_id).limit(5).execute()
        habits = db.table("knowledge_habits").select("content").eq("user_id", user_id).limit(5).execute()
        facts = db.table("knowledge_facts").select("content").eq("user_id", user_id).limit(5).execute()

        parts = []
        if people.data: parts.append("أشخاص: " + ", ".join([p["content"] for p in people.data]))
        if prefs.data: parts.append("تفضيلات: " + ", ".join([p["content"] for p in prefs.data]))
        if goals.data: parts.append("أهداف: " + ", ".join([g["content"] for g in goals.data]))
        if habits.data: parts.append("عادات: " + ", ".join([h["content"] for h in habits.data]))
        if facts.data: parts.append("حقائق: " + ", ".join([f["content"] for f in facts.data]))

        return " | ".join(parts) if parts else ""
    except Exception as e:
        logger.warning(f"Knowledge context failed: {e}")
        return ""
