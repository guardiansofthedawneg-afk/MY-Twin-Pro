"""
MyTwin – Emotional Engine v6.0 (LLM‑Powered)
- يستخدم Gemini لتصنيف المشاعر بدلاً من الكلمات المفتاحية
- يُرجع JSON كاملاً: emotion, intensity, needs, risk
- يدعم العربية والإنجليزية
"""
import os, logging, asyncio, json
from typing import Dict, Any, Optional
import google.generativeai as genai

logger = logging.getLogger("emotional_engine")

class EmotionalStateTracker:
    def __init__(self, gemini_key: Optional[str] = None):
        key = gemini_key or os.getenv("GEMINI_API_KEY")
        if key:
            genai.configure(api_key=key)
            self.model = genai.GenerativeModel("gemini-2.0-flash")
        else:
            self.model = None
        self.emotion_history: list = []

    async def analyze(self, text: str, lang: str = "ar") -> Dict[str, Any]:
        """
        تحليل المشاعر باستخدام Gemini LLM.
        يُرجع قاموساً يحتوي على:
        - primary: المشاعر الأساسية
        - intensity: شدة المشاعر (0-1)
        - needs: احتياجات المستخدم (support, advice, just_listen...)
        - risk: مستوى الخطر (low, medium, high)
        """
        if not self.model or not text.strip():
            return {"primary": "neutral", "intensity": 0.5, "needs_support": False, "needs": "general", "risk": "low"}

        prompt = f"""You are an expert psychologist. Analyze the following message and return ONLY a JSON object (no other text) with these fields:
- "primary": one of [joy, sadness, anger, fear, love, surprise, neutral]
- "intensity": number from 0.0 to 1.0
- "needs": one of [support, advice, just_listen, celebrate, motivation, general]
- "risk": one of [low, medium, high] (risk of self-harm or danger)
- "confidence": number from 0.0 to 1.0

Message: "{text}"
Language: {"Arabic" if lang == "ar" else "English"}

JSON:"""

        try:
            loop = asyncio.get_running_loop()
            resp = await loop.run_in_executor(None, lambda: self.model.generate_content(prompt))
            if resp and resp.text:
                # تنظيف الرد (قد يحتوي على نصوص إضافية)
                raw = resp.text.strip()
                if raw.startswith("```json"):
                    raw = raw.split("```json")[1].split("```")[0].strip()
                elif raw.startswith("```"):
                    raw = raw.split("```")[1].split("```")[0].strip()
                result = json.loads(raw)
                result["needs_support"] = result.get("primary") in ["sadness", "fear", "anger"] and result.get("intensity", 0) > 0.5
                result["lang"] = lang
                self.emotion_history.append({"timestamp": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(), "emotion": result})
                return result
        except Exception as e:
            logger.warning(f"LLM emotion analysis failed: {e}, falling back to keyword analysis")
            return self._fallback_analyze(text, lang)

        return {"primary": "neutral", "intensity": 0.5, "needs_support": False, "needs": "general", "risk": "low"}

    def _fallback_analyze(self, text: str, lang: str = "ar") -> Dict[str, Any]:
        """احتياطي: تحليل سريع باستخدام الكلمات المفتاحية"""
        text_lower = text.lower()
        keywords = {
            "joy": ["سعيد", "فرح", "مبسوط", "happy", "joy", "glad", "great"],
            "sadness": ["حزين", "مؤلم", "بكي", "sad", "pain", "cry", "tear"],
            "anger": ["غاضب", "محبط", "angry", "mad", "furious", "upset"],
            "fear": ["خائف", "قلق", "خوف", "scared", "afraid", "anxious", "worried"],
            "love": ["أحبك", "حبيب", "قلبي", "love", "dear", "heart", "miss"],
            "surprise": ["مفاجأة", "عجيب", "surprise", "wow", "amazing"],
        }
        scores = {}
        for emotion, words in keywords.items():
            score = sum(1 for w in words if w in text_lower)
            if score > 0:
                scores[emotion] = score
        if scores:
            primary = max(scores, key=scores.get)
            intensity = min(scores[primary] / 3.0, 1.0)
        else:
            primary = "neutral"
            intensity = 0.5
        return {"primary": primary, "intensity": intensity, "needs_support": primary in ["sadness", "fear", "anger"] and intensity > 0.5, "needs": "general", "risk": "low"}

    def detect_shift(self, prev: str, curr: str) -> bool:
        positive = {"joy", "love", "surprise"}
        negative = {"sadness", "fear", "anger"}
        return (prev in positive and curr in negative) or (prev in negative and curr in positive)

    def calculate_energy(self, last_active: Optional[str], daily_messages: int, current_emotion: str) -> float:
        energy = 0.5
        if last_active:
            try:
                last = __import__("datetime").datetime.fromisoformat(last_active.replace("Z", "+00:00"))
                hours = (__import__("datetime").datetime.now(__import__("datetime").timezone.utc) - last.replace(tzinfo=None)).total_seconds() / 3600
                if hours > 24: energy -= 0.2
                elif hours < 1: energy += 0.1
            except:
                pass
        if daily_messages > 50: energy -= 0.1
        elif daily_messages < 5: energy -= 0.1
        else: energy += 0.1
        emotion_energy = {"joy": 0.2, "excited": 0.3, "love": 0.2, "sadness": -0.3, "anger": -0.2, "fear": -0.2, "neutral": 0.0}
        energy += emotion_energy.get(current_emotion, 0)
        return round(max(0.1, min(1.0, energy)), 2)

    def get_voice_emotion(self, emotion_result: Dict[str, Any]) -> str:
        primary = emotion_result.get("primary", "neutral")
        intensity = emotion_result.get("intensity", 0.5)
        if intensity > 0.8 and primary == "joy": return "excited"
        if intensity > 0.8 and primary == "sadness": return "sad"
        if intensity > 0.8 and primary == "fear": return "worried"
        return primary

    def get_tts_config_from_emotion(self, emotion_result: Dict[str, Any], calm: bool = False) -> dict:
        if calm: return {"pitch": 0.80, "rate": 0.70, "emotion": "calm"}
        primary = emotion_result.get("primary", "neutral")
        configs = {
            "joy": {"pitch": 1.12, "rate": 0.90, "emotion": "happy"},
            "sadness": {"pitch": 0.80, "rate": 0.75, "emotion": "sad"},
            "fear": {"pitch": 1.05, "rate": 0.95, "emotion": "worried"},
            "anger": {"pitch": 1.05, "rate": 0.95, "emotion": "angry"},
            "love": {"pitch": 1.08, "rate": 0.92, "emotion": "loving"},
            "surprise": {"pitch": 1.15, "rate": 0.95, "emotion": "excited"},
            "neutral": {"pitch": 0.95, "rate": 0.85, "emotion": "neutral"},
        }
        return configs.get(primary, configs["neutral"])

# دوال مساعدة عالمية للتوافق مع الكود القديم
def calc_energy(last_active: Optional[str], msgs_24h: int, avg_emo: str) -> float:
    return EmotionalStateTracker().calculate_energy(last_active, msgs_24h, avg_emo)

def detect_emotion_shift(prev: str, curr: str) -> bool:
    return EmotionalStateTracker().detect_shift(prev, curr)

def tts_params(emo: str, calm: bool = False) -> dict:
    if calm: return {"pitch": 0.80, "rate": 0.70}
    params_map = {
        "joy": {"pitch": 1.12, "rate": 0.90},
        "sadness": {"pitch": 0.80, "rate": 0.75},
        "fear": {"pitch": 1.05, "rate": 0.95},
        "anger": {"pitch": 1.05, "rate": 0.95},
        "love": {"pitch": 1.08, "rate": 0.92},
        "surprise": {"pitch": 1.15, "rate": 0.95},
        "neutral": {"pitch": 0.95, "rate": 0.85},
    }
    return params_map.get(emo, {"pitch": 0.95, "rate": 0.85})

def get_voice_emotion(emotion_result: Dict[str, Any]) -> str:
    return EmotionalStateTracker().get_voice_emotion(emotion_result)

def get_tts_config_from_emotion(emotion_result: Dict[str, Any], calm: bool = False) -> dict:
    return EmotionalStateTracker().get_tts_config_from_emotion(emotion_result, calm)
