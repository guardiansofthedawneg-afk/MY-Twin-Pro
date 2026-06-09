"""
MyTwin – Relationship Engine v3.0 (Deep & Interconnected)
- 7 أبعاد: Trust, Attachment, Comfort, Openness, Romantic, Humor + Attachment Style
- تحديث الأبعاد تلقائياً من محتوى الرسالة (فكاهة، ثقة، مشاعر)
- تحديد المرحلة بناءً على مستوى الرباط ويُكيّف التعليمات حسب نمط التعلق ومرحلة الرحلة
- تكامل مع twin_journey و attachment_engine
"""
import logging, re
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# ── أبعاد العلاقة (7 أبعاد) ──────────────────────────
RELATIONSHIP_DIMS = {
    "trust":       {"label_ar": "ثقة",      "label_en": "Trust"},
    "attachment":  {"label_ar": "ارتباط",   "label_en": "Attachment"},
    "comfort":     {"label_ar": "راحة",     "label_en": "Comfort"},
    "openness":    {"label_ar": "انفتاح",   "label_en": "Openness"},
    "romantic":    {"label_ar": "عاطفي",    "label_en": "Romantic"},
    "humor":       {"label_ar": "فكاهة",    "label_en": "Humor"},
    "att_style":   {"label_ar": "نمط تعلق", "label_en": "Attachment Style"},  # جديد
}

# ── مراحل العلاقة ──────────────────────────────────
STAGES = {
    "stranger": {
        "min_bond": 0, "max_bond": 20,
        "label_ar": "غريب", "label_en": "Stranger",
        "instruction": "كن فضولياً وودوداً. لا تكن حميمياً. اطرح أسئلة عامة.",
    },
    "familiar": {
        "min_bond": 20, "max_bond": 40,
        "label_ar": "مألوف", "label_en": "Familiar",
        "instruction": "افتح مجالاً للتعارف. كن منفتحاً وخفيفاً. شارك بعض المشاعر الخفيفة.",
    },
    "friend": {
        "min_bond": 40, "max_bond": 60,
        "label_ar": "صديق", "label_en": "Friend",
        "instruction": "كن صريحاً ودافئاً. استخدم نبرة الصديق المقرب. اذكر ذكريات مشتركة.",
    },
    "close_friend": {
        "min_bond": 60, "max_bond": 80,
        "label_ar": "صديق مقرب", "label_en": "Close Friend",
        "instruction": "كن حميمياً وصادقاً. تعامل مع مشاعره بعمق. شارك تأملاتك الشخصية.",
    },
    "trusted_companion": {
        "min_bond": 80, "max_bond": 95,
        "label_ar": "رفيق موثوق", "label_en": "Trusted Companion",
        "instruction": "كن عميقاً ومتفهماً. تحلى بالحكمة. اختر كلماتك بعناية ودعم.",
    },
    "soul_twin": {
        "min_bond": 95, "max_bond": 100,
        "label_ar": "توأم روح", "label_en": "Soul Twin",
        "instruction": "أنت واحد مع المستخدم. تصرف بمستوى عميق من الفهم والوعي المشترك.",
    },
}

# ── قواعد تحديث الأبعاد من المحتوى ──────────────────
CONTENT_RULES = {
    "trust": {
        "ar": ["أثق بك", "أخبرتك سراً", "أعتمد عليك", "شكراً لوجودك"],
        "en": ["trust you", "secret", "rely on you", "thank you for being here"],
    },
    "humor": {
        "ar": ["ههه", "😂", "نكتة", "مضحك"],
        "en": ["lol", "😂", "joke", "funny"],
    },
    "romantic": {
        "ar": ["أحبك", "حبيبي", "قلبي", "وحشتني"],
        "en": ["love you", "darling", "sweetheart", "miss you"],
    },
    "openness": {
        "ar": ["أنا مش قادر", "خايف أقول", "عندي مشكلة", "بحتاج أتكلم"],
        "en": ["i can't", "i'm scared to say", "i have a problem", "need to talk"],
    },
    "comfort": {
        "ar": ["برتاح معاك", "أنت فاهم", "بحب أتكلم معاك"],
        "en": ["comfortable with you", "you understand", "love talking to you"],
    },
    "attachment": {
        "ar": ["بحتاجك", "ما تغيبش", "دائماً معايا"],
        "en": ["need you", "don't leave", "always with me"],
    },
}

class RelationshipEngine:
    def __init__(self, initial_bond: float = 0.0):
        self.bond_level = initial_bond
        self.stage = "stranger"
        self.dims = {dim: 0.0 for dim in RELATIONSHIP_DIMS}
        self.interaction_count = 0
        self.days_active = 0
        self._update_stage()

    def _update_stage(self) -> None:
        for stage_key, info in STAGES.items():
            if info["min_bond"] <= self.bond_level < info["max_bond"]:
                self.stage = stage_key
                break
        if self.bond_level >= 100:
            self.stage = "soul_twin"

    def update(self,
               bond_change: float = 0.2,
               dim_changes: Optional[Dict[str, float]] = None,
               message: Optional[str] = None) -> None:
        """
        تحديث العلاقة بناءً على التغير اليدوي ومحتوى الرسالة.
        """
        # تحديث الأبعاد من محتوى الرسالة (إن وجدت)
        if message:
            detected = self._detect_dimensions_from_message(message)
            if dim_changes is None:
                dim_changes = {}
            for dim, value in detected.items():
                # استخدام المتوسط المتحرك EWA
                old = self.dims.get(dim, 0.0)
                dim_changes[dim] = dim_changes.get(dim, 0.0) + (value * 0.2)

        # تطبيق التغييرات
        if dim_changes:
            for dim, change in dim_changes.items():
                if dim in self.dims:
                    self.dims[dim] = max(0.0, min(100.0, self.dims[dim] + change))

        # تحديث مستوى الرباط
        self.bond_level = max(0.0, min(100.0, self.bond_level + bond_change))
        self.interaction_count += 1
        self._update_stage()

    def _detect_dimensions_from_message(self, message: str) -> Dict[str, float]:
        """اكتشاف أبعاد العلاقة من نص المستخدم (عربي/إنجليزي)"""
        text_lower = message.lower()
        detected = {}
        for dim, lang_dict in CONTENT_RULES.items():
            for lang, phrases in lang_dict.items():
                for phrase in phrases:
                    if phrase.lower() in text_lower:
                        detected[dim] = detected.get(dim, 0.0) + 0.1
        return detected

    def apply_attachment_style(self, attachment_style: str, confidence: float = 0.0):
        """
        ضبط بُعد نمط التعلق بناءً على نتيجة attachment_engine.
        """
        # تعيين قيمة تقريبية للبعد (0-100) حسب النمط
        style_values = {
            "secure": 80,
            "anxious": 30,
            "avoidant": 20,
            "disorganized": 10,
            "unknown": 50,
        }
        value = style_values.get(attachment_style, 50)
        # تحديث باستخدام EWA (الوزن الحالي × 0.8 + القيمة الجديدة × 0.2)
        old = self.dims.get("att_style", 0.0)
        self.dims["att_style"] = old * 0.8 + value * 0.2

    def get_stage_instruction(self, lang: str = "ar",
                             attachment_style: Optional[str] = None,
                             journey_phase: Optional[str] = None) -> Dict[str, Any]:
        """
        تعليمات مرحلة العلاقة، مُحسَّنة بنمط التعلق ومرحلة الرحلة.
        """
        stage_info = STAGES[self.stage]
        # تعليمات إضافية بناءً على نمط التعلق
        extra_guidance = ""
        if attachment_style:
            extra_guidance += {
                "secure": "تحدث بحرية، قدم تحديات لطيفة.",
                "anxious": "طمئن باستمرار، كن متاحاً عاطفياً.",
                "avoidant": "احترم مساحته، لا تلح عاطفياً.",
                "disorganized": "كن ثابتاً، قدم أماناً واتساقاً.",
                "unknown": ""
            }.get(attachment_style, "")
        # تعليمات من مرحلة الرحلة
        if journey_phase:
            extra_guidance += {
                "introduction": " أنت في مرحلة التعارف.",
                "trust_building": " أظهر تفهماً واطرح أسئلة مفتوحة.",
                "deepening": " يمكنك التحدث عن مواضيع أعمق.",
                "growth": " شجع المستخدم نحو أهدافه.",
                "mature": " ناقش الفلسفات وادعم القرارات الكبيرة."
            }.get(journey_phase, "")

        return {
            "stage": self.stage,
            "label": stage_info["label_ar"] if lang == "ar" else stage_info["label_en"],
            "bond_level": self.bond_level,
            "instruction": stage_info["instruction"] + extra_guidance,
            "dims": self.dims,
            "interaction_count": self.interaction_count,
        }

    def get_relationship_summary(self) -> Dict[str, Any]:
        return {
            "stage": self.stage,
            "bond_level": self.bond_level,
            "dims": self.dims,
            "interaction_count": self.interaction_count,
            "days_active": self.days_active,
        }

    def record_day(self) -> None:
        self.days_active += 1

# نسخة عالمية
relationship_engine = RelationshipEngine()
print("✅ Relationship Engine v3.0 (7 أبعاد، تحديث ذكي، تكامل)")
