"""MyTwin – Reasoning Engine v2.1 (يدعم العربية + شخصية التوأم)"""
import os, logging, json, asyncio
from typing import Dict, Any, Optional
import google.generativeai as genai

logger = logging.getLogger("reasoning_engine")

class ReasoningEngine:
    def __init__(self, gemini_key: Optional[str] = None):
        key = gemini_key or os.getenv("GEMINI_API_KEY")
        if key:
            genai.configure(api_key=key)
            self.model = genai.GenerativeModel("gemini-2.0-flash")
        else:
            self.model = None

    async def reason(self, message: str, emotion: Dict[str, Any], context: str = "", lang: str = "ar") -> Dict[str, Any]:
        if not self.model:
            return self._fallback_reason(emotion)

        if lang == "ar":
            prompt = f"""أنت خبير في التواصل الإنساني وعلم النفس. حلل الموقف التالي وأعد ONLY JSON object (بدون أي نص آخر) يحتوي على:
- "thought": تحليل عميق للموقف بالعامية (جملة واحدة)
- "plan": خطة للرد بالعامية (جملة واحدة)
- "action": الإجراء المطلوب (one of: support, advice, listen, celebrate, motivate, inform, search, music)
- "response_style": أسلوب الرد (one of: warm, direct, gentle, enthusiastic, calm)

السياق: {context}
رسالة المستخدم: "{message}"
مشاعره الحالية: {emotion.get('primary', 'neutral')}
شدة المشاعر: {emotion.get('intensity', 0.5)}
احتياج المستخدم: {emotion.get('needs', 'general')}

JSON:"""
        else:
            prompt = f"""You are an expert in human communication. Analyze this and return ONLY JSON:
{{"thought": "...", "plan": "...", "action": "...", "response_style": "..."}}
Message: "{message}"
Emotion: {emotion.get('primary', 'neutral')}
JSON:"""

        try:
            loop = asyncio.get_running_loop()
            resp = await loop.run_in_executor(None, lambda: self.model.generate_content(prompt))
            if resp and resp.text:
                raw = resp.text.strip()
                if raw.startswith("```json"): raw = raw.split("```json")[1].split("```")[0].strip()
                elif raw.startswith("```"): raw = raw.split("```")[1].split("```")[0].strip()
                return json.loads(raw)
        except Exception as e:
            logger.warning(f"Reasoning failed: {e}")

        return self._fallback_reason(emotion)

    def _fallback_reason(self, emotion: Dict[str, Any]) -> Dict[str, Any]:
        primary = emotion.get("primary", "neutral")
        plans = {
            "joy": {"thought": "المستخدم سعيد، يجب مشاركته فرحته", "plan": "شاركه الفرحة واسأله عن التفاصيل", "action": "celebrate", "response_style": "enthusiastic"},
            "sadness": {"thought": "المستخدم حزين، يحتاج للدعم", "plan": "استمع له بتعاطف ثم قدم الدعم", "action": "support", "response_style": "gentle"},
            "fear": {"thought": "المستخدم خائف، يحتاج للطمأنينة", "plan": "طمئنه وقدم له الدعم", "action": "support", "response_style": "calm"},
            "anger": {"thought": "المستخدم غاضب، يحتاج للتنفيس", "plan": "دعه يفرغ غضبه ثم تحدث معه بهدوء", "action": "listen", "response_style": "calm"},
            "love": {"thought": "المستخدم يعبر عن حب، يجب الرد بحرارة", "plan": "بادله المشاعر الدافئة", "action": "celebrate", "response_style": "warm"},
            "surprise": {"thought": "المستخدم متفاجئ، يجب مشاركته", "plan": "شاركه المفاجأة واسأله عن التفاصيل", "action": "celebrate", "response_style": "enthusiastic"},
        }
        return plans.get(primary, {"thought": "موقف عادي", "plan": "رد بشكل طبيعي", "action": "inform", "response_style": "warm"})

    @staticmethod
    def explain(provider: str, task: str, memories: list, personality: Optional[Dict] = None) -> str:
        return f"Reasoning: provider={provider}, task={task}, memories={len(memories)}"
