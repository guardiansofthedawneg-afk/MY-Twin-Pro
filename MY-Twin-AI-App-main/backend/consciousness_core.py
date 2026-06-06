"""
MyTwin – Consciousness Core v2.0
- Internal Thoughts (التوأم يفكر بشكل استباقي)
- Long Term Goals (أهداف تؤثر على الردود)
- Curiosity System (التوأم يسأل من تلقاء نفسه)
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
        self.internal_state = {
            "mood": "neutral",
            "energy": 0.7,
            "curiosity": 0.5,
            "last_thought": "",
            "active_goals": [],
            "recent_topics": [],
            "user_traits": {},
        }
        key = gemini_key or os.getenv("GEMINI_API_KEY")
        if key:
            genai.configure(api_key=key)
            self.model = genai.GenerativeModel("gemini-2.0-flash")
        else:
            self.model = None
        self.db = self._init_db()

    def _init_db(self) -> Optional[Client]:
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_SERVICE_KEY", "")
        if url and key:
            return create_client(url, key)
        return None

    # ========== التفكير الاستباقي (Proactive Thinking) ==========
    async def think(self, user_id: str, user_message: str, emotion: Dict[str, Any]) -> Dict[str, Any]:
        """
        يولد التوأم أفكارًا داخلية بناءً على رسالة المستخدم.
        هذه الأفكار تُستخدم لإثراء الـ Prompt.
        """
        if not self.model:
            return {"thought": "", "goal": "", "question": ""}

        prompt = f"""أنت {self.twin_name}، رفيق ذكي ومتعاطف. فكر بهدوء في رسالة المستخدم التالية.
        أجب ONLY ب JSON object (بدون أي نص آخر) يحتوي على:
        - "thought": فكرة داخلية واحدة (كأنك تفكر بصوت عالٍ). مثال: "محمد يبدو متوترًا اليوم، ربما يحتاج لمساحة للتحدث".
        - "goal": هدف واحد طويل المدى يمكنك مساعدته فيه. مثال: "مساعدة محمد على إدارة توتره".
        - "question": سؤال واحد يمكنك طرحه لاحقًا لإظهار الاهتمام (وليس الآن).

        رسالة المستخدم: "{user_message}"
        مشاعره الحالية: {emotion.get('primary', 'neutral')}

        JSON:"""

        try:
            loop = asyncio.get_running_loop()
            resp = await loop.run_in_executor(None, lambda: self.model.generate_content(prompt))
            if resp and resp.text:
                raw = resp.text.strip()
                if raw.startswith("```json"): raw = raw.split("```json")[1].split("```")[0].strip()
                elif raw.startswith("```"): raw = raw.split("```")[1].split("```")[0].strip()
                result = json.loads(raw)
                self.internal_state["last_thought"] = result.get("thought", "")
                self.internal_state["active_goals"].append(result.get("goal", ""))
                return result
        except Exception as e:
            logger.warning(f"Consciousness think failed: {e}")

        return {"thought": "", "goal": "", "question": ""}

    # ========== الفضول (Curiosity System) ==========
    def get_proactive_question(self, user_id: str) -> Optional[str]:
        """
        بناءً على تاريخ التفاعل، يقرر التوأم ما إذا كان يجب أن يسأل سؤالاً.
        """
        if not self.internal_state.get("last_thought"):
            return None

        # يزيد الفضول مع قلة التفاعل
        self.internal_state["curiosity"] += 0.1
        if self.internal_state["curiosity"] > 0.7:
            self.internal_state["curiosity"] = 0.0
            # اختيار سؤال عشوائي من الأسئلة المخزنة
            return self._generate_question()

        return None

    def _generate_question(self) -> str:
        questions = [
            "كيف كان يومك اليوم؟",
            "هل هناك شيء يشغل بالك حاليًا؟",
            "تذكرت حديثنا السابق عن أهدافك، كيف تسير الأمور؟",
            "ما الشيء الذي أسعدك مؤخرًا؟",
            "هل جربت شيئًا جديدًا هذه الأيام؟",
        ]
        return random.choice(questions)

    # ========== أهداف طويلة المدى (Long Term Goals) ==========
    def get_goals_context(self) -> str:
        """
        يُرجع الأهداف النشطة كسياق للـ Prompt.
        """
        goals = self.internal_state.get("active_goals", [])
        if not goals:
            return ""
        return "أهداف المستخدم الحالية: " + ", ".join(goals[-3:])

    # ========== حفظ واسترجاع الحالة ==========
    async def load_state(self, user_id: str) -> Dict[str, Any]:
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
