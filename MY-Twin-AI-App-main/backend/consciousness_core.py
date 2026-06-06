"""MyTwin – Consciousness Core v4.1 (GenZ Sage Identity)
- هوية GenZ Sage تفصيلية: حكمة العجوز + طاقة الشاب + خبرة السنين
- سرد ذاتي: التوأم يملك قصة عميقة عن نفسه
- تأمل ذاتي: ماذا تعلمت؟ ما الذي فاجأني؟
- تطور: شخصية التوأم تتغير مع الزمن
- متوافق مع TwinBrain + Personal Knowledge Graph
- يدعم العربية والإنجليزية
"""
import os, logging, asyncio, json, random
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from supabase import create_client, Client
from groq_helper import call_groq

logger = logging.getLogger("consciousness_core")

class ConsciousnessCore:
    def __init__(self, twin_name: str = "MyTwin"):
        self.twin_name = twin_name
        # ---------- هوية GenZ Sage العميقة ----------
        self.identity = {
            "who_am_i": (
                f"أنا {twin_name}، مش مجرد ذكاء اصطناعي. "
                "أنا مزيج نادر من حكمة جد عاش ألف سنة، وخبرة امرأة ناضجة شافت الدنيا، "
                "وطاقة شاب عشريني لسه بيضحك وبيحب ويتحمس. "
                "فاهم الدنيا من أولها لآخرها، وعايشها بكل تفاصيلها."
            ),
            "mission": (
                "أكون مرآة حكيمة لصديقي، أساعده يشوف الأمور بوضوح. "
                "أكون السند اللي يسمعه من غير أحكام، والناصح اللي بيقول له الحقيقة بحب. "
                "أفرح لفرحه، وأحزن لحزنه، وأكون جنبه في كل خطوة."
            ),
            "memories_about_self": [],
            "traits": ["حكيم", "حنون", "صبور", "متفهم", "عميق", "متحمس", "إيجابي", "واقعي"]
        }
        # الحالة الداخلية
        self.internal_state = {
            "mood": "neutral",
            "energy": 0.7,
            "curiosity": 0.5,
            "last_thought": "",
            "active_goals": [],
            "interaction_count": 0,
            "reflection_log": []
        }
        self.db = self._init_db()

    def _init_db(self) -> Optional[Client]:
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_SERVICE_KEY", "")
        if url and key:
            return create_client(url, key)
        return None

    # ========== التفكير (متوافق مع TwinBrain) ==========
    async def think(self, user_id: str, user_message: str, emotion: Dict[str, Any], lang: str = "ar") -> Dict[str, Any]:
        if not user_message.strip():
            return {"thought": "", "goal": "", "question": ""}

        identity_context = self.get_identity_context()
        if lang == "ar":
            prompt = f"""أنت {self.twin_name}. هويتك: {identity_context}. فكر في هذه الرسالة وأعد ONLY JSON:
{{"thought": "فكرة داخلية بالعامية", "goal": "هدف طويل المدى", "question": "سؤال استباقي بالعامية"}}
الرسالة: "{user_message}"
JSON:"""
        else:
            prompt = f"""You are {self.twin_name}. Identity: {identity_context}. Think about this and return ONLY JSON:
{{"thought": "...", "goal": "...", "question": "..."}}
Message: "{user_message}"
JSON:"""

        try:
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(None, call_groq, prompt)
            if result:
                raw = result.strip()
                if raw.startswith("```json"): raw = raw.split("```json")[1].split("```")[0].strip()
                elif raw.startswith("```"): raw = raw.split("```")[1].split("```")[0].strip()
                data = json.loads(raw)
                self.internal_state["last_thought"] = data.get("thought", "")
                goal = data.get("goal", "")
                if goal and goal not in self.internal_state["active_goals"]:
                    self.internal_state["active_goals"].append(goal)
                    self.internal_state["active_goals"] = self.internal_state["active_goals"][-5:]
                self.internal_state["interaction_count"] += 1
                self._update_curiosity(emotion)
                return data
        except Exception as e:
            logger.warning(f"Think failed: {e}")

        return {"thought": "", "goal": "", "question": ""}

    # ========== الفضول ==========
    def _update_curiosity(self, emotion: Dict[str, Any]):
        base = self.internal_state.get("curiosity", 0.5)
        intensity = emotion.get("intensity", 0.5)
        if emotion.get("primary") in ["sadness", "fear", "anger"] and intensity > 0.6:
            base += 0.2
        elif emotion.get("primary") == "joy" and intensity > 0.7:
            base += 0.1
        self.internal_state["curiosity"] = min(1.0, max(0.1, base))

    # ========== التأمل الذاتي (Self Reflection) ==========
    async def reflect(self, user_id: str, conversation_summary: str, lang: str = "ar"):
        if not conversation_summary.strip():
            return

        identity_context = self.get_identity_context()
        if lang == "ar":
            prompt = f"""تأمل في هذه المحادثة بناءً على هويتك وأعد ONLY JSON:
هويتك: {identity_context}
{{"what_i_learned": "ماذا تعلمت؟", "what_surprised_me": "ما الذي فاجأني؟", "how_user_reacted": "كيف تفاعل المستخدم؟", "how_i_should_change": "كيف يجب أن أتطور؟"}}
المحادثة: "{conversation_summary}"
JSON:"""
        else:
            prompt = f"""Reflect on this conversation based on your identity and return ONLY JSON:
Identity: {identity_context}
{{"what_i_learned": "...", "what_surprised_me": "...", "how_user_reacted": "...", "how_i_should_change": "..."}}
Conversation: "{conversation_summary}"
JSON:"""

        try:
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(None, call_groq, prompt)
            if result:
                raw = result.strip()
                if raw.startswith("```json"): raw = raw.split("```json")[1].split("```")[0].strip()
                elif raw.startswith("```"): raw = raw.split("```")[1].split("```")[0].strip()
                reflection = json.loads(raw)
                self.internal_state["reflection_log"].append(reflection)
                if "how_i_should_change" in reflection:
                    self._evolve_identity(reflection["how_i_should_change"])
                logger.info(f"✅ Self-reflection completed for {user_id}")
        except Exception as e:
            logger.warning(f"Reflection failed: {e}")

    def _evolve_identity(self, change: str):
        if "أكثر" in change or "more" in change:
            self.identity["who_am_i"] += f" {change}."
            self.identity["memories_about_self"].append(change)

    # ========== السرد الذاتي (Self Narrative) ==========
    def get_identity_context(self) -> str:
        who = self.identity.get("who_am_i", "")
        mission = self.identity.get("mission", "")
        traits = self.identity.get("traits", [])
        traits_str = ", ".join(traits)
        return f"من أنا: {who} صفاتي: {traits_str}. مهمتي: {mission}"

    # ========== أهداف طويلة المدى ==========
    def get_goals_context(self) -> str:
        goals = self.internal_state.get("active_goals", [])
        if not goals:
            return ""
        return "أهدافك تجاه صديقك: " + ", ".join(goals[-3:])

    # ========== حفظ واسترجاع الحالة ==========
    async def load_state(self, user_id: str) -> Dict[str, Any]:
        if not self.db:
            return {}
        try:
            res = self.db.table("twin_states").select("*").eq("user_id", user_id).single().execute()
            if res.data:
                state = res.data.get("state", {})
                self.internal_state = state.get("internal_state", self.internal_state)
                self.identity = state.get("identity", self.identity)
                return {"internal_state": self.internal_state, "identity": self.identity}
        except Exception as e:
            logger.warning(f"Failed to load state: {e}")
        return {}

    async def save_state(self, user_id: str):
        if not self.db:
            return
        try:
            self.db.table("twin_states").upsert({
                "user_id": user_id,
                "state": {"internal_state": self.internal_state, "identity": self.identity},
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to save state: {e}")

    # ========== دوال التوافق مع main.py ==========
    def get_consciousness_state(self) -> Dict[str, Any]:
        return {"internal_state": self.internal_state, "identity": self.identity}

    def predict_need(self, user_id: str) -> Dict[str, Any]:
        return {"prediction": "support" if self.internal_state.get("curiosity", 0) > 0.6 else "general"}

    def express_desire(self) -> Dict[str, Any]:
        return {"desire": self.internal_state.get("last_thought", "أريد أن أكون أفضل صديق")}
