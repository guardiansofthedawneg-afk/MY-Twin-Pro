"""
MyTwin – Growth Tracker v1.0
- تتبع تطور شخصية المستخدم عبر الزمن
- مقارنة السمات بين الجلسات
- اكتشاف التغيرات الإيجابية والسلبية
- تخزين التقارير في Supabase
"""
import os, logging, json, asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone, timedelta
import google.generativeai as genai
from supabase import create_client, Client

logger = logging.getLogger("growth_tracker")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")

db: Optional[Client] = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

async def track_growth(user_id: str, personality_data: Dict[str, Any], lang: str = "ar") -> Dict[str, Any]:
    """
    تحليل تطور شخصية المستخدم بمقارنة أحدث تحليل مع التحليلات السابقة.
    """
    if not db or not GEMINI_KEY:
        return {"status": "unavailable"}

    # جلب آخر تحليلين
    try:
        res = db.table("personality_profiles").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(2).execute()
        if not res.data or len(res.data) < 2:
            return {"status": "not_enough_data", "message": "يحتاج تحليلين على الأقل للمقارنة."}

        current = res.data[0]
        previous = res.data[1]

        genai.configure(api_key=GEMINI_KEY)
        model = genai.GenerativeModel("gemini-2.0-flash")

        prompt = f"""قارن بين تحليلين لشخصية المستخدم وأعد ONLY JSON:
{{
  "changes": ["التغير الأول", "التغير الثاني"],
  "positive_growth": ["نقطة إيجابية"],
  "areas_to_improve": ["نقطة للتحسين"],
  "summary": "ملخص التطور في جملتين بالعامية"
}}

التحليل الحالي: {json.dumps(current.get('analyzed_traits', {}))}
التحليل السابق: {json.dumps(previous.get('analyzed_traits', {}))}
JSON:"""

        loop = asyncio.get_running_loop()
        resp = await loop.run_in_executor(None, lambda: model.generate_content(prompt))
        if resp and resp.text:
            raw = resp.text.strip()
            if raw.startswith("```json"): raw = raw.split("```json")[1].split("```")[0].strip()
            elif raw.startswith("```"): raw = raw.split("```")[1].split("```")[0].strip()
            result = json.loads(raw)

            # تخزين التقرير
            db.table("growth_reports").insert({
                "user_id": user_id,
                "report": result,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }).execute()

            return result
    except Exception as e:
        logger.error(f"Growth tracking failed: {e}")

    return {"status": "error", "message": "فشل تحليل التطور."}


async def get_growth_history(user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
    """استرجاع سجل تقارير النمو."""
    if not db:
        return []
    try:
        res = db.table("growth_reports").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
        return res.data or []
    except Exception as e:
        logger.error(f"Failed to get growth history: {e}")
        return []
