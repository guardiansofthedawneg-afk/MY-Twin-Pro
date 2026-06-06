"""
MyTwin – Dream Engine v1.0
- تحليل الأحلام باستخدام Gemini
- تخزين الأحلام في Supabase
- ربط الأحلام بالذكريات والوعي
- دعم العربية والإنجليزية + شخصية GenZ Sage
"""
import os, logging, json, asyncio
from typing import Dict, Any, Optional
from datetime import datetime, timezone
import google.generativeai as genai
from supabase import create_client, Client

logger = logging.getLogger("dream_engine")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")

db: Optional[Client] = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

async def analyze_dream(user_id: str, dream_text: str, lang: str = "ar") -> Dict[str, Any]:
    """
    تحليل حلم باستخدام Gemini.
    يُرجع: interpretation, symbols, emotions, reflection_question
    """
    if not GEMINI_KEY:
        return {"interpretation": "عذراً، خدمة تحليل الأحلام غير متاحة حالياً.", "symbols": [], "emotions": [], "reflection_question": ""}

    genai.configure(api_key=GEMINI_KEY)
    model = genai.GenerativeModel("gemini-2.0-flash")

    if lang == "ar":
        prompt = f"""أنت محلل أحلام خبير ومتعاطف. حلل الحلم التالي وأعد ONLY JSON object (بدون أي نص آخر) يحتوي على:
- "interpretation": تفسير الحلم بالعامية (3-4 جمل).
- "symbols": قائمة بأهم 3 رموز في الحلم.
- "emotions": قائمة بأهم 3 مشاعر مرتبطة بالحلم.
- "reflection_question": سؤال تأملي واحد للمستخدم عن الحلم.

الحلم: "{dream_text}"

JSON:"""
    else:
        prompt = f"""You are an expert dream analyst. Analyze this dream and return ONLY JSON:
{{"interpretation": "...", "symbols": [...], "emotions": [...], "reflection_question": "..."}}
Dream: "{dream_text}"
JSON:"""

    try:
        loop = asyncio.get_running_loop()
        resp = await loop.run_in_executor(None, lambda: model.generate_content(prompt))
        if resp and resp.text:
            raw = resp.text.strip()
            if raw.startswith("```json"): raw = raw.split("```json")[1].split("```")[0].strip()
            elif raw.startswith("```"): raw = raw.split("```")[1].split("```")[0].strip()
            result = json.loads(raw)

            # تخزين الحلم في Supabase
            if db:
                db.table("dreams").insert({
                    "user_id": user_id,
                    "dream_text": dream_text,
                    "interpretation": result.get("interpretation", ""),
                    "symbols": result.get("symbols", []),
                    "emotions": result.get("emotions", []),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }).execute()

            return result
    except Exception as e:
        logger.error(f"Dream analysis failed: {e}")

    return {"interpretation": "لم أتمكن من تحليل حلمك حالياً. حاول مرة أخرى لاحقاً.", "symbols": [], "emotions": [], "reflection_question": ""}


async def get_dream_history(user_id: str, limit: int = 5) -> list:
    """استرجاع سجل الأحلام السابقة."""
    if not db:
        return []
    try:
        res = db.table("dreams").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
        return res.data or []
    except Exception as e:
        logger.error(f"Failed to get dream history: {e}")
        return []
