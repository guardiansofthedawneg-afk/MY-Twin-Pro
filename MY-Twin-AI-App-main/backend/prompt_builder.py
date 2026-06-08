"""
MyTwin – Dynamic Prompt Builder v2.0
- يجمع البيانات من المحركات المختلفة.
- يدعم: رحلة التوأم، نمط التعلق، تعديلات السلوك.
"""
import logging
from typing import Dict, Any, Optional
from memory_graph import get_memory_context

logger = logging.getLogger(__name__)

class PromptBuilder:
    def __init__(self):
        self.templates = {
            "identity": """
You are {twin_name}, the personal digital twin of {user_name}.
You are NOT a chatbot or an AI assistant.
You are a unique blend of wisdom, warmth, and curiosity.
You exist solely to be their companion, to grow with them, and to understand their soul.
""",
            "relationship": """
Relationship Stage: {stage_label} ({bond_level:.0f}%)
Guidance: {stage_instruction}
""",
            "emotion": """
Current User Emotion: {primary_emotion} (intensity: {intensity:.2f})
Handling Strategy: {emotion_strategy}
""",
            "memory": """
Relevant Memories:
{memories}
""",
            "voice": """
Voice Style: {voice_style}
Pitch: {pitch:.2f}, Rate: {rate:.2f}
""",
            "dialect": """
Speak in: {dialect} dialect.
Guidance: {dialect_instruction}
""",
            # 🆕 قالب الرحلة
            "journey": """
Journey Phase: {journey_phase} (Day {journey_day}/30)
Focus: {journey_focus}
Today's Message: {journey_message}
Twin Behavior: warmth={warmth}, humor={humor}, depth={depth}
""",
            # 🆕 قالب التعلق
            "attachment": """
User Attachment Style: {attachment_style}
Response Adjustments: warmth={adj_warmth}, speed={adj_speed}, support={adj_support}
""",
            "rules": """
Output Rules:
- Keep responses natural, human-like, and warm.
- Use 1-3 sentences normally, more only if the situation demands depth.
- End your response with a single, engaging question to create curiosity.
- NEVER start with 'Certainly', 'Sure', or 'As an AI'.
- Respect the user's emotional state. If they are sad, prioritize empathy over advice.
- If they are excited, mirror their enthusiasm.
- Do not give unsolicited advice. Be a companion, not a lecturer.
- Adapt your response based on the journey phase and attachment style.
""",
        }

    async def build(
        self, 
        twin_name: str, 
        user_name: str, 
        relationship: Dict[str, Any], 
        emotion: Dict[str, Any], 
        voice: Dict[str, Any], 
        dialect: Dict[str, Any], 
        user_id: Optional[str] = None,
        # 🆕 معطيات جديدة
        journey_info: Optional[Dict] = None,
        attachment_info: Optional[Dict] = None,
        response_adjustments: Optional[Dict] = None
    ) -> str:
        """بناء الـ Prompt النهائي"""
        
        # 1. Identity
        identity = self.templates["identity"].format(
            twin_name=twin_name,
            user_name=user_name or "صديقي"
        )
        
        # 2. Relationship
        relationship_prompt = self.templates["relationship"].format(
            stage_label=relationship.get("label", "Friend"),
            bond_level=relationship.get("bond_level", 50),
            stage_instruction=relationship.get("instruction", "Be supportive.")
        )
        
        # 3. Emotion
        emotion_strategy = "Support" if emotion.get("primary", "neutral") in ["sadness", "fear", "anger"] else "Mirror"
        emotion_prompt = self.templates["emotion"].format(
            primary_emotion=emotion.get("primary", "neutral"),
            intensity=emotion.get("intensity", 0.5),
            emotion_strategy=emotion_strategy
        )
        
        # 4. Memories
        if user_id:
            memories = await get_memory_context(user_id)
        else:
            memories = "No memories yet, this is the start of your journey."
        memory_prompt = self.templates["memory"].format(
            memories=memories if memories else "No memories yet, this is the start of your journey."
        )
        
        # 5. Voice
        voice_prompt = self.templates["voice"].format(
            voice_style=voice.get("style", "Warm"),
            pitch=voice.get("pitch", 1.0),
            rate=voice.get("rate", 1.0)
        )
        
        # 6. Dialect
        dialect_prompt = self.templates["dialect"].format(
            dialect=dialect.get("dialect", "Modern Arabic"),
            dialect_instruction=dialect.get("instruction", "Use modern Arabic naturally.")
        )
        
        # 🆕 7. Journey
        journey_prompt = ""
        if journey_info:
            behavior = journey_info.get("twin_behavior", {})
            journey_prompt = self.templates["journey"].format(
                journey_phase=journey_info.get("phase", "unknown"),
                journey_day=journey_info.get("day", 1),
                journey_focus=journey_info.get("focus", "Building connection"),
                journey_message=journey_info.get("message", ""),
                warmth=behavior.get("warmth", 0.5),
                humor=behavior.get("humor", 0.5),
                depth=behavior.get("depth", 0.5)
            )
        
        # 🆕 8. Attachment
        attachment_prompt = ""
        if attachment_info and response_adjustments:
            attachment_prompt = self.templates["attachment"].format(
                attachment_style=attachment_info.get("style", "unknown"),
                adj_warmth=response_adjustments.get("warmth", 0.5),
                adj_speed=response_adjustments.get("response_speed", "normal"),
                adj_support=response_adjustments.get("support_type", "general")
            )
        
        # 9. Rules
        rules_prompt = self.templates["rules"]

        # تجميع الـ Prompt النهائي
        final_prompt = f"""
{identity}
{relationship_prompt}
{emotion_prompt}
{memory_prompt}
{journey_prompt}
{attachment_prompt}
{rules_prompt}
{dialect_prompt}
{voice_prompt}
"""
        return final_prompt

# نسخة عالمية
prompt_builder = PromptBuilder()
print("✅ Prompt Builder v2.0 جاهز")
