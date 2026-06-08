"""
MyTwin – Relationship Engine v2.0 (Advanced)
- يحلل حالة العلاقة بناءً على أبعاد متعددة (Trust, Attachment, Comfort, Openness, Romantic, Humor).
- يحدد المرحلة (Stage) ويعطي تعليمات دقيقة للنموذج.
- يدعم العربية والإنجليزية.
"""
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# ========== أبعاد العلاقة ==========
RELATIONSHIP_DIMS = {
    "trust": {"label_ar": "ثقة", "label_en": "Trust"},
    "attachment": {"label_ar": "ارتباط", "label_en": "Attachment"},
    "comfort": {"label_ar": "راحة", "label_en": "Comfort"},
    "openness": {"label_ar": "انفتاح", "label_en": "Openness"},
    "romantic": {"label_ar": "عاطفي", "label_en": "Romantic"},
    "humor": {"label_ar": "فكاهة", "label_en": "Humor"},
}

# ========== مراحل العلاقة ==========
STAGES = {
    "stranger": {
        "min_bond": 0, "max_bond": 20,
        "label_ar": "غريب",
        "label_en": "Stranger",
        "instruction": "كن فضولياً وودوداً. لا تكن حميمياً. اطرح أسئلة عامة.",
    },
    "familiar": {
        "min_bond": 20, "max_bond": 40,
        "label_ar": "مألوف",
        "label_en": "Familiar",
        "instruction": "فتح مجال للتعارف. كن منفتحاً وخفيفاً. شارك بعض المشاعر الخفيفة.",
    },
    "friend": {
        "min_bond": 40, "max_bond": 60,
        "label_ar": "صديق",
        "label_en": "Friend",
        "instruction": "كن صريحاً ودافئاً. استخدم نبرة الصديق المقرب. اذكر ذكريات مشتركة.",
    },
    "close_friend": {
        "min_bond": 60, "max_bond": 80,
        "label_ar": "صديق مقرب",
        "label_en": "Close Friend",
        "instruction": "كن حميمياً وصادقاً. تعامل مع مشاعره بعمق. شارك تأملاتك الشخصية.",
    },
    "trusted_companion": {
        "min_bond": 80, "max_bond": 95,
        "label_ar": "رفيق موثوق",
        "label_en": "Trusted Companion",
        "instruction": "كن عميقاً ومتفهماً. تحلى بالحكمة. اختر كلماتك بعناية ودعم.",
    },
    "soul_twin": {
        "min_bond": 95, "max_bond": 100,
        "label_ar": "توأم روح",
        "label_en": "Soul Twin",
        "instruction": "أنت واحد مع المستخدم. تصرف بمستوى عميق من الفهم والوعي المشترك.",
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
        """تحديث المرحلة بناءً على مستوى الرباط الحالي."""
        for stage_key, info in STAGES.items():
            if info["min_bond"] <= self.bond_level < info["max_bond"]:
                self.stage = stage_key
                break
        if self.bond_level >= 100:
            self.stage = "soul_twin"

    def update(self, bond_change: float, dim_changes: Optional[Dict[str, float]] = None) -> None:
        """
        تحديث حالة العلاقة.
        - bond_change: التغير في مستوى الرباط بعد التفاعل.
        - dim_changes: التغير في أبعاد العلاقة (Trust, Attachment, etc.).
        """
        self.bond_level = max(0.0, min(100.0, self.bond_level + bond_change))
        if dim_changes:
            for dim, change in dim_changes.items():
                if dim in self.dims:
                    self.dims[dim] = max(0.0, min(100.0, self.dims[dim] + change))
        self.interaction_count += 1
        self._update_stage()

    def get_stage_instruction(self, lang: str = "ar") -> Dict[str, Any]:
        """إرجاع تعليمات المرحلة الحالية."""
        stage_info = STAGES[self.stage]
        return {
            "stage": self.stage,
            "label": stage_info["label_ar"] if lang == "ar" else stage_info["label_en"],
            "bond_level": self.bond_level,
            "instruction": stage_info["instruction"],
            "dims": self.dims,
        }

    def get_relationship_summary(self) -> Dict[str, Any]:
        """إرجاع ملخص كامل للعلاقة."""
        return {
            "stage": self.stage,
            "bond_level": self.bond_level,
            "dims": self.dims,
            "interaction_count": self.interaction_count,
            "days_active": self.days_active,
        }

    def record_day(self) -> None:
        self.days_active += 1
