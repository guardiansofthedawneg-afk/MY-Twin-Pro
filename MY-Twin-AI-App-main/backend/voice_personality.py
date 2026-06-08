"""
MyTwin – Voice Personality v1.0
- إدارة شخصيات الصوت (Mentor, Friend, Romantic, Energetic, Calm).
- تعديل pitch, rate, pause, emotion بناءً على الشخصية.
- متوافق مع `voice_engine.py`.
"""
from typing import Dict, Any, Optional

VOICE_PERSONALITIES = {
    "mentor": {
        "label_ar": "مرشد",
        "label_en": "Mentor",
        "pitch": 0.95,
        "rate": 0.85,
        "pause": 0.8,
        "emotion": "calm"
    },
    "friend": {
        "label_ar": "صديق",
        "label_en": "Friend",
        "pitch": 1.0,
        "rate": 1.0,
        "pause": 0.5,
        "emotion": "neutral"
    },
    "romantic": {
        "label_ar": "رومانسي",
        "label_en": "Romantic",
        "pitch": 1.05,
        "rate": 0.9,
        "pause": 0.7,
        "emotion": "loving"
    },
    "energetic": {
        "label_ar": "حيوي",
        "label_en": "Energetic",
        "pitch": 1.1,
        "rate": 1.15,
        "pause": 0.2,
        "emotion": "excited"
    },
    "calm": {
        "label_ar": "هادئ",
        "label_en": "Calm",
        "pitch": 0.85,
        "rate": 0.75,
        "pause": 0.9,
        "emotion": "calm"
    },
}

def get_voice_personality(personality: str) -> Dict[str, Any]:
    """إرجاع إعدادات الصوت للشخصية المحددة."""
    return VOICE_PERSONALITIES.get(personality, VOICE_PERSONALITIES["friend"])

def get_voice_config(relationship_stage: str, emotion: str) -> Dict[str, Any]:
    """اختيار الشخصية المناسبة بناءً على مرحلة العلاقة والمشاعر."""
    if emotion in ["sadness", "fear", "anger"]:
        return get_voice_personality("calm")
    elif relationship_stage in ["close_friend", "trusted_companion", "soul_twin"]:
        return get_voice_personality("friend")
    elif emotion in ["joy", "surprise"]:
        return get_voice_personality("energetic")
    return get_voice_personality("mentor")
