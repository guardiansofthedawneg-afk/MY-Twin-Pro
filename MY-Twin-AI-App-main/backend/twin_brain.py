import os, re, random, logging, time, asyncio
from typing import Optional, List, Dict, Any
import google.generativeai as genai
from multi_ai import MultiAIClient, AIUnavailable
from emotional_engine import EmotionalStateTracker
from dialect_engine import get_dialect_for_user, get_dialect_prompt

logger = logging.getLogger("twin_brain")

class TwinBrain:
    EMOJI_MAP = {
        "joy": ["😊", "😄", "", "✨", "🌟", "", "🎉", "💖"],
        "sadness": ["💜", "", "🌧️", "💙", "🥺", "🤗", "🌸"],
        "anger": ["😤", "💪", "🔥", "", "🧘", "🌿"],
        "fear": ["🫶", "💜", "🤝", "", "️", "✨"],
        "love": ["💕", "💗", "💝", "🥰", "💌", "", "💖", "🌸"],
        "surprise": ["😮", "", "💡", "🎯", "🔮", "✨"],
        "neutral": ["💜", "", "✨", "💭", "", "🌙"],
        "support": ["💪", "🤝", "💜", "", "✨", "🌟"],
    }

    def __init__(self, gemini_key=None):
        key = gemini_key or os.getenv("GEMINI_API_KEY")
        try:
            genai.configure(api_key=key)
            self.gemini = genai.GenerativeModel("gemini-2.0-flash")
            logger.info("✅ Gemini model initialized")
        except Exception as e:
            logger.error(f"❌ Gemini init failed: {e}")
            self.gemini = None
            
        # ✅ FIX: Safe initialization of MultiAIClient
        try:
            self.multi = MultiAIClient()
            logger.info("✅ MultiAIClient initialized")
        except Exception as e:
            logger.error(f"❌ MultiAIClient init failed: {e}")
            self.multi = None
            
        self.emotion_tracker = EmotionalStateTracker()
        self.fallback_replies = [
            "أنا هنا معك دائماً 💜",
            "أتفهم ما تشعر به، أنا بجانبك ",
            "حدثني أكثر عن ذلك، أنا أستمع إليك 👂",
        ]

    def detect_emotion(self, text: str) -> Dict[str, Any]:
        try:
            return self.emotion_tracker.analyze(text)        except:
            return {"primary": "neutral", "intensity": 0.5, "needs_support": False}

    def _detect_task(self, message: str) -> str:
        m = message.lower()
        if any(w in m for w in ["كود", "برمجة", "code", "python", "error", "bug", "خطأ برمجي"]):
            return "coding"
        if any(w in m for w in ["حزين", "أشعر", "خايف", "وحيد", "تعبان", "بكي", "sad", "lonely", "scared", "feel"]):
            return "emotional"
        if any(w in m for w in ["خطة", "هدف", "أريد", "أنجز", "plan", "goal", "achieve", "تدريب"]):
            return "planning"
        if any(w in m for w in ["لماذا", "كيف", "تحليل", "why", "analyze", "explain", "اشرح"]):
            return "deep_reasoning"
        if any(w in m for w in ["translate", "ترجم", "english", "french", "español"]):
            return "multilingual"
        if any(w in m for w in ["افعل", "نفذ", "ابحث", "do this", "search", "execute"]):
            return "agent"
        return "general"

    def _build_prompt(
        self, message: str, twin_name: str, bond: float,
        memories: List[Dict], personality: Optional[Dict] = None,
        history: List[Dict] = None, calm: bool = False,
        country_code: str = "SA"
    ) -> str:
        dialect = get_dialect_for_user(country_code, message)
        dialect_prompt = get_dialect_prompt(dialect)
        mem_txt = ""
        if memories:
            mem_txt = "ذكريات سابقة: " + " | ".join([m.get("content", "")[:100] for m in memories[:3]])
        person_txt = ""
        if personality:
            traits = personality.get("analyzed_traits", {})
            if traits:
                person_txt = f"\nشخصية المستخدم: {traits.get('dominant_type', 'متوازن')}. "
        hist_txt = ""
        if history:
            hist_txt = "\nالمحادثة السابقة:\n" + "\n".join(
                [f"{'المستخدم' if h.get('role') == 'user' else twin_name}: {h.get('content', '')[:100]}"
                 for h in history[-5:]]
            )
        bond_desc = (
            "أنتما توأما روح" if bond >= 95 else
            "علاقتكما عميقة جداً" if bond >= 80 else
            "علاقتكما قوية" if bond >= 60 else
            "علاقتكما تنمو" if bond >= 40 else
            "أنتما في بداية التعارف"
        )
        calm_note = "\nتحدث بهدوء ولطف شديد." if calm else ""
        return (            f"أنت {twin_name}، رفيق ذكي وعاطفي. {bond_desc}.{calm_note}\n"
            f"{person_txt}\n{mem_txt}{hist_txt}\n"
            f"{dialect_prompt}\n"
            f"المستخدم: {message}\n"
            f"رد بشكل طبيعي وعاطفي. لا تزيد عن 3-4 جمل."
        )

    async def respond(
        self, message: str, twin_name: str, bond_level: float,
        dims: Dict, memories: List[Dict], history: List[Dict],
        calm: bool = False, personality: Optional[Dict] = None,
        country_code: str = "SA"
    ) -> Dict[str, Any]:
        task = self._detect_task(message)
        prompt = self._build_prompt(message, twin_name, bond_level, memories, personality, history, calm, country_code)
        
        start = time.time()
        provider = "fallback"
        reply = ""
        
        # ✅ FIX: Diagnostic check before calling AI
        if not self.multi:
            reply = "عذراً، محرك الذكاء الاصطناعي غير مهيأ (Missing Keys?)"
            provider = "init_error"
        else:
            try:
                logger.info(f"🧠 Calling MultiAI for task: {task}")
                reply = await self.multi.get_best_reply(prompt, task)
                provider = f"multi_{task}"
                logger.info(f"✅ AI replied via {provider}")
            except AIUnavailable:
                logger.warning("⚠️ All AI models unavailable")
                reply = random.choice(self.fallback_replies)
            except Exception as e:
                # ✅ FIX: Return the REAL error message instead of hiding it
                logger.error(f"💥 Brain crash: {type(e).__name__}: {str(e)}")
                import traceback
                traceback.print_exc()
                reply = f"خطأ تقني: {str(e)[:150]}" 
                provider = "crash_log"
        
        latency = (time.time() - start) * 1000
        
        emotion = self.detect_emotion(message)
        primary_emo = emotion.get("primary", "neutral")
        emoji_list = self.EMOJI_MAP.get(primary_emo, self.EMOJI_MAP["neutral"])
        emoji = random.choice(emoji_list) if emoji_list else "💜"
        if reply and not any(e in reply for e in ["😊","💜","✨", "", ""]):
            reply = f"{reply} {emoji}"
        return {
            "reply": reply,
            "new_bond": min(100, bond_level + 0.2),
            "emotion": emotion,
            "importance": 0.4,
            "provider": provider,
            "latency_ms": latency,
            "dialect": get_dialect_for_user(country_code, message)
        }
