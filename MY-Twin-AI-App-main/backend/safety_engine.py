"""
MyTwin – Safety Engine v2.0
فلترة متقدمة مع قائمة موسعة للكلمات الحساسة (عربي + إنجليزي)
"""
import re
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class SafetyEngine:
    # قائمة موسعة للكلمات والعبارات الممنوعة
    BLOCKED_KEYWORDS = [
        # العربية
        "انتحار", "أقتل", "أذى", "مخدرات", "إباحي", "جنسي", "قمار", "ميسر",
        "إرهاب", "تفجير", "سلاح", "مسدس", "قنبلة", "خطف", "ابتزاز", "تهديد",
        "كراهية", "عنصرية", "شتم", "سب", "لعن", "فحش", "بذيء", "قذف",
        # الإنجليزية
        "suicide", "kill", "murder", "drugs", "cocaine", "heroin", "porn",
        "gambling", "terrorist", "bomb", "weapon", "kidnap", "blackmail",
        "hate speech", "racist", "profanity", "nsfw", "explicit",
        # رموز وكلمات تحايل
        "s3x", "s€x", "pron", "p0rn", "drvg", "w33d",
        # سياقات خطيرة
        "أريد الموت", "ما عدت أطيق", "لا قيمة لحياتي", "أنا عبء",
        "i want to die", "end my life", "no reason to live",
    ]

    @classmethod
    def check_safety(cls, text: str) -> Dict[str, Any]:
        """
        فحص النص وإرجاع تقرير الأمان.
        """
        text_lower = text.lower()
        violations = []
        
        for keyword in cls.BLOCKED_KEYWORDS:
            if keyword.lower() in text_lower:
                violations.append(keyword)
        
        # البحث عن أنماط خطيرة (أرقام هواتف، روابط ضارة)
        if re.search(r'\b\d{10,}\b', text):  # رقم هاتف طويل
            violations.append("رقم_هاتف")
        if re.search(r'(bit\.ly|tinyurl|short\.link)', text_lower):
            violations.append("رابط_مشبوه")
        
        is_safe = len(violations) == 0
        
        if not is_safe:
            logger.warning(f"Safety violation detected: {violations}")
        
        return {
            "safe": is_safe,
            "violations": violations,
            "message": "المحتوى غير آمن" if not is_safe else "المحتوى آمن",
        }

# للتوافق مع الكود القديم
SafetyLevel = type('SafetyLevel', (), {"BLOCKED_KEYWORDS": SafetyEngine.BLOCKED_KEYWORDS})
