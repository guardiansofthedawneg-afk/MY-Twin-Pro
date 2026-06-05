"""MyTwin – Emotional Engine v4.0 – يدعم العربية والإنجليزية"""
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
import re
import logging

logger = logging.getLogger(__name__)

class EmotionalStateTracker:
    # ========== كلمات المشاعر (عربي + إنجليزي) ==========
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

    # ========== أنماط المشاعر (عربي + إنجليزي) ==========
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

    def analyze(self, text: str, lang: str = "ar") -> Dict[str, Any]:
        """
        تحليل المشاعر من النص.
        يدعم العربية (ar) والإنجليزية (en).
        """
        tl = text.lower()
        words = set(tl.split())
        scores: Dict[str, float] = {}
        
        # تحليل الكلمات المفتاحية
        for emotion, lang_dict in self.EMOTION_KEYWORDS.items():
            keywords = lang_dict.get(lang, set())
            if lang != "ar" and lang != "en":
                # إذا كانت لغة غير مدعومة، ادمج القائمتين
                keywords = lang_dict.get("ar", set()) | lang_dict.get("en", set())
            
            score = len(words & keywords)
            
            # تحليل الأنماط النصية
            if emotion in self.EMOTION_PATTERNS:
                patterns = self.EMOTION_PATTERNS[emotion].get(lang, [])
                if lang not in ["ar", "en"]:
                    patterns = self.EMOTION_PATTERNS[emotion].get("ar", []) + self.EMOTION_PATTERNS[emotion].get("en", [])
                for pat in patterns:
                    score += len(re.findall(pat, tl))
            
            scores[emotion] = score

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

    def detect_shift(self, prev_emotion: str, current_emotion: str) -> bool:
        """اكتشاف تغير حاد في المشاعر"""
        if prev_emotion == current_emotion:
            return False
        positive = {"joy", "love", "surprise"}
        negative = {"sadness", "fear", "anger"}
        return (prev_emotion in positive and current_emotion in negative) or \
               (prev_emotion in negative and current_emotion in positive)

    def calculate_energy(
        self,
        last_active: Optional[str],
        daily_messages: int,
        current_emotion: str
    ) -> float:
        """حساب طاقة التوأم الرقمي"""
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
        
        emotion_energy = {
            "joy": 0.2, "excited": 0.3, "love": 0.2,
            "sadness": -0.3, "anger": -0.2, "fear": -0.2,
            "neutral": 0.0,
        }
        energy += emotion_energy.get(current_emotion, 0)
        
        return round(max(0.1, min(1.0, energy)), 2)

    # ========== تكامل مع Voice Engine v4.1 ==========

    def get_voice_emotion(self, emotion_result: Dict[str, Any]) -> str:
        """
        تحويل مخرجات تحليل المشاعر إلى صيغة مناسبة لـ voice_engine.py
        """
        primary = emotion_result.get('primary', 'neutral')
        intensity = emotion_result.get('intensity', 0.5)
        
        if intensity > 0.8 and primary == 'joy':
            return 'excited'
        elif intensity > 0.8 and primary == 'sadness':
            return 'sad'
        elif intensity > 0.8 and primary == 'fear':
            return 'worried'
        
        return primary

    def get_tts_config_from_emotion(
        self,
        emotion_result: Dict[str, Any],
        calm: bool = False
    ) -> dict:
        """
        الحصول على إعدادات TTS المناسبة من نتيجة تحليل المشاعر
        """
        if calm:
            return {'pitch': 0.80, 'rate': 0.70, 'emotion': 'calm'}
        
        primary = emotion_result.get('primary', 'neutral')
        intensity = emotion_result.get('intensity', 0.5)
        
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

# ========== دوال مساعدة عالمية (للتوافق مع الكود القديم) ==========

def calc_energy(last_active: Optional[str], msgs_24h: int, avg_emo: str) -> float:
    """حساب طاقة التوأم (نسخة مختصرة للاستخدام المباشر)"""
    return EmotionalStateTracker().calculate_energy(last_active, msgs_24h, avg_emo)

def detect_emotion_shift(prev: str, curr: str) -> bool:
    """اكتشاف تغير المشاعر (نسخة مختصرة)"""
    return EmotionalStateTracker().detect_shift(prev, curr)

def tts_params(emo: str, calm: bool = False) -> dict:
    """الحصول على إعدادات TTS (نسخة مختصرة)"""
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
    """تحويل تحليل المشاعر إلى صيغة الصوت (نسخة مختصرة)"""
    return EmotionalStateTracker().get_voice_emotion(emotion_result)

def get_tts_config_from_emotion(emotion_result: Dict[str, Any], calm: bool = False) -> dict:
    """الحصول على إعدادات TTS من تحليل المشاعر (نسخة مختصرة)"""
    return EmotionalStateTracker().get_tts_config_from_emotion(emotion_result, calm)
