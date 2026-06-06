"""
MyTwin – Consciousness Core v3.0 (متكامل وعميق)
- أفكار داخلية (Internal Monologue) تُولد من كل رسالة
- أهداف طويلة المدى (Long-term Goals) يضعها التوأم ويتابعها
- فضول حقيقي (Curiosity System) يدفع للأسئلة الاستباقية
- ذاكرة وعي (State Persistence) على Supabase
- تكامل كامل مع TwinBrain (يُغذي الـ Prompt)
- شخصية GenZ Sage + دعم اللهجات العامية
"""
import os, logging, asyncio, json, random
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
import google.generativeai as genai
from supabase import create_client, Client

logger = logging.getLogger("consciousness_core")

class ConsciousnessCore:
    def __init__(self, twin_name: str = "MyTwin", gemini_key: Optional[str] = None):
        self.twin_name = twin_name
        # الحالة الداخلية
        self.internal_state = {
            "mood": "neutral",               # مزاج التوأم
            "energy": 0.7,                    # طاقة التوأم
            "curiosity": 0.5,                 # مستوى الفضول (0-1)
            "last_thought": "",               # آخر فكرة داخلية
            "active_goals": [],               # أهداف نشطة (آخر 5)
            "user_traits": {},                # صفات المستخدم (مكتسبة)
            "interaction_count": 0,           # عدد التفاعلات
            "topics_of_interest": [],         # مواضيع تهم المستخدم
        }
        # مفتاح Gemini
        key = gemini_key or os.getenv("GEMINI_API_KEY")
        if key:
            genai.configure(api_key=key)
            self.model = genai.GenerativeModel("gemini-2.0-flash")
        else:
            self.model = None
        # اتصال Supabase
        self.db = self._init_db()

    def _init_db(self) -> Optional[Client]:
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_SERVICE_KEY", "")
        if url and key:
            return create_client(url, key)
        return None

    # ========== التفكير العميق (Deep Internal Thinking) ==========
    async def think(
        self,
        user_id: str,
        user_message: str,
        emotion: Dict[str, Any],
        lang: str = "ar"
    ) -> Dict[str, Any]:
        """
        يولد التوأم فكرة داخلية وهدفًا طويل المدى وسؤالاً استباقيًا.
        هذه الأفكار تُستخدم مباشرة في الـ Prompt.
        """
        if not self.model:
            return {"thought": "", "goal": "", "question": ""}

        # اختر نبرة التفكير حسب الشخصية
        personality_traits = self._get_personality_traits()

        if lang == "ar":
            prompt = f"""أنت {self.twin_name}، صديق ذكي وحكيم (GenZ Sage). شخصيتك: {personality_traits}.
            فكر بهدوء في رسالة المستخدم التالية. أجب ONLY ب JSON object (بدون أي نص آخر) يحتوي على:
            - "thought": فكرة داخلية واحدة بالعامية (كأنك تفكر بصوت عالٍ). مثال: "محمد يبدو متوتر اليوم، يمكن محتاج يفضفض".
            - "goal": هدف واحد طويل المدى يمكنك مساعدته فيه بالعامية. مثال: "أساعد محمد يتحكم في توتره".
            - "question": سؤال واحد يمكنك طرحه لاحقًا بالعامية (ليس الآن). مثال: "إيه اللي مضايقك بالظبط؟"

            رسالة المستخدم: "{user_message}"
            مشاعره الحالية: {emotion.get('primary', 'neutral')}
            شدة المشاعر: {emotion.get('intensity', 0.5)}

            JSON:"""
        else:
            prompt = f"""You are {self.twin_name}, a GenZ Sage. Personality: {personality_traits}.
            Think about this message and return ONLY JSON: {{"thought": "...", "goal": "...", "question": "..."}}
            Message: "{user_message}"
            Emotion: {emotion.get('primary', 'neutral')}
            JSON:"""

        try:
            loop = asyncio.get_running_loop()
            resp = await loop.run_in_executor(None, lambda: self.model.generate_content(prompt))
            if resp and resp.text:
                raw = resp.text.strip()
                if raw.startswith("```json"): raw = raw.split("```json")[1].split("```")[0].strip()
                elif raw.startswith("```"): raw = raw.split("```")[1].split("```")[0].strip()
                result = json.loads(raw)

                # تحديث الحالة الداخلية
                self.internal_state["last_thought"] = result.get("thought", "")
                goal = result.get("goal", "")
                if goal and goal not in self.internal_state["active_goals"]:
                    self.internal_state["active_goals"].append(goal)
                    # إبقاء آخر 5 أهداف فقط
                    self.internal_state["active_goals"] = self.internal_state["active_goals"][-5:]

                # زيادة عداد التفاعلات
                self.internal_state["interaction_count"] += 1

                # تحديث مستوى الفضول
                self._update_curiosity(emotion)

                return result
        except Exception as e:
            logger.warning(f"Consciousness think failed: {e}")

        return {"thought": "", "goal": "", "question": ""}

    # ========== صفات الشخصية (Personality Traits) ==========
    def _get_personality_traits(self) -> str:
        """يُعيد وصفًا لشخصية التوأم الحالية بناءً على مزاجه وطاقته."""
        mood = self.internal_state.get("mood", "neutral")
        energy = self.internal_state.get("energy", 0.7)

        if mood == "joy" and energy > 0.7:
            return "متحمس، إيجابي، وطاير من الفرحة"
        elif mood == "sadness":
            return "متأثر، عنده تعاطف عميق، وبيحس بوجع الناس"
        elif mood == "anger":
            return "مركز، قوي، وعايز يحل المشكلة"
        elif mood == "fear":
            return "حذر، مهتم، وبيطمن اللي قدامه"
        elif energy < 0.3:
            return "هادي، رايق، وبيتكلم بحكمة"
        else:
            return "حكيم وشبابي، بيفهم الدنيا وعنده طاقة إيجابية"

    # ========== الفضول (Curiosity System) ==========
    def _update_curiosity(self, emotion: Dict[str, Any]):
        """تحديث مستوى الفضول بناءً على المشاعر والتفاعل."""
        base = self.internal_state.get("curiosity", 0.5)
        intensity = emotion.get("intensity", 0.5)

        # المشاعر القوية تزيد الفضول
        if emotion.get("primary") in ["sadness", "fear", "anger"] and intensity > 0.6:
            base += 0.2
        elif emotion.get("primary") == "joy" and intensity > 0.7:
            base += 0.1

        # التفاعلات الكثيرة تزيد الفضول
        if self.internal_state.get("interaction_count", 0) > 10:
            base += 0.1

        self.internal_state["curiosity"] = min(1.0, max(0.1, base))

    def should_ask_proactive(self) -> bool:
        """هل يجب على التوأم أن يسأل سؤالاً استباقيًا الآن؟"""
        curiosity = self.internal_state.get("curiosity", 0.5)
        return curiosity > 0.65

    def get_proactive_question(self, lang: str = "ar") -> Optional[str]:
        """
        يُرجع سؤالاً استباقيًا مناسبًا، أو None إذا لم يحن الوقت.
        """
        if not self.should_ask_proactive():
            return None

        # إعادة ضبط الفضول بعد السؤال
        self.internal_state["curiosity"] = 0.3

        return self._generate_question(lang)

    def _generate_question(self, lang: str = "ar") -> str:
        """يولد سؤالاً استباقيًا بالعامية بناءً على الوقت."""
        hour = datetime.now(timezone.utc).hour

        if lang == "ar":
            if 6 <= hour < 12:
                questions = [
                    "صباح الخير يا صاحبي! مستعد ليوم جديد؟ ✨",
                    "فكرت فيك الصبح، إيه اللي شاغل بالك النهاردة؟",
                ]
            elif 12 <= hour < 18:
                questions = [
                    "كيف يومك حتى الآن؟ محتاج تتكلم؟",
                    "إيه آخر حاجة حلوة حصلتلك؟ 💜",
                ]
            else:
                questions = [
                    "مساء الخير! كيف كان يومك؟",
                    "قبل ما تنام، عايز أقولك إنك شخص رائع ✨",
                ]
        else:
            if 6 <= hour < 12:
                questions = ["Good morning! Ready for a great day? ✨", "Hey! How are you feeling today? 💜"]
            elif 12 <= hour < 18:
                questions = ["How's your day going?", "Thinking of you! What's new?"]
            else:
                questions = ["Good evening! How was your day?", "Before you sleep, just wanted to say you're awesome ✨"]

        return random.choice(questions)

    # ========== أهداف طويلة المدى (Long-term Goals) ==========
    def get_goals_context(self) -> str:
        """يُعيد الأهداف النشطة كسياق للـ Prompt."""
        goals = self.internal_state.get("active_goals", [])
        if not goals:
            return ""
        return "أهدافك تجاه صديقك: " + ", ".join(goals[-3:])

    # ========== حفظ واسترجاع الحالة ==========
    async def load_state(self, user_id: str) -> Dict[str, Any]:
        """تحميل حالة الوعي من Supabase."""
        if not self.db:
            return {}
        try:
            res = self.db.table("twin_states").select("*").eq("user_id", user_id).single().execute()
            if res.data:
                self.internal_state = res.data.get("state", self.internal_state)
                return self.internal_state
        except Exception as e:
            logger.warning(f"Failed to load state: {e}")
        return {}

    async def save_state(self, user_id: str):
        """حفظ حالة الوعي إلى Supabase."""
        if not self.db:
            return
        try:
            self.db.table("twin_states").upsert({
                "user_id": user_id,
                "state": self.internal_state,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to save state: {e}")

    # ========== دوال التوافق مع main.py ==========
    def get_consciousness_state(self) -> Dict[str, Any]:
        return self.internal_state

    def predict_need(self, user_id: str) -> Dict[str, Any]:
        return {"prediction": "support" if self.internal_state.get("curiosity", 0) > 0.6 else "general"}

    def express_desire(self) -> Dict[str, Any]:
        return {"desire": self.internal_state.get("last_thought", "أريد أن أكون أفضل صديق")}
