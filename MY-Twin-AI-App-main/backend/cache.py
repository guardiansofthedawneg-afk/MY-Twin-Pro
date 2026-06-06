"""
MyTwin – Cache Layer v2.0
يدعم:
- تخزين مؤقت للبيانات العامة (TTL)
- تخزين مؤقت للردود المتكررة (Response Cache) مع مفتاح يعتمد على بصمة السؤال
"""
import hashlib
import time
from typing import Optional, Any, Dict

# ========== الكاش العام (للاستخدام الحالي) ==========
_cache: Dict[str, Dict[str, Any]] = {}

def get(key: str) -> Optional[Any]:
    """جلب قيمة من الكاش إذا كانت لا تزال صالحة"""
    entry = _cache.get(key)
    if entry and entry["expires"] > time.time():
        return entry["value"]
    # تنظيف تلقائي عند انتهاء الصلاحية
    if entry:
        del _cache[key]
    return None

def set(key: str, value: Any, ttl: int = 300) -> None:
    """تخزين قيمة مع مدة صلاحية (افتراضي 5 دقائق)"""
    _cache[key] = {
        "value": value,
        "expires": time.time() + ttl,
    }

# ========== كاش الردود (Response Cache) ==========
def _make_response_key(message: str, twin_name: str, lang: str) -> str:
    """توليد مفتاح فريد للرد بناءً على السؤال والتوأم واللغة"""
    raw = f"{message.strip().lower()}|{twin_name}|{lang}"
    return f"resp:{hashlib.md5(raw.encode()).hexdigest()}"

def get_cached_response(message: str, twin_name: str, lang: str) -> Optional[str]:
    """جلب رد مخزن مؤقتاً إذا كان متطابقاً"""
    key = _make_response_key(message, twin_name, lang)
    return get(key)

def set_cached_response(message: str, twin_name: str, lang: str, reply: str, ttl: int = 300) -> None:
    """تخزين رد مع مفتاح السؤال"""
    key = _make_response_key(message, twin_name, lang)
    set(key, reply, ttl)
