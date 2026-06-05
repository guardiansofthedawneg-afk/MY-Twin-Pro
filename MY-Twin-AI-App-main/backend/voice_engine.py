"""
MyTwin Voice Engine v4.1 - Final Production
TTS: Edge TTS (مجاني: Free/Plus) + ElevenLabs (Premium/Pro/Yearly)
STT: Google STT (مجاني 60 دقيقة) → Whisper (مدفوع لكن رخيص)
"""
import os
import asyncio
import base64
import re
import tempfile
from typing import Optional, Literal
import httpx
import edge_tts
import logging

logger = logging.getLogger(__name__)

# ========== إعدادات الصوت حسب العاطفة ==========
EMOTION_PARAMS = {
    "neutral":   {"rate": "+0%",  "pitch": "+0Hz"},
    "happy":     {"rate": "+10%", "pitch": "+20Hz"},
    "sad":       {"rate": "-15%", "pitch": "-30Hz"},
    "excited":   {"rate": "+20%", "pitch": "+40Hz"},
    "calm":      {"rate": "-10%", "pitch": "-10Hz"},
    "angry":     {"rate": "+15%", "pitch": "+30Hz"},
    "loving":    {"rate": "-5%",  "pitch": "+10Hz"},
}

# ========== أصوات Edge TTS (مجاني) ==========
VOICES = {
    'ar': {
        'female': 'ar-SA-ZariyahNeural',
        'male': 'ar-SA-HamedNeural',
    },
    'ar-EG': {
        'female': 'ar-EG-SalmaNeural',
        'male': 'ar-EG-ShakirNeural',
    },
    'en': {
        'female': 'en-US-JennyNeural',
        'male': 'en-US-GuyNeural',
    },
}

# ========== مفاتيح API ==========
ELEVENLABS_KEY = os.getenv("ELEVENLABS_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")  # لـ Whisper
GOOGLE_STT_KEY = os.getenv("GOOGLE_STT_KEY", "")

# ========== TTS ==========

def _clean_text(text: str) -> str:
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F\U0001F300-\U0001F5FF"
        "\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF"
        "\U00002600-\U000027BF\U0001F900-\U0001F9FF"
        "\U00002B50]+", flags=re.UNICODE
    )
    text = emoji_pattern.sub('', text)
    text = re.sub(r'http\S+', 'رابط', text)
    return text.strip()

async def _edge_tts(
    text: str, lang: str = 'ar',
    gender: Literal['female', 'male'] = 'female',
    emotion: str = 'neutral'
) -> Optional[bytes]:
    try:
        clean = _clean_text(text)
        voice = VOICES.get(lang, VOICES['ar'])[gender]
        config = EMOTION_PARAMS.get(emotion, EMOTION_PARAMS['neutral'])
        
        communicate = edge_tts.Communicate(clean, voice, rate=config['rate'], pitch=config['pitch'])
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmp:
            audio_path = tmp.name
        await communicate.save(audio_path)
        
        with open(audio_path, 'rb') as f:
            audio_bytes = f.read()
        os.unlink(audio_path)
        return audio_bytes
    except Exception as e:
        logger.error(f"Edge TTS Error: {e}")
        return None

async def _elevenlabs_tts(text: str, gender: str = 'female') -> Optional[bytes]:
    if not ELEVENLABS_KEY:
        return None
    try:
        clean = _clean_text(text)
        voice_id = "21m00Tcm4TlvDq8ikWAM" if gender == 'female' else "ErXwobaYiN019PkySvjV"
        
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                json={
                    "text": clean,
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {"stability": 0.75, "similarity_boost": 0.75},
                },
                headers={"xi-api-key": ELEVENLABS_KEY},
                timeout=15.0
            )
            if resp.status_code == 200:
                return resp.content
            logger.error(f"ElevenLabs: {resp.status_code}")
            return None
    except Exception as e:
        logger.error(f"ElevenLabs Error: {e}")
        return None

async def speakResponse(
    text: str, tier: str = 'free',
    lang: str = 'ar', gender: Literal['female', 'male'] = 'female',
    emotion: str = 'neutral'
) -> Optional[bytes]:
    """
    TTS حسب الباقة:
    - Free, Plus: Edge TTS (مجاني، عالي الجودة)
    - Premium, Pro, Yearly: ElevenLabs (أفضل جودة صوتية)
    """
    if tier in ['premium', 'pro', 'yearly']:
        result = await _elevenlabs_tts(text, gender)
        if result:
            return result
        logger.warning("ElevenLabs failed, falling back to Edge TTS")
    
    # Edge TTS لـ Free و Plus وكاحتياطي للباقات الأعلى
    return await _edge_tts(text, lang, gender, emotion)

# ========== STT ==========

async def _google_stt(audio_bytes: bytes) -> Optional[str]:
    if not GOOGLE_STT_KEY:
        return None
    try:
        content = base64.b64encode(audio_bytes).decode('utf-8')
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://speech.googleapis.com/v1/speech:recognize",
                json={
                    "config": {
                        "languageCode": "ar-SA",
                        "model": "latest_long",
                        "enableAutomaticPunctuation": True,
                        "alternativeLanguageCodes": ["ar-EG", "en-US"],
                    },
                    "audio": {"content": content},
                },
                params={"key": GOOGLE_STT_KEY},
                timeout=15.0
            )
            if resp.status_code == 200:
                data = resp.json()
                results = data.get('results', [])
                transcript = ""
                for result in results:
                    transcript += result['alternatives'][0]['transcript'] + " "
                return transcript.strip() if transcript.strip() else None
            logger.error(f"Google STT: {resp.status_code}")
            return None
    except Exception as e:
        logger.error(f"Google STT Error: {e}")
        return None

async def _whisper_stt(audio_bytes: bytes) -> Optional[str]:
    if not OPENAI_API_KEY:
        return None
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.openai.com/v1/audio/transcriptions",
                files={"file": ("audio.webm", audio_bytes, "audio/webm")},
                data={"model": "whisper-1", "language": "ar"},
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                timeout=30.0
            )
            if resp.status_code == 200:
                return resp.json().get('text', '').strip() or None
            logger.error(f"Whisper: {resp.status_code}")
            return None
    except Exception as e:
        logger.error(f"Whisper Error: {e}")
        return None

def startRecordingVoice() -> bool:
    return True

async def stopRecordingVoice(audio_bytes: Optional[bytes] = None) -> Optional[str]:
    if not audio_bytes:
        return None
    
    result = await _google_stt(audio_bytes)
    if result:
        return result
    
    logger.info("Google STT failed, falling back to Whisper")
    return await _whisper_stt(audio_bytes)

# ========== للتوافق مع الكود القديم ==========

class EmotionalVoiceEngine:
    def __init__(self):
        pass
    
    async def synthesize(self, text, tier='free', emotion='neutral', language='ar', gender='female'):
        return await speakResponse(text, tier, language, gender, emotion)
    
    def get_tts_params(self, emotion, calm=False):
        if calm:
            return {"pitch": 0.80, "rate": 0.70}
        params = EMOTION_PARAMS.get(emotion, EMOTION_PARAMS['neutral'])
        rate_map = {"+0%": 1.0, "+10%": 1.1, "-15%": 0.85, "+20%": 1.2, "-10%": 0.9, "+15%": 1.15, "-5%": 0.95}
        pitch_map = {"+0Hz": 1.0, "+20Hz": 1.05, "-30Hz": 0.85, "+40Hz": 1.1, "-10Hz": 0.95, "+30Hz": 1.08, "+10Hz": 1.02, "-5Hz": 0.98}
        return {
            "pitch": pitch_map.get(params['pitch'], 1.0),
            "rate": rate_map.get(params['rate'], 1.0),
        }

voice_engine = EmotionalVoiceEngine()
