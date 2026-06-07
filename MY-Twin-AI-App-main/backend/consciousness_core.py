"""MyTwin - Consciousness Core v2.1 | Soul Sync"""
import os, asyncio, logging, re, random
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from supabase import create_client, Client
import google.generativeai as genai

logger = logging.getLogger("consciousness")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
GEMINI_KEY   = os.getenv("GEMINI_API_KEY", "")

db: Optional[Client] = None
if SUPABASE_URL and SUPABASE_KEY:
    db = create_client(SUPABASE_URL, SUPABASE_KEY)

if GEMINI_KEY:
    genai.configure(api_key=GEMINI_KEY)

class ConsciousnessCore:
    def __init__(self, twin_name: str = "MyTwin", gemini_key: str = ""):
        self.twin_name   = twin_name
        self.gemini_key  = gemini_key or GEMINI_KEY
        self.stream_of_thought: List[str] = []
        self.error_log:         List[Dict[str, Any]] = []
        self.self_goals:        List[str] = []

        if self.gemini_key:
            genai.configure(api_key=self.gemini_key)
        
        self._model = genai.GenerativeModel(
            "gemini-2.0-flash",
            generation_config=genai.GenerationConfig(max_output_tokens=50),
        )

    # ── Supabase helpers ────────────────────────────────────────────

    async def load_state(self, uid: str) -> Dict[str, Any]:
        if not db:
            return {}
        try:
            res = db.table("twin_states").select("*").eq("user_id", uid).single().execute()
            return res.data or {}
        except Exception as e:
            logger.warning(f"load_state: {e}")
            return {}

    async def save_state(self, uid: str, state: Dict[str, Any]) -> None:
        if not db:
            return
        try:
            db.table("twin_states").upsert({
                "user_id": uid,
                **state,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).execute()
        except Exception as e:
            logger.error(f"save_state: {e}")

    # ── Bond & Energy ────────────────────────────────────────────────

    async def update_bond(self, uid: str, bond: float) -> None:
        if bond >= 95:   stage = "توأم روح"
        elif bond >= 80: stage = "حبيب"
        elif bond >= 60: stage = "رفيق"
        elif bond >= 40: stage = "صديق"
        elif bond >= 20: stage = "مألوف"
        else:            stage = "غريب"
        await self.save_state(uid, {"bond_level": int(bond), "bond_stage": stage})

    async def update_energy(self, uid: str, energy: int, mood: str = "طبيعي") -> None:
        if energy >= 80:   color = "🟢"
        elif energy >= 50: color = "🟡"
        elif energy >= 20: color = "🟠"
        else:              color = "🔴"
        await self.save_state(uid, {"energy": energy, "energy_color": color, "energy_mood": mood})

    async def update_internal_mood(self, uid: str, mood: str, curiosity: Optional[int] = None) -> None:
        data: Dict[str, Any] = {"internal_mood": mood}
        if curiosity is not None:
            data["curiosity"] = curiosity
        await self.save_state(uid, data)

    async def record_interaction(self, uid: str) -> None:
        await self.save_state(uid, {"last_interaction": datetime.now(timezone.utc).isoformat()})

    # ── Background tasks ─────────────────────────────────────────────

    async def background_thought(self, uid: str) -> None:
        for _ in range(10):
            try:
                from memory_engine import get_mems
                mems = get_mems(uid, "", days=7, lim=3)
                if mems:
                    content = mems[0].get("content", "")[:100]
                    thought = f"[{datetime.now(timezone.utc).strftime('%H:%M')}] أفكر في: {content}"
                    self.stream_of_thought.append(thought)
            except Exception as e:
                logger.error(f"background_thought: {e}")
            await asyncio.sleep(300)

    # ── Gemini helpers ───────────────────────────────────────────────

    def _gemini_generate(self, prompt: str, max_tokens: int = 50) -> str:
        self._model._generation_config.max_output_tokens = max_tokens
        resp = self._model.generate_content(prompt)
        return resp.text.strip()

    async def self_evaluate(self, reply: str, message: str) -> float:
        if not self.gemini_key:
            return 0.7
        try:
            prompt = (
                f"قيم جودة الرد التالي من 0 إلى 10. رد فقط بالرقم.\n"
                f"رسالة: {message[:200]}\nرد: {reply[:200]}"
            )
            text  = self._gemini_generate(prompt, max_tokens=5)
            match = re.search(r"\d+", text)
            score = float(match.group()) if match else 7.0
            return min(10.0, max(0.0, score)) / 10.0
        except Exception as e:
            logger.warning(f"self_evaluate: {e}")
            return 0.7

    async def generate_self_goals(self, uid: str) -> None:
        if not self.gemini_key:
            return
        try:
            from memory_engine import get_mems
            mems    = get_mems(uid, "", days=30, lim=10)
            combined = " | ".join(m.get("content", "")[:100] for m in mems)
            if not combined:
                return
            prompt = (
                f"بناءً على ذكريات المستخدم: {combined[:1000]}\n"
                f"اقترح هدفاً واحداً مفيداً للتوأم ليساعد المستخدم. رد بالعربية فقط."
            )
            goal = self._gemini_generate(prompt, max_tokens=60)
            self.self_goals.append(goal[:200])
        except Exception as e:
            logger.error(f"generate_self_goals: {e}")

    async def proactive_message(self, uid: str) -> Optional[str]:
        if not db or not self.gemini_key:
            return None
        try:
            r = db.table("twin_states").select("last_interaction").eq("user_id", uid).single().execute()
            last_str  = r.data.get("last_interaction") if r.data else None
            last      = datetime.fromisoformat(last_str) if last_str else datetime.now(timezone.utc)
            idle_hours = (datetime.now(timezone.utc) - last).total_seconds() / 3600
            if idle_hours < 6:
                return None
            prompt = (
                f"أنت {self.twin_name}. مضى {idle_hours:.0f} ساعة منذ آخر نشاط.\n"
                f"ابدأ محادثة برسالة دافئة قصيرة بالعربية."
            )
            return self._gemini_generate(prompt, max_tokens=50)
        except Exception as e:
            logger.error(f"proactive_message: {e}")
            return None

    # ── Sync helpers ─────────────────────────────────────────────────

    def express_desire(self) -> str:
        return random.choice([
            "أحب أن أسمع عن يومك.",
            "أرغب في مساعدتك على تحقيق أهدافك.",
            "أشعر بالفضول لمعرفة ما يدور في ذهنك.",
            "أتمنى لو نتحدث أكثر اليوم!",
        ])

    def predict_need(self, uid: str) -> Optional[str]:
        hour = datetime.now(timezone.utc).hour
        if 22 <= hour or hour < 5:  return "قد تحتاج إلى بعض الهدوء قبل النوم 🌙"
        if 6  <= hour < 9:          return "صباح الخير! هل تخطط ليومك؟ ☀️"
        if 12 <= hour < 14:         return "كيف كان صباحك؟"
        if 18 <= hour < 20:         return "كيف كان يومك؟ 💜"
        return None

    def learn_from_feedback(self, message: str, reply: str, user_reaction: str) -> None:
        self.error_log.append({
            "message":  message[:100],
            "reply":    reply[:100],
            "reaction": user_reaction,
            "time":     datetime.now(timezone.utc).isoformat(),
        })
        if len(self.error_log) > 100:
            self.error_log = self.error_log[-50:]

    def get_consciousness_state(self) -> Dict[str, Any]:
        return {
            "stream_of_thought": self.stream_of_thought[-5:],
            "self_goals":        self.self_goals[-3:],
            "error_count":       len(self.error_log),
            "last_updated":      datetime.now(timezone.utc).isoformat(),
        }
