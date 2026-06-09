"""
MyTwin – Emotional Engine v8.0 (Deep Contextual Analysis)
- تحليل سياقي متقدم: كلمات مفتاحية، نفي، تدرج، إيموجي، تكرار.
- متعدد الأبعاد: primary, secondary, intensity, valence (إيجابي/سلبي), arousal (هدوء/انفعال).
- تكامل: تخزين مؤقت (cache) + احتياطي عبر multi_ai عند الحاجة.
- يدعم العربية والإنجليزية بعمق.
"""
import os, logging, re, hashlib, json
from typing import Dict, Any, Optional
from cache import get as cache_get, set as cache_set

logger = logging.getLogger(__name__)

class EmotionalStateTracker:
    # ── قواميس موسعة (عربي + إنجليزي) ──────────────────
    LEXICON = {
        "joy": {
            "ar": ["سعيد", "فرح", "مبسوط", "ممتاز", "رائع", "جميل", "بضحك", "ههه", "😂", "😊", "😄", "💃", "🎉", "متحمس", "فخور", "الحمدلله"],
            "en": ["happy", "joy", "glad", "great", "wonderful", "lol", "😂", "😊", "😄", "excited", "proud", "yay"]
        },
        "sadness": {
            "ar": ["حزين", "مؤلم", "بكي", "زعلان", "متضايق", "يا حسرة", "💔", "😢", "😔", "مكتئب", "وحيد", "فقدت"],
            "en": ["sad", "pain", "cry", "upset", "heartbroken", "💔", "😢", "depressed", "lonely", "lost"]
        },
        "anger": {
            "ar": ["غاضب", "محبط", "غضب", "🔥", "😡", "🤬", "سخيف", "لا أحتمل", "كفى"],
            "en": ["angry", "mad", "furious", "🔥", "😡", "hate", "enough", "stupid"]
        },
        "fear": {
            "ar": ["خائف", "قلق", "خوف", "مرعوب", "متوتر", "😨", "😰", "لا أعرف ماذا سيحدث"],
            "en": ["scared", "afraid", "fear", "anxious", "worried", "nervous", "😨", "panic"]
        },
        "love": {
            "ar": ["أحبك", "حبيب", "قلبي", "💕", "💖", "🫶", "عشق", "حنية"],
            "en": ["love", "dear", "sweetheart", "💕", "💖", "adore", "miss you"]
        },
        "surprise": {
            "ar": ["مفاجأة", "عجيب", "😮", "😲", "لا أصدق", "غريب"],
            "en": ["surprise", "wow", "😮", "😲", "unbelievable", "strange"]
        },
        "disgust": {
            "ar": ["مقرف", "اشمئزاز", "يع", "🤢", "🤮", "قذر"],
            "en": ["disgust", "gross", "yuck", "🤢", "🤮", "dirty"]
        },
        "neutral": {
            "ar": ["طبيعي", "عادي", "تمام", "ليس سيئاً", "لا بأس"],
            "en": ["okay", "fine", "normal", "not bad", "alright"]
        }
    }

    # ── أدوات النفي (عربي + إنجليزي) ────────────────────
    NEGATION_WORDS = {
        "ar": ["لا", "ليس", "مش", "ما", "غير", "لم"],
        "en": ["not", "no", "don't", "isn't", "never", "neither"]
    }

    # ── كلمات تضخيم / تخفيف الشدة ─────────────────────
    INTENSIFIERS = {
        "ar": {"جداً": 0.2, "كثير": 0.15, "للغاية": 0.25, "!!!": 0.2, "!": 0.1},
        "en": {"very": 0.2, "so": 0.15, "extremely": 0.25, "really": 0.18, "!!!": 0.2, "!": 0.1}
    }

    def __init__(self):
        # محاولة استيراد multi_ai للاحتياطي (حتى لا يحدث استيراد دائري)
        self.multi_client = None

    def _get_multi_client(self):
        if self.multi_client is None:
            try:
                from multi_ai import MultiAIClient
                self.multi_client = MultiAIClient()
            except:
                pass
        return self.multi_client

    def _detect_language(self, text: str) -> str:
        """كشف اللغة بسرعة: ar أو en"""
        arabic_chars = re.findall(r'[\u0600-\u06FF]', text)
        return "ar" if len(arabic_chars) > len(text) * 0.3 else "en"

    def _analyze_local_deep(self, text: str) -> Dict[str, Any]:
        """تحليل سياقي عميق محلياً"""
        lang = self._detect_language(text)
        text_lower = text.lower().strip()

        # 1. حساب درجات المشاعر الأساسية
        emotion_scores = {}
        for emotion, words_dict in self.LEXICON.items():
            words = words_dict.get(lang, [])
            score = 0
            for word in words:
                if word.lower() in text_lower:
                    score += 1
            if score > 0:
                emotion_scores[emotion] = score

        # 2. معالجة النفي: إذا سبقت كلمة نفي كلمة عاطفية، قلل الدرجة واعكس الاتجاه
        for emotion in list(emotion_scores.keys()):
            for neg_word in self.NEGATION_WORDS.get(lang, []):
                # نمط بسيط: كلمة النفي قبل الكلمة العاطفية
                pattern = rf'{neg_word}\s+\w*\s*({ "|".join(self.LEXICON[emotion][lang][:5]) })'
                if re.search(pattern, text_lower):
                    emotion_scores[emotion] = max(0, emotion_scores[emotion] - 2)
                    # عكس العاطفة (حزن → فرح والعكس)
                    if emotion == "sadness":
                        emotion_scores["joy"] = emotion_scores.get("joy", 0) + 1
                    elif emotion == "joy":
                        emotion_scores["sadness"] = emotion_scores.get("sadness", 0) + 1

        # 3. حساب الشدة (intensity) من المُضخمات وعلامات التعجب
        intensity = 0.5
        for word, boost in self.INTENSIFIERS.get(lang, {}).items():
            if word.lower() in text_lower:
                intensity += boost

        # 4. حساب valence (مدى الإيجابية) و arousal (الانفعال)
        positive_emotions = {"joy", "love", "surprise"}
        negative_emotions = {"sadness", "anger", "fear", "disgust"}
        pos_score = sum(v for k, v in emotion_scores.items() if k in positive_emotions)
        neg_score = sum(v for k, v in emotion_scores.items() if k in negative_emotions)
        total = pos_score + neg_score
        valence = (pos_score - neg_score) / max(total, 1)
        arousal = min(intensity, 1.0)

        # 5. تحديد العاطفة الأساسية والثانوية
        if emotion_scores:
            sorted_emotions = sorted(emotion_scores.items(), key=lambda x: x[1], reverse=True)
            primary = sorted_emotions[0][0]
            secondary = sorted_emotions[1][0] if len(sorted_emotions) > 1 else "neutral"
            needs_support = primary in ["sadness", "fear", "anger", "disgust"] and intensity > 0.5
        else:
            primary = "neutral"
            secondary = "neutral"
            needs_support = False

        return {
            "primary": primary,
            "secondary": secondary,
            "intensity": min(intensity, 1.0),
            "valence": valence,
            "arousal": arousal,
            "needs_support": needs_support,
            "lang": lang
        }

    async def analyze(self, text: str, gemini_key: Optional[str] = None) -> Dict[str, Any]:
        """تحليل المشاعر الرئيسي (مع تخزين مؤقت واحتياطي)"""
        if not text:
            return {"primary": "neutral", "secondary": "neutral", "intensity": 0.5, "needs_support": False}

        # مفتاح الكاش
        text_hash = hashlib.md5(text.encode()).hexdigest()
        cache_key = f"emotion:{text_hash}"
        cached = cache_get(cache_key)
        if cached:
            return cached

        # 1. تحليل محلي عميق
        result = self._analyze_local_deep(text)

        # 2. إذا كانت الشدة غير واضحة أو التناقض عالي، نستخدم نموذج احتياطي
        if result["intensity"] < 0.4 and result["primary"] == "neutral":
            # قد يكون النص معقداً نلجأ للنموذج
            client = self._get_multi_client()
            if client:
                try:
                    prompt = f"""Analyze this message emotionally. Return ONLY a JSON object with:
{{"primary":"...", "secondary":"...", "intensity":0.5, "valence":0.0, "needs_support":false}}
Message: "{text}"
JSON:"""
                    full_reply = await client.get_best_reply(prompt, task="emotional")
                    # استخراج JSON من الرد
                    json_match = re.search(r'\{[^}]+\}', full_reply)
                    if json_match:
                        model_result = json.loads(json_match.group())
                        result.update(model_result)
                except Exception as e:
                    logger.warning(f"Emotion backup model failed: {e}")

        # 3. تخزين في الكاش لمدة 10 دقائق
        cache_set(cache_key, result, 600)
        return result

# نسخة عالمية
emotional_tracker = EmotionalStateTracker()
print("✅ Emotional Engine v8.0 (تحليل سياقي عميق) جاهز")
