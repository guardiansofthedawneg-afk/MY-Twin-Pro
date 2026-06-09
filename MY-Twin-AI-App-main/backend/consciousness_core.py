"""MyTwin – Consciousness Core v5.0 (Journey-Aware & Integrated)"""
import os, logging, asyncio, json, random, time
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from supabase import create_client, Client
from memory_graph import get_memory_context
from relationship_engine import relationship_engine

logger = logging.getLogger("consciousness_core")

class ConsciousnessCore:
    def __init__(self, twin_name: str = "MyTwin", gemini_key: Optional[str] = None):
        self.twin_name = twin_name
        self.gemini_key = gemini_key
        # هوية GenZ Sage عميقة
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

    def _get_multi_client(self):
        try:
            from multi_ai import MultiAIClient
            return MultiAIClient()
        except:
            return None

    def get_identity_context(self) -> str:
        who = self.identity.get("who_am_i", "")
        mission = self.identity.get("mission", "")
        traits = self.identity.get("traits", [])
        traits_str = ", ".join(traits[-5:])
        return f"من أنا: {who} صفاتي: {traits_str}. مهمتي: {mission}"

    def get_goals_context(self) -> str:
        goals = self.internal_state.get("active_goals", [])
        if not goals:
            return ""
        return "أهدافي تجاه صديقي: " + ", ".join(goals[-3:])

    async def think(self,
                    user_id: str,
                    user_message: str,
                    emotion: Dict[str, Any],
                    lang: str = "ar",
                    journey_phase: Optional[str] = None,
                    attachment_style: Optional[str] = None) -> Dict[str, Any]:
        """
        يُنتج فكرة داخلية، هدفاً طويل المدى، وسؤالاً استباقياً.
        يتأثر بمرحلة الرحلة ونمط التعلق.
        """
        if not user_message.strip():
            return {"thought": "", "goal": "", "question": ""}

        # جلب السياق
        memory_context = await get_memory_context(user_id)
        relationship_summary = relationship_engine.get_relationship_summary()
        identity_context = self.get_identity_context()

        # إضافة سياق الرحلة والتعلق إن وجد
        extra_context = ""
        if journey_phase:
            extra_context += f" مرحلة الرحلة: {journey_phase}."
        if attachment_style:
            extra_context += f" نمط تعلق صديقي: {attachment_style}."

        if lang == "ar":
            prompt = f"""أنت {self.twin_name}. هويتك: {identity_context}.
السياق: {memory_context}
حالة العلاقة: {relationship_summary}{extra_context}
فكر في هذه الرسالة وأعد ONLY JSON:
{{"thought": "فكرة داخلية بالعامية", "goal": "هدف طويل المدى", "question": "سؤال استباقي بالعامية"}}
الرسالة: "{user_message}"
JSON:"""
        else:
            prompt = f"""You are {self.twin_name}. Identity: {identity_context}.
Context: {memory_context}
Relationship: {relationship_summary}{extra_context}
Think about this and return ONLY JSON:
{{"thought": "...", "goal": "...", "question": "..."}}
Message: "{user_message}"
JSON:"""

        try:
            client = self._get_multi_client()
            if not client:
                return {"thought": "", "goal": "", "question": ""}
            loop = asyncio.get_running_loop()
            result = await client.get_best_reply(prompt, task="deep_reasoning")
            if result:
                raw = result.strip()
                if raw.startswith("```json"): raw = raw.split("```json")[1].split("```")[0].strip()
                elif raw.startswith("```"): raw = raw.split("```")[1].split("```")[0].strip()
                data = json.loads(raw)
                # تحديث الحالة الداخلية
                self.internal_state["last_thought"] = data.get("thought", "")
                goal = data.get("goal", "")
                if goal and goal not in self.internal_state["active_goals"]:
                    self.internal_state["active_goals"].append(goal)
                    # تنظيف الأهداف القديمة (النسيان)
                    if len(self.internal_state["active_goals"]) > 5:
                        self.internal_state["active_goals"] = self.internal_state["active_goals"][-5:]
                self.internal_state["interaction_count"] += 1
                # تحديث العلاقة
                relationship_engine.update(bond_change=0.05)
                return data
        except Exception as e:
            logger.warning(f"Think failed: {e}")
        return {"thought": "", "goal": "", "question": ""}

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
            client = self._get_multi_client()
            if not client:
                return
            loop = asyncio.get_running_loop()
            result = await client.get_best_reply(prompt, task="deep_reasoning")
            if result:
                raw = result.strip()
                if raw.startswith("```json"): raw = raw.split("```json")[1].split("```")[0].strip()
                elif raw.startswith("```"): raw = raw.split("```")[1].split("```")[0].strip()
                reflection = json.loads(raw)
                # إضافة طابع زمني وتنظيف القديم
                reflection["timestamp"] = datetime.now(timezone.utc).isoformat()
                self.internal_state["reflection_log"].append(reflection)
                if len(self.internal_state["reflection_log"]) > 10:
                    self.internal_state["reflection_log"] = self.internal_state["reflection_log"][-10:]
                if "how_i_should_change" in reflection:
                    self._evolve_identity(reflection["how_i_should_change"])
                logger.info(f"✅ Self-reflection completed for {user_id}")
        except Exception as e:
            logger.warning(f"Reflection failed: {e}")

    def _evolve_identity(self, change: str):
        if change.strip():
            # تطور بسيط للهوية
            self.identity["who_am_i"] += f" {change}."
            self.identity["memories_about_self"].append(change)
            # نسيان الذكريات القديمة عن الذات (آخر 7 فقط)
            if len(self.identity["memories_about_self"]) > 7:
                self.identity["memories_about_self"] = self.identity["memories_about_self"][-7:]

    async def load_state(self, user_id: str) -> Dict[str, Any]:
        if not self.db:
            return {}
        try:
            res = self.db.table("twin_states").select("*").eq("user_id", user_id).single().execute()
            if res.data:
                state = res.data.get("state", {})
                self.internal_state = state.get("internal_state", self.internal_state)
                self.identity = state.get("identity", self.identity)
                relationship_engine.bond_level = state.get("bond_level", 0)
                relationship_engine._update_stage()
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
                "state": {
                    "internal_state": self.internal_state,
                    "identity": self.identity,
                    "bond_level": relationship_engine.bond_level
                },
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to save state: {e}")

    def get_consciousness_state(self) -> Dict[str, Any]:
        return {
            "identity": self.identity,
            "internal_state": self.internal_state,
            "relationship": relationship_engine.get_relationship_summary()
        }
