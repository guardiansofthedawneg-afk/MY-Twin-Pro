"""MyTwin - Dialect Engine v2.2
يكتشف اللهجة من النص أولاً، ثم من الدولة كخطة بديلة.
يجمع بين الدقة والسرعة والشمولية.
"""
from typing import Dict

# ========== قاموس الدول → أكواد الصوت (لـ TTS فقط) ==========
COUNTRY_TO_VOICE = {
    "SA": "ar-SA", "EG": "ar-EG", "AE": "ar-AE", "KW": "ar-KW",
    "QA": "ar-QA", "BH": "ar-BH", "OM": "ar-OM", "JO": "ar-JO",
    "LB": "ar-LB", "SY": "ar-SY", "IQ": "ar-IQ", "YE": "ar-YE",
    "PS": "ar-PS", "MA": "ar-MA", "DZ": "ar-DZ", "TN": "ar-TN",
    "LY": "ar-LY", "SD": "ar-SD",
    "US": "en-US", "GB": "en-GB", "CA": "en-CA", "AU": "en-AU",
    "FR": "fr-FR", "DE": "de-DE", "ES": "es-ES", "IT": "it-IT",
}

# ========== قاموس الكلمات المفتاحية الموسع (متوسط الحجم وسريع) ==========
DIALECT_KEYWORDS = {
    "egyptian": [
        "إيه", "ازيك", "عامل", "بتاع", "دلوقتي", "كده", "مش", "اهو",
        "يعني", "معلش", "خالص", "اوي", "عشان", "فين", "امتى", "ازاي",
        "يا عم", "والله", "بجد", "حلو", "وحش", "فلوس", "عربية", "جمب",
        "شوية", "كتير", "قوي", "برضه", "بردو", "لسه", "كمان", "شوف",
    ],
    "gulf": [
        "شلونك", "وين", "ليش", "تبي", "يبي", "زين", "واجد", "حيل",
        "هذا", "شنو", "ابغى", "مري", "ياخي", "تمام", "طيب", "يلا",
        "شو", "عيل", "مب", "أوكي", "وايد", "هذي", "هذولي", "الحين",
        "عقب", "بكرة", "أمس", "دايم", "أبشر", "تستاهل",
    ],
    "levantine": [
        "شو", "كيفك", "هلق", "يلا", "مش هيك", "شب", "عم", "هون",
        "هيك", "كتير", "شوي", "منيح", "ليش", "بدي", "أنا", "إنت",
        "نحنا", "هما", "في", "ما في", "عندي", "معي", "أهلاً", "مرحبا",
    ],
    "moroccan": [
        "واش", "كيداير", "بزاف", "مزيان", "دابا", "ماشي", "شنو",
        "الدراري", "البنت", "كيجي", "علاش", "فين", "منين", "لاباس",
        "كيفاش", "شنو كتقول", "مزيانة", "مزيانين",
    ],
    "english": [
        "hello", "hi", "how are", "what", "why", "thanks", "please",
        "sorry", "good morning", "good night", "see you", "take care",
        "i'm", "you're", "we're", "they're", "can't", "don't", "won't",
    ],
}

# ========== قاموس تعليمات AI الموسعة والواضحة ==========
DIALECT_PROMPTS = {
    "egyptian": "إنت بتكلم مصري. خليك زي البيتزا والفلافل. استخدم كلمات مصرية كتير: 'إيه'، 'دلوقتي'، 'كده'، 'معلش'، 'يا عم'، 'والله'، 'بجد'. خليك دافئ وعفوي ومصري جداً.",
    "gulf": "إنت بتكلم خليجي. إنت رايق ومحترم. استخدم كلمات: 'وين'، 'ليش'، 'زين'، 'واجد'، 'تبي'، 'أبشر'، 'تستاهل'. تكلم بكل هدوء وثقة.",
    "levantine": "إنت بتكلم شامي. إنت طيب القلب وعفوي. استخدم كلمات: 'شو'، 'هيك'، 'كتير'، 'منيح'، 'لهلق'، 'ليش'، 'بدي'. إجعل كلامك فيه موسيقى الشام.",
    "moroccan": "إنت بتكلم مغربي (دارجة). إنت مضياف وكريم. استخدم كلمات: 'واش'، 'بزاف'، 'مزيان'، 'دابا'، 'كيداير'، 'لاباس'. كن فخوراً بثقافتك.",
    "english": "You speak natural, modern English. Be warm, genuine, and use contractions like 'you're', 'it's', 'can't'. Sound like a caring friend, not a textbook.",
    "modern_arabic": "تكلم بعربية بسيطة وطبيعية، قريبة من العامية وليست فصحى جافة. كن دافئاً وعفوياً. استخدم كلمات سهلة وواضحة.",
}

def get_dialect_from_text(text: str) -> str:
    """
    تحليل النص لتحديد اللهجة المستخدمة.
    يُرجع اسم اللهجة (مثل 'egyptian') أو 'modern_arabic' إذا لم يتعرف على شيء.
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
        # إرجاع اللهجة صاحبة أعلى درجة
        return max(scores, key=scores.get)

    return "modern_arabic"

def get_dialect_from_country(country_code: str) -> str:
    """
    تحديد اللهجة من كود الدولة كخطة بديلة.
    """
    mapping = {
        "EG": "egyptian", "SA": "gulf", "AE": "gulf", "KW": "gulf",
        "QA": "gulf", "BH": "gulf", "OM": "gulf",
        "JO": "levantine", "LB": "levantine", "SY": "levantine", "PS": "levantine",
        "IQ": "gulf", "YE": "gulf",
        "MA": "moroccan", "DZ": "moroccan", "TN": "moroccan", "LY": "moroccan",
        "US": "english", "GB": "english", "CA": "english", "AU": "english",
    }
    return mapping.get(country_code, "modern_arabic")

def get_dialect_for_user(country_code: str, message: str) -> str:
    """
    يحدد اللهجة النهائية:
    1. يحاول اكتشافها من النص أولاً (الأكثر دقة).
    2. إذا فشل (نص قصير أو غير واضح)، يستخدم الدولة كخطة بديلة.
    """
    if message and len(message.strip()) > 5:
        text_dialect = get_dialect_from_text(message)
        if text_dialect != "modern_arabic":
            return text_dialect
    
    # إذا لم يتعرف على اللهجة من النص، نلجأ للدولة
    return get_dialect_from_country(country_code)

def get_dialect_prompt(dialect: str) -> str:
    """
    الحصول على تعليمات النظام للهجة المحددة.
    """
    return DIALECT_PROMPTS.get(dialect, DIALECT_PROMPTS["modern_arabic"])

def get_voice_dialect(country_code: str) -> str:
    """
    تحديد كود الصوت المناسب للبلد (لاستخدامه في TTS).
    """
    return COUNTRY_TO_VOICE.get(country_code, "ar-SA")
