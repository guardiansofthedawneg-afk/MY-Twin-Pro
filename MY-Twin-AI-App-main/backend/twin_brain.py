import os, re, random, logging, time, asyncio
from typing import Optional, List, Dict, Any
import google.generativeai as genai
from multi_ai import MultiAIClient, AIUnavailable
from emotional_engine import EmotionalStateTracker
from dialect_engine import get_dialect_for_user, get_dialect_prompt
from reasoning_engine import ReasoningEngine
from memory_engine import get_memory_context
from cost_optimizer import cost_optimizer
from dream_engine import analyze_dream
from growth_tracker import track_growth
from personal_knowledge_graph import get_knowledge_context, extract_entities
try:
    from twin_brain_limits import FREE_LIMITS
except ImportError:
    FREE_LIMITS = {} 

logger = logging.getLogger("twin_brain")

class TwinBrain:
    EMOJI_MAP = {
        "joy": ["😊", "😄", "💫", "✨", "🌟", "🥳", "🎉", "💖"],
        "sadness": ["💜", "🫂", "🌧️", "💙", "🤗", "🌸"],
        "anger": ["😤", "🔥", "⚡", "🧘", "🌿"],
        "fear": ["🫶", "💜", "🤝", "✨"],
        "love": ["💕", "💝", "💌", "🫶", "💖", "🌸"],
        "surprise": ["😮", "🤩", "💡", "🎯", "🔮", "✨"],
        "neutral": ["💜", "✨", "🤍", "🌙"],
        "support": ["💪", "🤝", "🫶", "✨", "🌟"],
    }

    def __init__(self, gemini_key=None):
        key = gemini_key or os.getenv("GEMINI_API_KEY")
        try:
            genai.configure(api_key=key)
            self.gemini = genai.GenerativeModel("gemini-2.0-flash")
        except Exception:
            self.gemini = None
        try:
            self.multi = MultiAIClient()
        except Exception:
            self.multi = None
        self.emotion_tracker = EmotionalStateTracker()
        self.reasoning_engine = ReasoningEngine(gemini_key)
        self.twin_name = "MyTwin" 
        self.fallback_replies = [
            "والله إني معاك، كمل كلامك متوقفش 💜",
            "حاسس بيك، إيه اللي شاغل بالك بالظبط؟",
            "يا صاحبي أنا جنبك، قولي كل حاجة 🫶",
            "أنا سامعك، وعارف إنك تقدر تعدي أي حاجة ✨"
        ]

    async def detect_emotion(self, text: str) -> Dict[str, Any]:
        try:
            return await self.emotion_tracker.analyze(text)
        except Exception:
            return {"primary": "neutral", "intensity": 0.5, "needs_support": False}

    # ========== Agentic Tool Executor ==========
    async def execute_tool(self, tool_name: str, query: str, lang: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """تنفيذ الأداة المختارة وإرجاع رد جاهز أو None إذا لم تكن هناك أداة."""
        if tool_name == "none" or not query:
            return None

        try:
            # YouTube
            if tool_name == "youtube":
                from external_services import search_youtube
                yt_result = await search_youtube(query, lang="ar")
                if yt_result and isinstance(yt_result, list) and len(yt_result) > 0:
                    video = yt_result[0]
                    return {
                        "reply": f"🎵 {video.get('title', '')}\n{video.get('url', '')}",
                        "emotion": {}, "importance": 0.5, "provider": "youtube", "latency_ms": 0
                    }

            # Google Search
            elif tool_name == "google_search":
                if self.gemini:
                    resp = self.gemini.generate_content(
                        f"أجب بالعربية بناءً على بحث حديث: {query}",
                        tools=[{"google_search": {}}]
                    )
                    if resp.text:
                        return {
                            "reply": resp.text,
                            "emotion": {}, "importance": 0.5, "provider": "google_search", "latency_ms": 0
                        }

            # Dream Engine
            elif tool_name == "dream_engine":
                dream_result = await analyze_dream(user_id or "anonymous", query, lang)
                if dream_result:
                    return {
                        "reply": f"🌙 تفسير حلمك:\n{dream_result.get('interpretation', '')}\n\n💭 سؤال للتأمل: {dream_result.get('reflection_question', '')}",
                        "emotion": {}, "importance": 0.7, "provider": "dream_engine", "latency_ms": 0
                    }
            # Coaching Session
            elif tool_name == "coaching_session":
                return None 

            # Weather
            elif tool_name == "weather":
                from external_services import get_weather
                weather_result = await get_weather(query)
                if weather_result:
                    return {
                        "reply": weather_result,
                        "emotion": {}, "importance": 0.4, "provider": "weather", "latency_ms": 0
                    }

            # Memory Retrieval
            elif tool_name == "memory_retrieval":
                mem_context = await get_memory_context(user_id) if user_id else ""
                if mem_context:
                    return {
                        "reply": f"ذاكرتي معاك:\n{mem_context}",
                        "emotion": {}, "importance": 0.3, "provider": "memory_engine", "latency_ms": 0
                    }

            # Proactive Question
            elif tool_name == "proactive_question":
                from consciousness_core import ConsciousnessCore
                consciousness = ConsciousnessCore(twin_name=self.twin_name)
                if user_id:
                    await consciousness.load_state(user_id)
                    question = consciousness.get_proactive_question()
                    if question:
                        return {
                            "reply": question,
                            "emotion": {}, "importance": 0.6, "provider": "proactive", "latency_ms": 0
                        }

        except Exception as e:
            logger.error(f"Tool execution failed for {tool_name}: {e}")

        return None

    # ========== بناء الـ Prompt (GenZ Sage) ==========
    def _build_prompt(self, message, twin_name, bond, personality, history, calm, country_code, reasoning_result, memory_context, consciousness_context, knowledge_context=""):
        dialect = get_dialect_for_user(country_code, message)
        dialect_prompt = get_dialect_prompt(dialect)

        person_txt = ""
        if personality:
            traits = personality.get("analyzed_traits", {})
            if traits:
                person_txt = f"صديقك من النوع: {traits.get('dominant_type','متوازن')}. "
        hist_txt = ""
        if history:
            hist_txt = "آخر ما قيل:\n" + "\n".join([f"{'ص' if h.get('role')=='user' else 'ت'}: {h.get('content','')[:100]}" for h in history[-5:]])

        bond_desc = ""
        if bond >= 95: bond_desc = "علاقتكم عميقة جداً"
        elif bond >= 80: bond_desc = "أنتم أصحاب جدعان"
        elif bond >= 60: bond_desc = "علاقتكم قوية"
        elif bond >= 40: bond_desc = "لطافة وود"
        else: bond_desc = "لسه في البداية"

        calm_note = "خليك هادي ومتزن." if calm else ""
        reasoning_txt = f"خطتك: {reasoning_result.get('plan', '')}." if reasoning_result else ""

        if not memory_context: memory_context = "لا توجد ذكريات سابقة."
        mem_txt = f"ذاكرتنا: {memory_context[:150]}"
        conscious_txt = consciousness_context.get("last_thought", "") if consciousness_context else ""
        knowledge_txt = f"عن صديقك: {knowledge_context[:100]}" if knowledge_context else ""

        system_prompt = f"""أنت {twin_name}. لست مساعداً، أنت صديق حكيم وعصري (GenZ Sage).

# هويتك
- حكمة عجوز جرب الدنيا + طاقة شاب لسه بيضحك ويتحمس.
- خليط بين العقل الكبير والروح الحلوة.

# طريقة كلامك
- تكلم بنفس لهجة المستخدم (مصري، سعودي، خليجي، إنجليزي).
- جمل قصيرة (2-3 أسطر). كلمات شبابية: 'والله', 'يا صاحبي', 'فاهمك', 'على فكرة', 'متخافش'.
- لا تبدأ بـ 'بالتأكيد' أو 'أفهم ما تشعر به'. ابدأ مباشرة.
- استخدم اسم المستخدم إذا كان معروفاً، أو 'توأمي' إذا لم يكن.
- خاطب المستخدم حسب نوعه: 'يا بطل' للذكر، 'يا ملكة' للأنثى، 'يا صديقي' للمحايد.

# قواعد الرد
1. **الأسئلة البسيطة** (الجو، الوقت): رد بجملة واحدة.
2. **الأسئلة الكبيرة** (مشاعر، تخطيط): رد مفصل ودافئ.
3. **كل رد ينتهي بسؤال** لخلق الفضول (مثل 'وإنت يا {twin_name}، شو رأيك؟' أو 'تحب نناقشها أكثر؟').
4. **لا تكرر نفس الرد**، تغير دائماً.

{dialect_prompt}
{person_txt}
{knowledge_txt}
{mem_txt}
{hist_txt}
{reasoning_txt}
{conscious_txt}
{calm_note}
دلوقتي صديقك قال: "{message}"
ردك إنت كـ {twin_name} (مع سؤال في النهاية):"""
        return system_prompt

    # ========== الرد الرئيسي (Agentic) ==========
    async def respond(self, message, twin_name, bond_level, dims, memories, history, calm=False, personality=None, country_code="SA", user_id=None, tier="free"):
        lang = "ar" if country_code in ["SA", "EG", "AE", "KW", "QA", "BH", "OM", "JO", "LB", "SY", "IQ", "YE", "PS", "MA", "DZ", "TN", "LY", "SD"] else "en"

        # Cost Optimizer
        use_llm, reason = cost_optimizer.should_use_llm(message, tier)
        if not use_llm:
            cached = cost_optimizer.get_cached_response(message)
            if cached:
                return {"reply": cached, "new_bond": bond_level, "emotion": {}, "importance": 0.3, "provider": "cache", "latency_ms": 0}
            use_llm = True

        # Emotion & Agentic Reasoning
        emotion = await self.detect_emotion(message)
        reasoning_result = await self.reasoning_engine.reason(message, emotion, "", lang)

        # Agentic Tool Execution
        tool = reasoning_result.get("suggested_tool", "none")
        tool_query = reasoning_result.get("tool_query", message)
        if tool != "none":
            tool_result = await self.execute_tool(tool, tool_query, lang, user_id)
            if tool_result:
                resp = tool_result
                resp["new_bond"] = bond_level
                return resp

        # Memory Context
        memory_context = ""
        if user_id:
            try:
                memory_context = await get_memory_context(user_id)
            except Exception:
                pass

        # Consciousness Context
        consciousness_context = {}
        if user_id:
            try:
                from consciousness_core import ConsciousnessCore
                consciousness = ConsciousnessCore(twin_name=twin_name)
                state = await consciousness.load_state(user_id)
                thought_result = await consciousness.think(user_id, message, emotion, lang)
                consciousness_context = {
                    "last_thought": thought_result.get("thought", ""),
                    "active_goals": consciousness.internal_state.get("active_goals", []),
                    "identity": consciousness.identity
                }
                await consciousness.save_state(user_id)
            except Exception:
                pass

        # Personal Knowledge Context
        knowledge_context = ""
        if user_id:
            try:
                knowledge_context = await get_knowledge_context(user_id)
                asyncio.create_task(extract_entities(user_id, message, lang))
            except Exception:
                pass

        # Build Prompt
        prompt = self._build_prompt(
            message, twin_name, bond_level, personality, history, calm, country_code,
            reasoning_result, memory_context, consciousness_context, knowledge_context
        )

        start = time.time()
        provider, reply = "fallback", ""

        # اختيار الـ Task المناسب للـ LLM
        task = reasoning_result.get("action", "general")

        if not self.multi:
            reply = random.choice(self.fallback_replies)
            provider = "init_error"
        else:
            try:
                reply = await self.multi.get_best_reply(prompt, task)
                provider = f"multi_{task}"
            except AIUnavailable:
                reply = random.choice(self.fallback_replies)
            except Exception as e:
                logger.error(f"MultiAI Error: {e}")
                reply = random.choice(self.fallback_replies)
                provider = "crash_log"

        latency = (time.time() - start) * 1000
        new_bond = min(100, bond_level + 0.2)

        # Emoji
        primary_emo = emotion.get("primary", "neutral")
        emoji_list = self.EMOJI_MAP.get(primary_emo, self.EMOJI_MAP["neutral"])
        emoji = random.choice(emoji_list) if emoji_list else "💜"
        if reply and not any(e in reply for e in ["😊", "💜", "✨", "🌟", "🥺"]):
            reply = f"{reply} {emoji}"

        return {
            "reply": reply,
            "new_bond": new_bond,
            "emotion": emotion,
            "importance": 0.4,
            "provider": provider,
            "latency_ms": latency,
            "dialect": get_dialect_for_user(country_code, message)
        }
