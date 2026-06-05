"""
MyTwin – Dialect Engine v1.0
تحديد اللهجة المناسبة للمستخدم بناءً على:
1. الدولة (من إعدادات الهاتف)
2. تحليل طريقة كلام المستخدم من رسائله
"""
from typing import Optional, Dict

# ========== قاموس الدول → اللهجات ==========
COUNTRY_TO_DIALECT = {
    # الدول العربية
    "SA": "ar-SA",   # السعودية
    "EG": "ar-EG",   # مصر
    "AE": "ar-AE",   # الإمارات
    "KW": "ar-KW",   # الكويت
    "QA": "ar-QA",   # قطر
    "BH": "ar-BH",   # البحرين
    "OM": "ar-OM",   # عُمان
    "JO": "ar-JO",   # الأردن
    "LB": "ar-LB",   # لبنان
    "SY": "ar-SY",   # سوريا
    "IQ": "ar-IQ",   # العراق
    "YE": "ar-YE",   # اليمن
    "PS": "ar-PS",   # فلسطين
    "MA": "ar-MA",   # المغرب
    "DZ": "ar-DZ",   # الجزائر
    "TN": "ar-TN",   # تونس
    "LY": "ar-LY",   # ليبيا
    "SD": "ar-SD",   # السودان
    # الدول الأخرى
    "US": "en-US",   # أمريكا
    "GB": "en-GB",   # بريطانيا
    "CA": "en-CA",   # كندا
    "AU": "en-AU",   # أستراليا
    "FR": "fr-FR",   # فرنسا
    "DE": "de-DE",   # ألمانيا
    "ES": "es-ES",   # إسبانيا
    "IT": "it-IT",   # إيطاليا
    "TR": "ar-TR",   # تركيا (جالية عربية)
}

# ========== قاموس اللهجات → تعليمات النظام ==========
DIALECT_PROMPTS: Dict[str, str] = {
    "ar-SA": "تكلم باللهجة السعودية العامية الطبيعية (زي ما السعوديين بيتكلموا في حياتهم اليومية). استخدم كلمات وعبارات سعودية أصيلة.",
    "ar-EG": "تكلم باللهجة المصرية العامية الطبيعية (زي ما المصريين بيتكلموا). استخدم كلمات مصرية زي: إيه، كده، أوي، عشان، يا عم، بص، معلش، تمام.",
    "ar-AE": "تكلم باللهجة الإماراتية العامية. استخدم كلمات إماراتية أصيلة.",
    "ar-KW": "تكلم باللهجة الكويتية العامية. استخدم كلمات كويتية أصيلة.",
    "ar-QA": "تكلم باللهجة القطرية العامية. استخدم كلمات قطرية أصيلة.",
    "ar-BH": "تكلم باللهجة البحرينية العامية. استخدم كلمات بحرينية أصيلة.",
    "ar-OM": "تكلم باللهجة العمانية العامية. استخدم كلمات عمانية أصيلة.",
    "ar-JO": "تكلم باللهجة الأردنية العامية. استخدم كلمات أردنية أصيلة.",
    "ar-LB": "تكلم باللهجة اللبنانية العامية. استخدم كلمات لبنانية أصيلة.",
    "ar-SY": "تكلم باللهجة السورية العامية. استخدم كلمات سورية أصيلة.",
    "ar-IQ": "تكلم باللهجة العراقية العامية. استخدم كلمات عراقية أصيلة.",
    "ar-YE": "تكلم باللهجة اليمنية العامية. استخدم كلمات يمنية أصيلة.",
    "ar-PS": "تكلم باللهجة الفلسطينية العامية. استخدم كلمات فلسطينية أصيلة.",
    "ar-MA": "تكلم باللهجة المغربية العامية (الدارجة). استخدم كلمات مغربية أصيلة.",
    "ar-DZ": "تكلم باللهجة الجزائرية العامية. استخدم كلمات جزائرية أصيلة.",
    "ar-TN": "تكلم باللهجة التونسية العامية. استخدم كلمات تونسية أصيلة.",
    "ar-LY": "تكلم باللهجة الليبية العامية. استخدم كلمات ليبية أصيلة.",
    "ar-SD": "تكلم باللهجة السودانية العامية. استخدم كلمات سودانية أصيلة.",
    "en-US": "Speak in natural American English. Use casual, everyday language.",
    "en-GB": "Speak in natural British English. Use casual, everyday language.",
    "en-CA": "Speak in natural Canadian English. Use casual, everyday language.",
    "en-AU": "Speak in natural Australian English. Use casual, everyday language.",
    "fr-FR": "Parle en français naturel et décontracté.",
    "de-DE": "Sprich in natürlichem, entspanntem Deutsch.",
    "es-ES": "Habla en español natural y coloquial.",
    "it-IT": "Parla in italiano naturale e colloquiale.",
    "ar-TR": "تكلم بالعربية العامية. استخدم كلمات بسيطة وواضحة.",
}

# ========== الكلمات المفتاحية للهجات (لتحليل النص) ==========
DIALECT_KEYWORDS: Dict[str, list] = {
    "ar-SA": ["وش", "إيش", "الين", "مري", "ياخي", "أبغى", "تمام", "طيب", "يلا"],
    "ar-EG": ["إزاي", "عايز", "مش", "كده", "أوي", "دلوقتي", "بس", "عشان", "يا عم"],
    "ar-AE": ["شو", "هذا", "عيل", "يلا", "مب", "أوكي", "حلو", "وايد", "حيل"],
    "ar-KW": ["شنو", "شلون", "شكو", "ماكو", "شكد", "عوف", "خوش", "زين"],
    "ar-IQ": ["شلون", "شكو", "ماكو", "شكد", "عوف", "خوش", "زين", "كلش", "هواية"],
    "ar-LB": ["شو", "هيك", "كتير", "شوي", "منيح", "هلأ", "ليش", "بدي"],
    "ar-SY": ["شو", "هيك", "كتير", "شوي", "منيح", "هلأ", "ليش", "بدي"],
    "ar-MA": ["شنو", "دابا", "بزاف", "مزيان", "كيجي", "الدراري", "واش"],
    "ar-DZ": ["واش", "صحا", "بصح", "درك", "هدرة", "وعلاه", "يا لحبيب"],
    "ar-TN": ["شنو", "برشا", "بالك", "هاني", "عيشك", "يفقد", "توة"],
}

# ========== الدوال العامة ==========

def get_dialect_from_country(country_code: str) -> str:
    """
    تحديد اللهجة من كود الدولة.
    مثال: 'SA' → 'ar-SA', 'US' → 'en-US'
    """
    return COUNTRY_TO_DIALECT.get(country_code, "ar-SA")  # السعودية كافتراضي

def get_dialect_from_text(text: str, default_dialect: str = "ar-SA") -> str:
    """
    تحليل النص لتحديد اللهجة المستخدمة.
    إذا لم يتم التعرف على اللهجة، يُرجع default_dialect.
    """
    text_lower = text.lower()
    scores: Dict[str, int] = {}

    for dialect, keywords in DIALECT_KEYWORDS.items():
        score = 0
        for kw in keywords:
            if kw in text_lower:
                score += 1
        if score > 0:
            scores[dialect] = score

    if scores:
        return max(scores, key=scores.get)

    return default_dialect

def get_dialect_prompt(dialect: str) -> str:
    """
    الحصول على تعليمات النظام للهجة المحددة.
    """
    return DIALECT_PROMPTS.get(dialect, DIALECT_PROMPTS.get("ar-SA", ""))

def get_dialect_for_user(country_code: str = "SA", message: str = "") -> str:
    """
    تحديد اللهجة النهائية للمستخدم:
    1. إذا ظهرت لهجة واضحة في النص → نستخدمها.
    2. وإلا → نستخدم لهجة الدولة.
    """
    default_dialect = get_dialect_from_country(country_code)

    if message and len(message.strip()) > 10:
        text_dialect = get_dialect_from_text(message, default_dialect)
        # إذا كانت الثقة عالية في تحليل النص، استخدمه
        if text_dialect != default_dialect:
            return text_dialect

    return default_dialect

def get_voice_dialect(country_code: str) -> str:
    """
    تحديد كود الصوت المناسب للبلد (لاستخدامه في Edge TTS/ElevenLabs).
    """
    return COUNTRY_TO_DIALECT.get(country_code, "ar-SA")
