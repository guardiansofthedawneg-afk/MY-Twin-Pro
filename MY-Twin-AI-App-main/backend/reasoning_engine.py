"""
MyTwin – Reasoning Engine v4.0 (Full Agentic)
- Thought → Plan → Action → Tool → Reflection
- يقترح الأداة المناسبة (youtube, google_search, dream_engine, coaching, weather, none)
- يتأمل في نتيجة الإجراء ويعدل الخطة
- يدعم العربية والإنجليزية
- يستخدم Groq (مجاني وسريع)
"""
import os, logging, json, asyncio
from typing import Dict, Any, Optional
from groq_helper import call_groq

logger = logging.getLogger("reasoning_engine")

# ========== الأدوات المتاحة ==========
AVAILABLE_TOOLS = [
    "none",                # لا أداة – رد عادي
    "youtube",             # البحث في YouTube
    "google_search",       # البحث في الإنترنت
    "dream_engine",        # تحليل الأحلام
    "coaching_session",    # جلسة تدريب
    "weather",             # حالة الطقس
    "memory_retrieval",    # استرجاع ذكريات محددة
    "proactive_question",  # سؤال استباقي
]

class ReasoningEngine:
    def __init__(self, gemini_key: Optional[str] = None):
        pass

    async def reason(
        self,
        message: str,
        emotion: Dict[str, Any],
        context: str = "",
        lang: str = "ar"
    ) -> Dict[str, Any]:
        """
        Agentic Reasoning:
        1. يفهم الموقف
        2. يبني خطة
        3. يختار الأداة المناسبة
        4. يحدد أسلوب الرد
        """
        if lang == "ar":
            prompt = f"""أنت وكيل ذكي (Agent) يعمل كرفيق عاطفي. حلل الموقف وأعد ONLY JSON:
{{
  "thought": "تحليل عميق بالعامية",
  "plan": "خطة الرد بالعامية",
  "action": "one of: support, advice, listen, celebrate, motivate, inform, search, music, dream, coaching",
  "response_style": "one of: warm, direct, gentle, enthusiastic, calm",
  "suggested_tool": "one of: {', '.join(AVAILABLE_TOOLS)}",
  "tool_query": "الاستعلام للأداة إن وجدت، وإلا ''",
  "priority": "one of: high, medium, low"
}}
السياق: {context}
الرسالة: "{message}"
المشاعر: {emotion.get('primary', 'neutral')}
الشدة: {emotion.get('intensity', 0.5)}
الاحتياج: {emotion.get('needs', 'general')}
JSON:"""
        else:
            prompt = f"""You are an intelligent agent acting as an emotional companion. Analyze and return ONLY JSON:
{{
  "thought": "...",
  "plan": "...",
  "action": "...",
  "response_style": "...",
  "suggested_tool": "...",
  "tool_query": "...",
  "priority": "..."
}}
Message: "{message}"
JSON:"""

        try:
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(None, call_groq, prompt)
            if result:
                raw = result.strip()
                if raw.startswith("```json"): raw = raw.split("```json")[1].split("```")[0].strip()
                elif raw.startswith("```"): raw = raw.split("```")[1].split("```")[0].strip()
                return json.loads(raw)
        except Exception as e:
            logger.warning(f"Agent reasoning failed: {e}")

        return self._fallback_reason(emotion)

    async def reflect(
        self,
        original_message: str,
        action_taken: str,
        result: str,
        lang: str = "ar"
    ) -> Dict[str, Any]:
        """
        تأمل الوكيل في نتيجة الإجراء لتعديل سلوكه المستقبلي.
        """
        if lang == "ar":
            prompt = f"""تأمل في نتيجة الإجراء الذي اتخذته وأعد ONLY JSON:
{{
  "was_effective": true/false,
  "what_worked": "ما نجح",
  "what_didnt": "ما لم ينجح",
  "adjustment": "كيف ستعدل سلوكك المرة القادمة"
}}
الرسالة الأصلية: "{original_message}"
الإجراء المتخذ: {action_taken}
النتيجة: {result}
JSON:"""
        else:
            prompt = f"""Reflect on the action result and return ONLY JSON:
{{"was_effective": true/false, "what_worked": "...", "what_didnt": "...", "adjustment": "..."}}
Original: "{original_message}"
Action: {action_taken}
Result: {result}
JSON:"""

        try:
            loop = asyncio.get_running_loop()
            resp = await loop.run_in_executor(None, call_groq, prompt)
            if resp:
                raw = resp.strip()
                if raw.startswith("```json"): raw = raw.split("```json")[1].split("```")[0].strip()
                elif raw.startswith("```"): raw = raw.split("```")[1].split("```")[0].strip()
                return json.loads(raw)
        except Exception as e:
            logger.warning(f"Reflection failed: {e}")

        return {"was_effective": True, "what_worked": "", "what_didnt": "", "adjustment": ""}

    def _fallback_reason(self, emotion: Dict[str, Any]) -> Dict[str, Any]:
        primary = emotion.get("primary", "neutral")
        plans = {
            "joy": {"thought": "المستخدم سعيد، يجب مشاركته فرحته", "plan": "شاركه الفرحة واسأله عن التفاصيل", "action": "celebrate", "response_style": "enthusiastic", "suggested_tool": "none", "tool_query": "", "priority": "high"},
            "sadness": {"thought": "المستخدم حزين، يحتاج للدعم", "plan": "استمع له بتعاطف ثم قدم الدعم", "action": "support", "response_style": "gentle", "suggested_tool": "none", "tool_query": "", "priority": "high"},
            "fear": {"thought": "المستخدم خائف، يحتاج للطمأنينة", "plan": "طمئنه وقدم له الدعم", "action": "support", "response_style": "calm", "suggested_tool": "none", "tool_query": "", "priority": "high"},
            "anger": {"thought": "المستخدم غاضب، يحتاج للتنفيس", "plan": "دعه يفرغ غضبه ثم تحدث معه بهدوء", "action": "listen", "response_style": "calm", "suggested_tool": "none", "tool_query": "", "priority": "high"},
            "love": {"thought": "المستخدم يعبر عن حب، يجب الرد بحرارة", "plan": "بادله المشاعر الدافئة", "action": "celebrate", "response_style": "warm", "suggested_tool": "none", "tool_query": "", "priority": "high"},
            "surprise": {"thought": "المستخدم متفاجئ، يجب مشاركته", "plan": "شاركه المفاجأة واسأله عن التفاصيل", "action": "celebrate", "response_style": "enthusiastic", "suggested_tool": "none", "tool_query": "", "priority": "medium"},
        }
        return plans.get(primary, {"thought": "موقف عادي", "plan": "رد بشكل طبيعي", "action": "inform", "response_style": "warm", "suggested_tool": "none", "tool_query": "", "priority": "medium"})

    @staticmethod
    def explain(provider: str, task: str, memories: list, personality: Optional[Dict] = None) -> str:
        return f"Reasoning: provider={provider}, task={task}, memories={len(memories)}"
