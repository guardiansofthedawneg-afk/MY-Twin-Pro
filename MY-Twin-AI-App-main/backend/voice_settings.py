"""
MyTwin – Voice Settings (واجهة متوافقة مع النظام القديم)
تم التحديث: يُعيد التوجيه إلى voice_engine.py الجديد
"""
import os
import logging
from typing import Dict, Optional, Any
from enum import Enum

logger = logging.getLogger(__name__)

# ========== الاستيراد من محرك الصوت الجديد ==========
from voice_engine import (
    speakResponse as _speakResponse,
    startRecordingVoice as _startRecordingVoice,
    stopRecordingVoice as _stopRecordingVoice,
    voice_engine,
)

class VoiceProvider(str, Enum):
    DISABLED = "disabled"
    GOOGLE = "google"
    AMAZON = "amazon"
    ELEVENLABS = "elevenlabs"
    EDGE = "edge"  # تمت إضافة Edge TTS

# ========== إعدادات الباقات (متوافقة مع النظام الجديد) ==========
VOICE_CONFIG: Dict[str, Dict[str, Any]] = {
    "free_trial_14d": {"provider": VoiceProvider.EDGE, "available_providers": [VoiceProvider.EDGE]},
    "free": {"provider": VoiceProvider.EDGE, "available_providers": [VoiceProvider.EDGE]},
    "plus": {"provider": VoiceProvider.EDGE, "available_providers": [VoiceProvider.EDGE]},
    "premium_trial": {"provider": VoiceProvider.EDGE, "available_providers": [VoiceProvider.EDGE]},
    "premium": {"provider": VoiceProvider.ELEVENLABS, "available_providers": [VoiceProvider.EDGE, VoiceProvider.ELEVENLABS]},
    "pro": {"provider": VoiceProvider.ELEVENLABS, "available_providers": [VoiceProvider.EDGE, VoiceProvider.ELEVENLABS]},
    "yearly": {"provider": VoiceProvider.ELEVENLABS, "available_providers": [VoiceProvider.EDGE, VoiceProvider.ELEVENLABS]},
}

def get_voice_config(tier: str) -> Dict[str, Any]:
    """الحصول على إعدادات الصوت للباقة المحددة"""
    return VOICE_CONFIG.get(tier, {"provider": VoiceProvider.EDGE, "available_providers": [VoiceProvider.EDGE]})

def get_voice_params(provider: VoiceProvider) -> Dict[str, Any]:
    """الحصول على إعدادات مزود الصوت (للتوافق)"""
    params = {
        VoiceProvider.EDGE: {"language": "ar-SA", "voice_name": "Neural"},
        VoiceProvider.GOOGLE: {"language": "ar-SA", "voice_name": "ar-SA-Standard-A"},
        VoiceProvider.ELEVENLABS: {"voice_id": "21m00Tcm4TlvDq8ikWAM", "model_id": "eleven_multilingual_v2"},
    }
    return params.get(provider, {})

async def synthesize_speech(
    text: str,
    provider: Optional[VoiceProvider] = None,
    tier: str = "free",
    emotion: str = "neutral",
    calm: bool = False,
    gender: str = "female"
) -> Optional[bytes]:
    """
    تحويل النص إلى كلام (واجهة موحدة)
    تستخدم voice_engine.py داخلياً
    """
    if not text or not text.strip():
        return None
    
    # تجاهل provider القديم واستخدم tier مباشرة
    return await _speakResponse(
        text=text,
        tier=tier,
        gender=gender,
        emotion=emotion if not calm else "calm"
    )

def start_recording() -> bool:
    """بدء التسجيل الصوتي (STT)"""
    return _startRecordingVoice()

async def stop_recording(audio_bytes: Optional[bytes] = None) -> Optional[str]:
    """إيقاف التسجيل الصوتي وإرجاع النص"""
    return await _stopRecordingVoice(audio_bytes)

# ========== دوال متوافقة مع الكود القديم ==========

async def _google_tts(text: str, emotion_config: Dict[str, Any]) -> Optional[bytes]:
    """Google TTS (للتوافق - لم يعد مستخدماً مباشرة)"""
    return await _speakResponse(text, tier="premium", emotion=emotion_config.get("emotion", "neutral"))

async def _elevenlabs_tts(text: str, emotion_config: Dict[str, Any]) -> Optional[bytes]:
    """ElevenLabs TTS (للتوافق - لم يعد مستخدماً مباشرة)"""
    return await _speakResponse(text, tier="yearly", emotion=emotion_config.get("emotion", "neutral"))

# ========== دمج startRecordingVoice و stopRecordingVoice ==========
# هذه الدوال يتم استيرادها من voice_engine.py مباشرة
startRecordingVoice = _startRecordingVoice
stopRecordingVoice = _stopRecordingVoice
