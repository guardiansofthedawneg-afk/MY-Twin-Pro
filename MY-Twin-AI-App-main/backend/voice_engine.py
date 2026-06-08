"""
MyTwin – Voice Engine v4.1 (توجيه ذكي للنطق)
- يعتمد على expo-speech في الواجهة الأمامية للعامية
- يحتفظ بـ Edge TTS للغات المدعومة فقط (الإنجليزية، الفصحى)
- يوفر ElevenLabs للباقات المتميزة
"""
import os, logging, asyncio
from typing import Optional, Dict, Any
from enum import Enum
from voice_personality import get_voice_personality

logger = logging.getLogger(__name__)

class VoiceProvider(str, Enum):
    DISABLED = "disabled"
    EDGE = "edge"
    ELEVENLABS = "elevenlabs"
    SYSTEM = "system"  # توجيه إلى الواجهة

VOICE_CONFIG = {
    "free_trial_14d": {"provider": VoiceProvider.SYSTEM, "available": [VoiceProvider.SYSTEM]},
    "free":           {"provider": VoiceProvider.SYSTEM, "available": [VoiceProvider.SYSTEM]},
    "plus":           {"provider": VoiceProvider.SYSTEM, "available": [VoiceProvider.SYSTEM]},
    "premium_trial":  {"provider": VoiceProvider.SYSTEM, "available": [VoiceProvider.SYSTEM]},
    "premium":        {"provider": VoiceProvider.ELEVENLABS, "available": [VoiceProvider.SYSTEM, VoiceProvider.ELEVENLABS]},
    "pro":            {"provider": VoiceProvider.ELEVENLABS, "available": [VoiceProvider.SYSTEM, VoiceProvider.ELEVENLABS]},
    "yearly":         {"provider": VoiceProvider.ELEVENLABS, "available": [VoiceProvider.SYSTEM, VoiceProvider.ELEVENLABS]},
}

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")

def get_voice_config(tier: str) -> Dict[str, Any]:
    return VOICE_CONFIG.get(tier, {"provider": VoiceProvider.SYSTEM, "available": [VoiceProvider.SYSTEM]})

async def speakResponse(
    text: str,
    tier: str = "free",
    gender: str = "female",
    emotion: str = "neutral"
) -> Optional[bytes]:
    """
    تحويل النص إلى كلام.
    - للباقات Free/Plus: تُرجع None لتوجيه الواجهة لاستخدام expo-speech المحلي.
    - للباقات الأعلى: تستخدم ElevenLabs (أو Edge للفصحى/الإنجليزية).
    """
    if not text or not text.strip():
        return None

    config = get_voice_config(tier)
    provider = config["provider"]

    if provider == VoiceProvider.SYSTEM:
        # إشارة للواجهة باستخدام TTS المحلي (expo-speech)
        return None

    personality = get_voice_personality(emotion, gender)

    if provider == VoiceProvider.ELEVENLABS and ELEVENLABS_API_KEY:
        return await _elevenlabs_tts(text, personality)

    # احتياطي: Edge TTS (للإنجليزية / الفصحى فقط)
    if provider == VoiceProvider.EDGE:
        return await _edge_tts(text, personality)

    return None

async def _edge_tts(text: str, personality: Dict[str, Any]) -> Optional[bytes]:
    try:
        import edge_tts
        voice = personality.get("edge_voice", "en-US-JennyNeural")
        rate = personality.get("rate", "+0%")
        pitch = personality.get("pitch", "+0Hz")
        communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        audio_chunks = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_chunks.append(chunk["data"])
        return b"".join(audio_chunks) if audio_chunks else None
    except Exception as e:
        logger.error(f"Edge TTS error: {e}")
    return None

async def _elevenlabs_tts(text: str, personality: Dict[str, Any]) -> Optional[bytes]:
    if not ELEVENLABS_API_KEY:
        return None
    try:
        import httpx
        stability = personality.get("stability", 0.5)
        similarity = personality.get("similarity_boost", 0.75)
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}",
                json={
                    "text": text,
                    "voice_settings": {"stability": stability, "similarity_boost": similarity},
                    "model_id": "eleven_multilingual_v2"
                },
                headers={"xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json"}
            )
            if resp.status_code == 200:
                return resp.content
            logger.warning(f"ElevenLabs error: {resp.status_code}")
    except Exception as e:
        logger.error(f"ElevenLabs error: {e}")
    return None

def startRecordingVoice() -> bool:
    return True

async def stopRecordingVoice(audio_bytes: Optional[bytes] = None) -> Optional[str]:
    # STT من خلال expo-speech أو Google Cloud
    return None

class VoiceEngine:
    def __init__(self):
        self.enabled = True
    async def speak(self, text, tier, emotion, gender):
        return await speakResponse(text, tier, gender, emotion)

voice_engine = VoiceEngine()
print("✅ Voice Engine v4.1 (System TTS primary for Arabic)")
