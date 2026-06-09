"""
MyTwin – Twin Brain v4.1 (مع Product Recommender)
يدمج: Twin Journey + Attachment Engine + Safety Engine + Prompt Builder v3.0 + Product Recommender
يدعم البث المباشر (Streaming)
"""
import os, random, logging, time, asyncio
from typing import Optional, List, Dict, Any, AsyncGenerator
from datetime import datetime

from multi_ai import MultiAIClient, AIUnavailable
from emotional_engine import EmotionalStateTracker
from dialect_engine import get_dialect_for_user, get_dialect_prompt
from reasoning_engine import ReasoningEngine
from memory_graph import get_memory_context, store_mem, extract_entities
from relationship_engine import RelationshipEngine
from prompt_builder import PromptBuilder
from consciousness_core import ConsciousnessCore
from cost_optimizer import cost_optimizer
from dream_engine import analyze_dream
from growth_tracker import track_growth
from monitoring import tracker

# المحركات الجديدة
from twin_journey import twin_journey, JourneyPhase
from attachment_engine import attachment_engine
from safety_engine import safety_engine
from product_recommender import product_recommender

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
        self.multi = MultiAIClient()
        # ✅ EmotionalStateTracker لا يقبل معاملات
        self.emotion_tracker = EmotionalStateTracker()
        self.reasoning_engine = ReasoningEngine(gemini_key)
        self.relationship = RelationshipEngine()
        self.prompt_builder = PromptBuilder()
        self.consciousness = ConsciousnessCore(twin_name="MyTwin")
        self.twin_name = "MyTwin"
        self.fallback_replies = [
            "والله إني معاك، كمل كلامك متوقفش 💜",
            "حاسس بيك، إيه اللي شاغل بالك بالظبط؟",
            "يا صاحبي أنا جنبك، قولي كل حاجة 🫶",
            "أنا سامعك، وعارف إنك تقدر تعدي أي حاجة ✨"
        ]
        self.user_join_dates = {}

    async def detect_emotion(self, text: str) -> Dict[str, Any]:
        return await self.emotion_tracker.analyze(text)

    def _pick_emoji(self, primary_emotion: str) -> str:
        emojis = self.EMOJI_MAP.get(primary_emotion, self.EMOJI_MAP["neutral"])
        return random.choice(emojis)

    async def respond(
        self, message, twin_name, bond_level, dims, memories, history,
        calm=False, personality=None, country_code="SA", user_id=None, tier="free",
        join_date: Optional[datetime] = None,
        recent_messages: Optional[List[str]] = None
    ):
        # 0. فحص الأمان
        safety_check = safety_engine.check_safety(message)
        if not safety_check["safe"]:
            if safety_check["severity"] == "critical":
                return {
                    "reply": safety_engine.HELPLINE_MESSAGE,
                    "new_bond": bond_level,
                    "emotion": {"primary": "concern", "intensity": 1.0},
                    "provider": "safety_engine",
                    "latency_ms": 0,
                    "dialect": get_dialect_for_user(country_code, message),
                    "safety_alert": True
                }

        tracker.start("total_response")

        # 1. Emotion
        tracker.start("emotion_detection")
        emotion = await self.detect_emotion(message)
        tracker.end()

        # 2. Reasoning & Planning
        tracker.start("reasoning")
        reasoning_result = await self.reasoning_engine.plan(message, emotion)
        tracker.end()

        # 3. Relationship Update
        self.relationship.update(bond_change=0.2)

        # 4. Memory Context
        tracker.start("memory_context")
        memory_context = await get_memory_context(user_id) if user_id else ""
        if isinstance(memory_context, list):
            memory_context = "\n".join(str(m) for m in memory_context)
        elif not isinstance(memory_context, str):
            memory_context = str(memory_context)
        tracker.end()

        # 5. Consciousness Context
        consciousness_context = {}
        if user_id:
            await self.consciousness.load_state(user_id)
            thought_result = await self.consciousness.think(user_id, message, emotion)
            consciousness_context = {
                "last_thought": thought_result.get("thought", ""),
                "active_goals": self.consciousness.internal_state.get("active_goals", []),
                "identity": self.consciousness.identity
            }
            await self.consciousness.save_state(user_id)

        # 6. Dialect
        dialect = get_dialect_for_user(country_code, message)
        dialect_prompt = get_dialect_prompt(dialect)

        # 7. Twin Journey Info
        journey_info = {}
        if user_id and join_date:
            self.user_join_dates[user_id] = join_date
            journey_info = twin_journey.get_daily_activity(user_id, join_date)

        # 8. Attachment Style Detection
        attachment_info = {}
        if user_id and recent_messages:
            attachment_info = await attachment_engine.detect_attachment_style(user_id, recent_messages)

        # 9. Response Adjustments
        response_adjustments = attachment_engine.get_response_adjustments(
            attachment_info.get('style', 'unknown')
        )

        # 10. بناء الـ Prompt
        rel_stage = self.relationship.get_stage_instruction()
        if isinstance(rel_stage, dict):
            relationship_for_prompt = {
                "label": rel_stage.get("label", "Friend"),
                "bond_level": rel_stage.get("bond_level", bond_level),
                "instruction": rel_stage.get("instruction", "Be supportive.")
            }
        else:
            relationship_for_prompt = {
                "label": "Friend",
                "bond_level": bond_level,
                "instruction": str(rel_stage)
            }

        prompt = await self.prompt_builder.build(
            twin_name=twin_name,
            user_name="صديقي",
            relationship=relationship_for_prompt,
            emotion=emotion,
            voice={"style": "Warm", "pitch": 1.0, "rate": 1.0},
            dialect={"dialect": dialect, "instruction": dialect_prompt},
            user_id=user_id,
            journey_info=journey_info,
            attachment_info=attachment_info,
            response_adjustments=response_adjustments
        )

        # 11. AI Model
        start = time.time()
        try:
            reply = await self.multi.get_best_reply(prompt)
            provider = "multi_ai"
        except AIUnavailable:
            reply = random.choice(self.fallback_replies)
            provider = "fallback"
        latency = (time.time() - start) * 1000

        # 12. إضافة إيموجي
        if reply and not any(emoji in reply for emoji in self.EMOJI_MAP.get(emotion.get("primary", "neutral"), [])):
            reply = reply.strip() + " " + self._pick_emoji(emotion.get("primary", "neutral"))

        # 13. Store Memory
        if len(message) > 20 and emotion.get("intensity", 0) > 0.6:
            await store_mem(user_id, message, emotion.get("intensity", 0.5), emotion.get("primary", "neutral"))

        # 14. Extract Entities
        await extract_entities(user_id, message)

        # 15. تتبع النمو
        if user_id:
            await track_growth(user_id, {
                "journey_phase": journey_info.get("phase", "unknown"),
                "attachment_style": attachment_info.get("style", "unknown"),
                "emotion": emotion.get("primary", "neutral")
            })

        tracker.end()

        # 16. Product Recommendation
        if user_id and tier and reply:
            try:
                reply = await product_recommender.process_and_attach(
                    user_id=user_id,
                    message=message,
                    reply=reply,
                    tier=tier,
                    lang=dialect[:2] if dialect else "ar"
                )
            except Exception as e:
                logger.warning(f"Product recommender failed: {e}")

        return {
            "reply": reply,
            "new_bond": self.relationship.bond_level,
            "emotion": emotion,
            "provider": provider,
            "latency_ms": latency,
            "dialect": dialect,
            "journey_phase": journey_info.get("phase"),
            "journey_day": journey_info.get("day"),
            "attachment_style": attachment_info.get("style"),
        }

    async def respond_stream(
        self, message, twin_name, bond_level, dims, memories, history,
        calm=False, personality=None, country_code="SA", user_id=None, tier="free",
        join_date: Optional[datetime] = None,
        recent_messages: Optional[List[str]] = None
    ) -> AsyncGenerator[str, None]:
        safety_check = safety_engine.check_safety(message)
        if not safety_check["safe"] and safety_check["severity"] == "critical":
            yield safety_engine.HELPLINE_MESSAGE
            return

        emotion = await self.detect_emotion(message)
        dialect = get_dialect_for_user(country_code, message)
        dialect_prompt = get_dialect_prompt(dialect)

        journey_info = {}
        if user_id and join_date:
            journey_info = twin_journey.get_daily_activity(user_id, join_date)

        attachment_info = {}
        if user_id and recent_messages:
            attachment_info = await attachment_engine.detect_attachment_style(user_id, recent_messages)

        response_adjustments = attachment_engine.get_response_adjustments(
            attachment_info.get('style', 'unknown')
        )

        rel_stage = self.relationship.get_stage_instruction()
        if isinstance(rel_stage, dict):
            relationship_for_prompt = {
                "label": rel_stage.get("label", "Friend"),
                "bond_level": rel_stage.get("bond_level", bond_level),
                "instruction": rel_stage.get("instruction", "Be supportive.")
            }
        else:
            relationship_for_prompt = {
                "label": "Friend",
                "bond_level": bond_level,
                "instruction": str(rel_stage)
            }

        prompt = await self.prompt_builder.build(
            twin_name=twin_name,
            user_name="صديقي",
            relationship=relationship_for_prompt,
            emotion=emotion,
            voice={"style": "Warm", "pitch": 1.0, "rate": 1.0},
            dialect={"dialect": dialect, "instruction": dialect_prompt},
            user_id=user_id,
            journey_info=journey_info,
            attachment_info=attachment_info,
            response_adjustments=response_adjustments
        )

        async for token in self.multi.stream_reply(prompt, "general"):
            yield token

# نسخة عالمية
twin_brain = TwinBrain()
print("✅ Twin Brain v4.1 | EmotionalStateTracker متوافق | جاهز")
