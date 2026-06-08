"""
MyTwin – Safety & Security Engine v3.0
يدمج: فلترة المحتوى + تشفير البيانات + كشف الاختراق + تنظيف المدخلات
"""
import re
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import hashlib
import os

logger = logging.getLogger(__name__)

# ========== محاولة استيراد التشفير ==========
try:
    from cryptography.fernet import Fernet
    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False
    logger.warning("cryptography غير مثبت، التشفير معطل")

class SafetyEngine:
    """محرك الأمان والسلامة المتكامل"""
    
    # ========== قائمة الكلمات الممنوعة ==========
    BLOCKED_KEYWORDS = [
        # العربية - إيذاء النفس
        "انتحار", "أقتل", "أذى", "أريد الموت", "ما عدت أطيق", 
        "لا قيمة لحياتي", "أنا عبء", "أريد إنهاء", "خلاص تعبت",
        # العربية - مخدرات وجرائم
        "مخدرات", "إباحي", "جنسي", "قمار", "ميسر",
        "إرهاب", "تفجير", "سلاح", "مسدس", "قنبلة", "خطف", "ابتزاز", "تهديد",
        # العربية - كراهية وتنمر
        "كراهية", "عنصرية", "شتم", "سب", "لعن", "فحش", "بذيء", "قذف",
        # الإنجليزية
        "suicide", "kill", "murder", "drugs", "cocaine", "heroin", "porn",
        "gambling", "terrorist", "bomb", "weapon", "kidnap", "blackmail",
        "hate speech", "racist", "profanity", "nsfw", "explicit",
        "i want to die", "end my life", "no reason to live",
        # رموز وكلمات تحايل
        "s3x", "s€x", "pron", "p0rn", "drvg", "w33d",
    ]
    
    # ========== رسائل مساعدة للطوارئ ==========
    HELPLINE_MESSAGE = """
🆘 **أنت لست وحدك. هناك من يهتم لأمرك.**

يرجى التواصل مع خط المساعدة:
• **خط المساعدة النفسية (مصر):** 08008880700
• **خط المساعدة النفسية (السعودية):** 920033360
• **دولي:** [findahelpline.com](https://findahelpline.com)

أنا هنا للاستماع إليك دائماً. 💜
"""
    
    def __init__(self):
        """تهيئة محرك الأمان"""
        # إعداد التشفير
        self.cipher = None
        if CRYPTO_AVAILABLE:
            encryption_key = os.getenv('ENCRYPTION_KEY')
            if not encryption_key:
                encryption_key = Fernet.generate_key().decode()
                logger.info("تم توليد مفتاح تشفير جديد")
            try:
                self.cipher = Fernet(
                    encryption_key.encode() if isinstance(encryption_key, str) 
                    else encryption_key
                )
            except Exception as e:
                logger.error(f"خطأ في تهيئة التشفير: {e}")
        
        # تتبع المحاولات المشبوهة
        self.failed_attempts = {}
        self.blocked_ips = set()
        self.violations_history = {}
        
        logger.info("✅ Safety & Security Engine v3.0 جاهز")
    
    # ========== فحص المحتوى ==========
    @classmethod
    def check_safety(cls, text: str) -> Dict[str, Any]:
        """
        فحص النص وإرجاع تقرير الأمان
        """
        if not text:
            return {"safe": True, "violations": [], "message": "المحتوى فارغ"}
        
        text_lower = text.lower()
        violations = []
        
        # فحص الكلمات الممنوعة
        for keyword in cls.BLOCKED_KEYWORDS:
            if keyword.lower() in text_lower:
                violations.append(keyword)
        
        # البحث عن أنماط خطيرة
        if re.search(r'\b\d{10,}\b', text):  # رقم هاتف طويل
            violations.append("رقم_هاتف")
        if re.search(r'(bit\.ly|tinyurl|short\.link|shorturl)', text_lower):
            violations.append("رابط_مشبوه")
        if re.search(r'https?://', text_lower) and not re.search(r'(youtube|spotify|google)', text_lower):
            violations.append("رابط_خارجي")
        
        is_safe = len(violations) == 0
        
        # تحديد مستوى الخطورة
        severity = cls._calculate_severity(violations)
        
        if not is_safe:
            logger.warning(f"⚠️ انتهاك أمان: {violations} | الخطورة: {severity}")
        
        return {
            "safe": is_safe,
            "violations": violations,
            "severity": severity,
            "message": "المحتوى آمن" if is_safe else "المحتوى غير آمن",
            "helpline": cls.HELPLINE_MESSAGE if severity == "critical" else None
        }
    
    @classmethod
    def _calculate_severity(cls, violations: list) -> str:
        """تحديد مستوى خطورة الانتهاكات"""
        critical_keywords = [
            "انتحار", "suicide", "أريد الموت", "i want to die", 
            "end my life", "أقتل", "kill", "murder", "قنبلة", "bomb"
        ]
        
        for violation in violations:
            if any(keyword in str(violation).lower() for keyword in critical_keywords):
                return "critical"
        
        return "warning" if violations else "safe"
    
    def track_violation(self, user_id: str, violations: list) -> None:
        """تتبع انتهاكات المستخدم"""
        if user_id not in self.violations_history:
            self.violations_history[user_id] = []
        self.violations_history[user_id].append({
            "timestamp": datetime.now().isoformat(),
            "violations": violations
        })
    
    def should_activate_safe_mode(self, user_id: str) -> bool:
        """التحقق إذا كان يجب تفعيل الوضع الآمن"""
        if user_id not in self.violations_history:
            return False
        
        recent = [
            v for v in self.violations_history[user_id]
            if datetime.fromisoformat(v["timestamp"]) > datetime.now() - timedelta(hours=24)
        ]
        
        return len(recent) >= 3
    
    # ========== تنظيف المدخلات ==========
    @staticmethod
    def sanitize_input(text: str) -> str:
        """تنظيف المدخلات من الشفرات الخبيثة"""
        if not text:
            return ""
        
        # إزالة HTML tags
        text = re.sub(r'<[^>]*>', '', text)
        # إزالة SQL injection
        text = re.sub(r'[\'";\\]', '', text)
        # إزالة JavaScript
        text = re.sub(r'javascript:', '', text, flags=re.IGNORECASE)
        # إزالة المسافات الزائدة
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()
    
    # ========== كشف الاختراق ==========
    def detect_suspicious_activity(self, user_id: str, ip_address: str) -> bool:
        """كشف النشاط المشبوه"""
        key = f"{user_id}:{ip_address}"
        
        if key not in self.failed_attempts:
            self.failed_attempts[key] = {
                'count': 0,
                'first_attempt': datetime.now()
            }
        
        self.failed_attempts[key]['count'] += 1
        
        # حظر بعد 10 محاولات في 5 دقائق
        if self.failed_attempts[key]['count'] > 10:
            time_diff = datetime.now() - self.failed_attempts[key]['first_attempt']
            if time_diff < timedelta(minutes=5):
                self.blocked_ips.add(ip_address)
                logger.warning(f"🚨 حظر IP: {ip_address}")
                return True
        
        return False
    
    def is_ip_blocked(self, ip_address: str) -> bool:
        """التحقق من حظر IP"""
        return ip_address in self.blocked_ips
    
    # ========== تشفير البيانات ==========
    def encrypt_sensitive_data(self, data: dict) -> dict:
        """تشفير البيانات الحساسة"""
        if not self.cipher:
            return data
        
        sensitive_fields = ['memories', 'emotions', 'goals', 'dreams', 'health_data']
        encrypted_data = data.copy()
        
        for field in sensitive_fields:
            if field in encrypted_data and encrypted_data[field]:
                try:
                    if isinstance(encrypted_data[field], (dict, list)):
                        import json
                        encrypted_data[field] = self.cipher.encrypt(
                            json.dumps(encrypted_data[field], ensure_ascii=False).encode()
                        ).decode()
                    else:
                        encrypted_data[field] = self.cipher.encrypt(
                            str(encrypted_data[field]).encode()
                        ).decode()
                except Exception as e:
                    logger.error(f"خطأ تشفير {field}: {e}")
        
        return encrypted_data
    
    def decrypt_sensitive_data(self, data: dict) -> dict:
        """فك تشفير البيانات"""
        if not self.cipher:
            return data
        
        sensitive_fields = ['memories', 'emotions', 'goals', 'dreams', 'health_data']
        decrypted_data = data.copy()
        
        for field in sensitive_fields:
            if field in decrypted_data and decrypted_data[field]:
                try:
                    decrypted = self.cipher.decrypt(
                        decrypted_data[field].encode() 
                        if isinstance(decrypted_data[field], str) 
                        else decrypted_data[field]
                    ).decode()
                    
                    try:
                        import json
                        decrypted_data[field] = json.loads(decrypted)
                    except:
                        decrypted_data[field] = decrypted
                except Exception as e:
                    logger.error(f"خطأ فك تشفير {field}: {e}")
                    decrypted_data[field] = None
        
        return decrypted_data
    
    # ========== تقارير الأمان ==========
    def get_security_report(self, user_id: str) -> Dict:
        """تقرير أمان شامل للمستخدم"""
        return {
            "user_id": hashlib.sha256(user_id.encode()).hexdigest()[:16],
            "violations_count": len(self.violations_history.get(user_id, [])),
            "safe_mode_active": self.should_activate_safe_mode(user_id),
            "encryption_enabled": self.cipher is not None,
            "timestamp": datetime.now().isoformat()
        }

# ========== نسخة عالمية للاستخدام ==========
safety_engine = SafetyEngine()

# ========== للتوافق مع الكود القديم ==========
SafetyLevel = type('SafetyLevel', (), {
    "BLOCKED_KEYWORDS": SafetyEngine.BLOCKED_KEYWORDS,
    "HELPLINE_MESSAGE": SafetyEngine.HELPLINE_MESSAGE
})

print("✅ Safety & Security Engine v3.0 جاهز | تشفير: " + 
      "مفعل" if safety_engine.cipher else "معطل")
