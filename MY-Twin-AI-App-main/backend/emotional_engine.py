"""MyTwin – Emotional Engine v5.0 – يدعم العربية والإنجليزية + الوقت + الطقس"""
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
import re
import logging
import os
import httpx

logger = logging.getLogger(__name__)

# ========== عميل الطقس البسيط ==========
async def _get_weather_emotion(lat: Optional[float] = None, lon: Optional[float] = None) -> Optional[str]:
    """جلب وصف مبسط للطقس لإضافته كسياق عاطفي"""
    api_key = os.getenv("OPENWEATHERMAP_API_KEY", "")
    if not api_key or not lat or not lon:
        return None
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric",
                timeout=5.0
            )
            if resp.status_code == 200:
                data = resp.json()
                desc = data["weather"][0]["description"]
                return desc
    except Exception as e:
        logger.debug(f"Weather emotion fetch failed: {e}")
    return None

class EmotionalStateTracker:
    EMOTION_KEYWORDS = {
        "joy": {
            "ar": {"سعيد","فرح","مبسوط","رائع","جميل","ممتاز","حلو","بهجة","سرور","احتفال","نجاح","فخر","سعادة","ضحك","ابتسام"},
            "en": {"happy","joy","glad","wonderful","great","excellent","nice","celebration","success","proud","laughter","smile"}
        },
        "sadness": {
            "ar": {"حزين","مؤلم","صعب","آسف","مؤسف","بكاء","دمعة","كآبة","اكتئاب","خيبة","خسارة","فقدان","وحدة","حزن","كسر"},
            "en": {"sad","painful","difficult","sorry","regret","cry","tear","depression","disappointment","loss","lonely","sorrow","broken"}
        },
        "anger": {
            "ar": {"غاضب","محبط","مزعج","سيء","غضب","عصبي","ثورة","حنق","استياء","غيظ","كره","عداء","ظلم","غضبان","زعلان"},
            "en": {"angry","frustrated","annoying","bad","rage","nervous","fury","resentment","hate","hostile","injustice","mad","upset"}
        },
        "fear": {
            "ar": {"خائف","قلق","مقلق","خطير","خوف","فزع","رعب","توتر","اضطراب","هلع","شك","ريبة","خوف","جبان"},
            "en": {"afraid","anxious","worried","dangerous","fear","terror","horror","tension","panic","doubt","suspicion","scared","coward"}
        },
        "love": {
            "ar": {"أحبك","أهتم","أغلى","غالي","قلبي","حب","عشق","هوى","شغف","ولع","ميل","حنان","دفء","أشتاق","مشتاق"},
            "en": {"love","care","dear","precious","heart","affection","passion","fondness","warmth","miss","longing"}
        },
        "surprise": {
            "ar": {"مفاجأة","عجيب","مدهش","واو","غريب","عجب","استغراب","ذهول","صدمة","مفاجئ","لم أتوقع","لا أصدق","مذهل"},
            "en": {"surprise","amazing","wow","strange","astonishing","shock","unexpected","unbelievable","incredible","stunning"}
        },
        "neutral": {
            "ar": {"طبيعي","عادي","تمام","حسناً","ماشي","okay","ok"},
            "en": {"normal","okay","ok","fine","alright","sure","well","good"}
        },
    }

    EMOTION_PATTERNS = {
        "joy": {
            "ar": [r"(الحمدلله|شكراً|يسعد|أفرح|مبروك|ههه|هههه|😂|🤣|😊|😄|😁)"],
            "en": [r"(thank god|thank you|happy|glad|congrats|haha|lol|😊|😄|😁|😂|🤣)"]
        },
        "sadness": {
            "ar": [r"(يا حرام|للأسف|حسبي الله|الله يرحم|فات الأوان|😢|😔|💔)"],
            "en": [r"(unfortunately|alas|rip|too late|😢|😔|💔|sadly|regret)"]
        },
        "anger": {
            "ar": [r"(كفاية|بقى|زهقت|مليت|سامح|العفو|😡|😠|🤬)"],
            "en": [r"(enough|stop|angry|mad|😡|😠|🤬|furious|annoyed)"]
        },
        "fear": {
            "ar": [r"(خايف|متخوف|قلقان|متوتر|مش عارف|يارب|😨|😰|😱)"],
            "en": [r"(scared|afraid|worried|nervous|anxious|😨|😰|😱|terrified)"]
        },
        "love": {
            "ar": [r"(يا قلبي|يا عمري|يا حبيبي|يا روحي|تسلم|يسلم|حبيب قلبي|❤️|💕|😍)"],
            "en": [r"(my love|my dear|sweetheart|darling|❤️|💕|😍|love you|miss you)"]
        },
    }

    def __init__(self):
        self.emotion_history: List[Dict[str, Any]] = []

    async def analyze(
        self, text: str, lang: str = "ar",
        lat: Optional[float] = None, lon: Optional[float] = None
    ) -> Dict[str, Any]:
        """تحليل المشاعر مع مراعاة الوقت والطقس (يُفضل استدعاؤها بشكل async)"""
        tl = text.lower()
        words = set(tl.split())
        scores: Dict[str, float] = {}
        
        # تحليل النص (متزامن)
        for emotion, lang_dict in self.EMOTION_KEYWORDS.items():
            keywords = lang_dict.get(lang, set())
            if lang not in ["ar", "en"]:
                keywords = lang_dict.get("ar", set()) | lang_dict.get("en", set())
            
            score = len(words & keywords)
            if emotion in self.EMOTION_PATTERNS:
                patterns = self.EMOTION_PATTERNS[emotion].get(lang, [])
                if lang not in ["ar", "en"]:
                    patterns = self.EMOTION_PATTERNS[emotion].get("ar", []) + self.EMOTION_PATTERNS[emotion].get("en", [])
                for pat in patterns:
                    score += len(re.findall(pat, tl))
            scores[emotion] = score

        # التأثير بالوقت
        hour = datetime.now(timezone.utc).hour
        if 6 <= hour < 12:
            scores["joy"] = scores.get("joy", 0) + 0.3  # الصباح بهجة
        elif 12 <= hour < 18:
            scores["neutral"] = scores.get("neutral", 0) + 0.2
        elif 18 <= hour < 24:
            scores["love"] = scores.get("love", 0) + 0.2  # المساء دفء
        else:
            scores["calm"] = scores.get("calm", 0) + 0.3  # الليل هدوء

        # التأثير بالطقس (غير متزامن)
        try:
            weather_desc = await _get_weather_emotion(lat, lon)
            if weather_desc:
                if any(w in weather_desc for w in ["rain", "مطر", "drizzle"]):
                    scores["sadness"] = scores.get("sadness", 0) + 0.3
                elif any(w in weather_desc for w in ["clear", "صافي", "sun"]):
                    scores["joy"] = scores.get("joy", 0) + 0.3
                elif any(w in weather_desc for w in ["cloud", "غائم"]):
                    scores["neutral"] = scores.get("neutral", 0) + 0.2
        except Exception:
            pass  # فشل جلب الطقس لا يوقف التحليل

        # تحديد المشاعر الأساسية
        if scores:
            primary = max(scores, key=lambda k: scores[k])
            total = sum(scores.values())
            divider = max(total * 0.3, 1.0) if total > 0 else 1.0
            intensity = min(scores[primary] / divider, 1.0) if total > 0 else 0.5
        else:
            primary = "neutral"
            intensity = 0.5

        result: Dict[str, Any] = {
            "primary": primary,
            "intensity": round(intensity, 2),
            "scores": scores,
            "lang": lang,
            "needs_support": primary in ["sadness", "fear", "anger"] and intensity > 0.6,
        }
        
        self.emotion_history.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "emotion": result,
        })
        
        return result

    # ... (باقي الدوال كما هي: detect_shift, calculate_energy, get_voice_emotion, get_tts_config_from_emotion)
    def detect_shift(self, prev_emotion: str, current_emotion: str) -> bool:
        if prev_emotion == current_emotion:
            return False
        positive = {"joy", "love", "surprise"}
        negative = {"sadness", "fear", "anger"}
        return (prev_emotion in positive and current_emotion in negative) or \
               (prev_emotion in negative and current_emotion in positive)

    def calculate_energy(self, last_active: Optional[str], daily_messages: int, current_emotion: str) -> float:
        energy = 0.5
        if last_active:
            try:
                last = datetime.fromisoformat(last_active.replace("Z", "+00:00"))
                hours = (datetime.now(timezone.utc) - last.replace(tzinfo=None)).total_seconds() / 3600
                if hours > 24:
                    energy -= 0.2
                elif hours < 1:
                    energy += 0.1
            except ValueError as exc:
                logger.warning(f"Invalid last_active timestamp: {last_active} - {exc}")
        if daily_messages > 50:
            energy -= 0.1
        elif daily_messages < 5:
            energy -= 0.1
        else:
            energy += 0.1
        emotion_energy = {"joy":0.2, "excited":0.3, "love":0.2, "sadness":-0.3, "anger":-0.2, "fear":-0.2, "neutral":0.0}
        energy += emotion_energy.get(current_emotion, 0)
        return round(max(0.1, min(1.0, energy)), 2)

    def get_voice_emotion(self, emotion_result: Dict[str, Any]) -> str:
        primary = emotion_result.get('primary', 'neutral')
        intensity = emotion_result.get('intensity', 0.5)
        if intensity > 0.8 and primary == 'joy':
            return 'excited'
        elif intensity > 0.8 and primary == 'sadness':
            return 'sad'
        elif intensity > 0.8 and primary == 'fear':
            return 'worried'
        return primary

    def get_tts_config_from_emotion(self, emotion_result: Dict[str, Any], calm: bool = False) -> dict:
        if calm:
            return {'pitch': 0.80, 'rate': 0.70, 'emotion': 'calm'}
        primary = emotion_result.get('primary', 'neutral')
        configs = {
            'joy': {'pitch': 1.12, 'rate': 0.90, 'emotion': 'happy'},
            'sadness': {'pitch': 0.80, 'rate': 0.75, 'emotion': 'sad'},
            'fear': {'pitch': 1.05, 'rate': 0.95, 'emotion': 'worried'},
            'anger': {'pitch': 1.05, 'rate': 0.95, 'emotion': 'angry'},
            'love': {'pitch': 1.08, 'rate': 0.92, 'emotion': 'loving'},
            'surprise': {'pitch': 1.15, 'rate': 0.95, 'emotion': 'excited'},
            'neutral': {'pitch': 0.95, 'rate': 0.85, 'emotion': 'neutral'},
        }
        return configs.get(primary, configs['neutral'])

# دوال مساعدة عالمية
def calc_energy(last_active: Optional[str], msgs_24h: int, avg_emo: str) -> float:
    return EmotionalStateTracker().calculate_energy(last_active, msgs_24h, avg_emo)

def detect_emotion_shift(prev: str, curr: str) -> bool:
    return EmotionalStateTracker().detect_shift(prev, curr)

def tts_params(emo: str, calm: bool = False) -> dict:
    if calm:
        return {"pitch": 0.80, "rate": 0.70}
    params_map = {
        "joy": {"pitch": 1.12, "rate": 0.90},
        "sadness": {"pitch": 0.80, "rate": 0.75},
        "fear": {"pitch": 1.05, "rate": 0.95},
        "anger": {"pitch": 1.05, "rate": 0.95},
        "love": {"pitch": 1.08, "rate": 0.92},
        "surprise": {"pitch": 1.15, "rate": 0.95},
        "neutral": {"pitch": 0.95, "rate": 0.85},
    }
    return params_map.get(emo, {"pitch": 0.95, "rate": 0.85})

def get_voice_emotion(emotion_result: Dict[str, Any]) -> str:
    return EmotionalStateTracker().get_voice_emotion(emotion_result)

def get_tts_config_from_emotion(emotion_result: Dict[str, Any], calm: bool = False) -> dict:
    return EmotionalStateTracker().get_tts_config_from_emotion(emotion_result, calm)
