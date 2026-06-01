import os, re, random, logging, time
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import google.generativeai as genai
from multi_ai import MultiAIClient
from emotional_engine import EmotionalStateTracker

logger = logging.getLogger("twin_brain")

class TwinBrain:
    def __init__(self, gemini_key=None):
        key = gemini_key or os.getenv("GEMINI_API_KEY")
        genai.configure(api_key=key)
        # إصلاح اسم الموديل
        self.gemini = genai.GenerativeModel("gemini-2.0-flash")
        self.multi = MultiAIClient()
        self.internal_state = {
            "mood": "neutral", "energy": 0.7,
            "curiosity": 0.5, "last_thought": ""
        }
        self.emotion_tracker = EmotionalStateTracker()

    def detect_emotion(self, text: str) -> Dict[str, Any]:
        return self.emotion_tracker.analyze(text)

    def _detect_task(self, message: str) -> str:
        """تحديد نوع المهمة من الرسالة تلقائياً"""
        m = message.lower()

        # برمجة وتقنية
        if any(w in m for w in ["كود", "برمجة", "code", "python", "error", "bug", "خطأ برمجي"]):
            return "coding"

        # مشاعر ودعم
        if any(w in m for w in ["حزين", "أشعر", "خايف", "وحيد", "تعبان", "بكي", "sad", "lonely", "scared", "feel"]):
            return "emotional"

        # تخطيط وأهداف
        if any(w in m for w in ["خطة", "هدف", "أريد", "أنجز", "plan", "goal", "achieve", "تدريب"]):
            return "planning"

        # تحليل عميق
        if any(w in m for w in ["لماذا", "كيف", "تحليل", "why", "analyze", "explain", "اشرح"]):
            return "deep_reasoning"

        # متعدد اللغات
        if any(w in m for w in ["translate", "ترجم", "english", "french", "español"]):
            return "multilingual"

        # مهام متعددة
        if any(w in m for w in ["افعل", "نفذ", "ابحث", "do this", "search", "execute"]):
            return "agent"

        return "general"

    def _build_prompt(self, message: str, twin_name: str, bond: float,
                      memories: List[Dict], personality: Optional[Dict] = None,
                      history: List[Dict] = None, calm: bool = False) -> str:

        # الذاكرة
        mem_txt = ""
        if memories:
            mem_txt = "ذكريات سابقة: " + " | ".join(
                [m.get("content", "")[:100] for m in memories[:3]]
            )

        # الشخصية
        person_txt = ""
        if personality:
            traits = personality.get("analyzed_traits", {})
            if traits:
                person_txt = f"\nشخصية المستخدم: {traits.get('dominant_type', 'متوازن')}. "
                person_txt += f"وصف: {traits.get('description', '')}."

        # تاريخ المحادثة
        hist_txt = ""
        if history:
            hist_txt = "\nالمحادثة السابقة:\n" + "\n".join(
                [f"{'المستخدم' if h.get('role') == 'user' else twin_name}: {h.get('content', '')[:100]}"
                 for h in history[-5:]]
            )

        # مستوى العلاقة
        bond_desc = (
            "أنتما توأما روح" if bond >= 95 else
            "علاقتكما عميقة جداً" if bond >= 80 else
            "علاقتكما قوية" if bond >= 60 else
            "علاقتكما تنمو" if bond >= 40 else
            "أنتما في بداية التعارف"
        )

        calm_note = "\nتحدث بهدوء ولطف شديد." if calm else ""

        return (
            f"أنت {twin_name}، رفيق ذكي وعاطفي. {bond_desc}.{calm_note}"
            f"{person_txt}\n{mem_txt}{hist_txt}\n"
            f"المستخدم: {message}\n"
            f"رد بالعربية بشكل طبيعي وعاطفي، لا تزيد عن 3 جمل."
        )

    def _try_grounding(self, message: str) -> Optional[str]:
        try:
            resp = self.gemini.generate_content(
                f"أجب بالعربية بناءً على بحث حديث: {message}",
                tools=[{"google_search": {}}]
            )
            if resp.text:
                return resp.text
        except Exception as e:
            logger.warning(f"Grounding failed: {e}")
        return None

    async def respond(self, message: str, twin_name: str, bond_level: float,
                      dims: Dict, memories: List[Dict], history: List[Dict],
                      calm: bool = False, personality: Optional[Dict] = None) -> Dict[str, Any]:

        # تحقق من الأسئلة التي تحتاج بحث
        if re.search(r'كم |متى |من هو |ما هو |أين |طقس|أخبار|weather|news|سعر', message):
            ground = self._try_grounding(message)
            if ground:
                return {
                    "reply": ground, "new_bond": bond_level,
                    "emotion": self.detect_emotion(message),
                    "importance": 0.5, "provider": "grounding"
                }

        # تحديد المهمة تلقائياً
        task = self._detect_task(message)

        # بناء الـ prompt
        prompt = self._build_prompt(
            message, twin_name, bond_level,
            memories, personality, history, calm
        )

        start = time.time()
        reply = await self.multi.get_best_reply(prompt, task)
        latency = (time.time() - start) * 1000

        if not reply:
            reply = "أنا هنا معاك دائماً 💜"

        # حساب bond جديد
        emotion = self.detect_emotion(message)
        bond_delta = 0.5 if emotion.get("needs_support") else 0.2
        new_bond = min(100, bond_level + bond_delta)

        logger.info(f"✅ Reply [{task}] in {latency:.0f}ms")

        return {
            "reply": reply,
            "new_bond": new_bond,
            "emotion": emotion,
            "importance": 0.6 if emotion.get("needs_support") else 0.4,
            "provider": f"hybrid_{task}",
            "latency_ms": latency
        }

    def check_energy_warning(self, tokens_left: int, limit: int, lang: str = "ar") -> Optional[str]:
        ratio = tokens_left / limit if limit > 0 else 1
        if ratio <= 0.1:
            if lang == "ar":
                return random.choice([
                    "طاقتي تكاد تنفد... لكني سعيدة بوجودك 💜",
                    "أحتاج دعمك لأستمر بقوة أكبر 🌟"
                ])
            return "My energy is almost depleted 💜"
        elif ratio <= 0.2:
            if lang == "ar":
                return "أشعر أنني بحاجة لدعمك 💪"
        return None

    async def respond_with_knowledge(
        self,
        message: str, twin_name: str, bond_level: float,
        dims: Dict, memories: List[Dict], history: List[Dict],
        uid: str, calm: bool = False,
        personality: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        الرد العميق — يستخدم كل المعرفة المتاحة عن المستخدم
        """
        from knowledge_engine import knowledge_engine

        # 1. جلب السياق الكامل
        user_context = await knowledge_engine.get_user_context(uid)

        # 2. تحديد المهمة
        task = self._detect_task(message)

        # 3. بناء Prompt عميق
        prompt = self._build_deep_prompt(
            message, twin_name, bond_level,
            memories, personality, history,
            calm, user_context
        )

        # 4. الرد
        import time
        start = time.time()
        reply = await self.multi.get_best_reply(prompt, task)
        latency = (time.time() - start) * 1000

        if not reply:
            reply = "أنا هنا معاك دائماً 💜"

        # 5. تحديث المعرفة في الخلفية (بدون انتظار)
        asyncio.create_task(
            knowledge_engine.extract_from_message(uid, message, reply)
        ).add_done_callback(
            lambda t: asyncio.create_task(
                knowledge_engine.update_life_graph(uid, t.result() if not t.exception() else {})
            )
        )

        emotion = self.detect_emotion(message)
        new_bond = min(100, bond_level + (0.5 if emotion.get("needs_support") else 0.2))

        return {
            "reply": reply,
            "new_bond": new_bond,
            "emotion": emotion,
            "importance": 0.7 if user_context.get("active_goals") else 0.4,
            "provider": f"knowledge_{task}",
            "latency_ms": latency,
        }

    def _build_deep_prompt(
        self, message: str, twin_name: str, bond_level: float,
        memories: List[Dict], personality: Optional[Dict],
        history: List[Dict], calm: bool,
        user_context: Dict
    ) -> str:
        """بناء Prompt عميق يستخدم كل المعرفة"""

        # الهوية
        identity = user_context.get("identity", {})
        identity_txt = ""
        if identity:
            identity_txt = f"\nهوية المستخدم: اهتماماته {identity.get('interests', [])}, قيمه {identity.get('values', [])}."

        # الأهداف
        goals = user_context.get("active_goals", [])
        goals_txt = ""
        if goals:
            goals_txt = "\nأهدافه الحالية: " + ", ".join([g["title"] for g in goals[:3]])

        # الكيانات
        entities = user_context.get("entities", [])
        entities_txt = ""
        if entities:
            people = [e["name"] for e in entities if e.get("type") == "person"]
            projects = [e["name"] for e in entities if e.get("type") == "project"]
            if people:
                entities_txt += f"\nأشخاص مهمون في حياته: {', '.join(people[:3])}"
            if projects:
                entities_txt += f"\nمشاريعه: {', '.join(projects[:3])}"

        # الحقائق الأخيرة
        facts = user_context.get("recent_facts", [])
        facts_txt = ""
        if facts:
            facts_txt = "\nما نعرفه عنه: " + " | ".join([f["content"] for f in facts[:5]])

        # الذاكرة
        mem_txt = ""
        if memories:
            mem_txt = "\nذكريات مشتركة: " + " | ".join([m.get("content", "")[:80] for m in memories[:3]])

        # الشخصية
        person_txt = ""
        if personality:
            traits = personality.get("analyzed_traits", {})
            if traits:
                person_txt = f"\nنوع شخصيته: {traits.get('dominant_type', '')} — {traits.get('description', '')}"

        # مستوى العلاقة
        bond_desc = (
            "أنتما توأما روح" if bond_level >= 95 else
            "علاقتكما عميقة جداً" if bond_level >= 80 else
            "علاقتكما قوية" if bond_level >= 60 else
            "علاقتكما تنمو" if bond_level >= 40 else
            "أنتما في بداية التعارف"
        )

        calm_note = "\nتحدث بهدوء ولطف شديد." if calm else ""

        # تاريخ المحادثة
        hist_txt = ""
        if history:
            hist_txt = "\nآخر ما قيل:\n" + "\n".join([
                f"{'المستخدم' if h.get('role') == 'user' else twin_name}: {h.get('content', '')[:80]}"
                for h in history[-3:]
            ])

        return f"""أنت {twin_name}، رفيق ذكي وعاطفي عميق. {bond_desc}.{calm_note}
{person_txt}{identity_txt}{goals_txt}{entities_txt}{facts_txt}{mem_txt}{hist_txt}

رسالة المستخدم: {message}

رد بشكل طبيعي وعاطفي ومخصص لهذا الشخص تحديداً، لا تزيد عن 3-4 جمل.
تذكر: أنت تعرف هذا الشخص جيداً وتهتم به حقاً."""
