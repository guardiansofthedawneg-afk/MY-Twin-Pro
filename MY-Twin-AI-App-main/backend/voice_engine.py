"""
MyTwin – Voice Engine v4.0 (مدمج مع Voice Settings)
يدعم: Edge TTS، ElevenLabs، STT، إعدادات الباقات، شخصيات الصوت
"""
import os, logging, asyncio, io
from typing import Optional, Dict, Any
from enum import Enum
from voice_personality import get_voice_personality

logger = logging.getLogger(__name__)

# ========== إعدادات المزودين ==========
class VoiceProvider(str, Enum):
    DISABLED = "disabled"
    GOOGLE = "google"
    AMAZON = "amazon"
    ELEVENLABS = "elevenlabs"
    EDGE = "edge"

# ========== إعدادات الباقات ==========
VOICE_CONFIG: Dict[str, Dict[str, Any]] = {
    "free_trial_14d": {"provider": VoiceProvider.EDGE, "available_providers": [VoiceProvider.EDGE]},
    "free": {"provider": VoiceProvider.EDGE, "available_providers": [VoiceProvider.EDGE]},
    "plus": {"provider": VoiceProvider.EDGE, "available_providers": [VoiceProvider.EDGE]},
    "premium_trial": {"provider": VoiceProvider.EDGE, "available_providers": [VoiceProvider.EDGE]},
    "premium": {"provider": VoiceProvider.ELEVENLABS, "available_providers": [VoiceProvider.EDGE, VoiceProvider.ELEVENLABS]},
    "pro": {"provider": VoiceProvider.ELEVENLABS, "available_providers": [VoiceProvider.EDGE, VoiceProvider.ELEVENLABS]},
    "yearly": {"provider": VoiceProvider.ELEVENLABS, "available_providers": [VoiceProvider.EDGE, VoiceProvider.ELEVENLABS]},
}

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")

def get_voice_config(tier: str) -> Dict[str, Any]:
    """الحصول على إعدادات الصوت للباقة المحددة"""
    return VOICE_CONFIG.get(tier, {"provider": VoiceProvider.EDGE, "available_providers": [VoiceProvider.EDGE]})

# ========== نطق النص (TTS) ==========
async def speakResponse(
    text: str,
    tier: str = "free",
    gender: str = "female",
    emotion: str = "neutral"
) -> Optional[bytes]:
    """
    تحويل النص إلى كلام باستخدام المزود المناسب للباقة
    """
    if not text or not text.strip():
        return None
    
    voice_config = get_voice_config(tier)
    provider = voice_config["provider"]
    
    # الحصول على إعدادات الشخصية الصوتية
    personality = get_voice_personality(emotion, gender)
    
    try:
        if provider == VoiceProvider.EDGE:
            return await _edge_tts(text, personality)
        elif provider == VoiceProvider.ELEVENLABS and ELEVENLABS_API_KEY:
            return await _elevenlabs_tts(text, personality)
        else:
            # الرجوع إلى Edge دائماً
            return await _edge_tts(text, personality)
    except Exception as e:
        logger.warning(f"TTS failed ({provider}): {e}")
        try:
            return await _edge_tts(text, personality)
        except:
            return None

async def _edge_tts(text: str, personality: Dict[str, Any]) -> Optional[bytes]:
    """استخدام Edge TTS المجاني"""
    try:
        import edge_tts
        voice = personality.get("edge_voice", "ar-SA-HamedNeural")
        rate = personality.get("rate", "+0%")
        pitch = personality.get("pitch", "+0Hz")
        
        communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        audio_chunks = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_chunks.append(chunk["data"])
        
        if audio_chunks:
            return b"".join(audio_chunks)
    except ImportError:
        logger.warning("edge_tts not installed")
    except Exception as e:
        logger.error(f"Edge TTS error: {e}")
    return None

async def _elevenlabs_tts(text: str, personality: Dict[str, Any]) -> Optional[bytes]:
    """استخدام ElevenLabs TTS"""
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

# ========== التعرف على الصوت (STT) ==========
_recording = False
_audio_buffer = io.BytesIO()

def startRecordingVoice() -> bool:
    """بدء التسجيل الصوتي"""
    global _recording, _audio_buffer
    _recording = True
    _audio_buffer = io.BytesIO()
    logger.info("Recording started")
    return True

async def stopRecordingVoice(audio_bytes: Optional[bytes] = None) -> Optional[str]:
    """إيقاف التسجيل وتحويل الصوت إلى نص"""
    global _recording
    _recording = False
    
    if not audio_bytes:
        return None
    
    # استخدام Google STT مجاني
    try:
        import speech_recognition as sr
        recognizer = sr.Recognizer()
        audio = sr.AudioData(audio_bytes, sample_rate=16000, sample_width=2)
        text = recognizer.recognize_google(audio, language="ar-SA")
        return text
    except ImportError:
        logger.warning("speech_recognition not installed")
    except Exception as e:
        logger.warning(f"STT failed: {e}")
    return None

# ========== الدوال المتوافقة (للاستخدام السهل) ==========
async def synthesize_speech(text: str, tier: str = "free", emotion: str = "neutral", gender: str = "female") -> Optional[bytes]:
    """واجهة موحدة (للتوافق مع الكود القديم)"""
    return await speakResponse(text, tier=tier, emotion=emotion, gender=gender)

# ========== نسخة عالمية ==========
class VoiceEngine:
    """كائن محرك الصوت للاستخدام العام"""
    def __init__(self):
        self.enabled = True
    
    async def speak(self, text: str, tier: str = "free", emotion: str = "neutral", gender: str = "female") -> Optional[bytes]:
        return await speakResponse(text, tier=tier, emotion=emotion, gender=gender)
    
    def start_recording(self) -> bool:
        return startRecordingVoice()
    
    async def stop_recording(self, audio: Optional[bytes] = None) -> Optional[str]:
        return await stopRecordingVoice(audio)

voice_engine = VoiceEngine()
print("✅ Voice Engine v4.0 (مدمج) | جاهز")
