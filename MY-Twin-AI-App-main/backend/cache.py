"""
MyTwin – Cache & Cleanup Layer v4.0
يدعم:
- تخزين مؤقت (TTL) مع Redis
- تخزين الردود المتكررة (Response Cache)
- تنظيف الذكريات القديمة من Supabase حسب الباقة
- إحصائيات وتقارير
"""
import hashlib
import time
import json
import os
import logging
from typing import Optional, Any, Dict, List
from datetime import datetime, timezone, timedelta
from supabase import create_client, Client

logger = logging.getLogger(__name__)

# ========== Redis ==========
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

# ========== Supabase ==========
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
SUPABASE: Optional[Client] = None
if SUPABASE_URL and SUPABASE_KEY:
    SUPABASE = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    logger.warning("Supabase credentials missing – cleanup disabled.")

# ========== الذاكرة المؤقتة المحلية ==========
_cache: Dict[str, Dict[str, Any]] = {}
_cache_stats = {"hits": 0, "misses": 0, "sets": 0, "deletes": 0, "last_cleanup": time.time()}

def get(key: str) -> Optional[Any]:
    global _cache_stats
    if REDIS_AVAILABLE and redis_cache.enabled:
        value = redis_cache.get(key)
        if value is not None:
            _cache_stats["hits"] += 1
            return value
    entry = _cache.get(key)
    if entry and entry["expires"] > time.time():
        _cache_stats["hits"] += 1
        return entry["value"]
    if entry:
        del _cache[key]
        _cache_stats["deletes"] += 1
    _cache_stats["misses"] += 1
    return None

def set(key: str, value: Any, ttl: int = 300) -> None:
    global _cache_stats
    if REDIS_AVAILABLE and redis_cache.enabled:
        redis_cache.set(key, value, ttl)
    _cache[key] = {"value": value, "expires": time.time() + ttl, "created_at": datetime.now().isoformat()}
    _cache_stats["sets"] += 1
    if time.time() - _cache_stats["last_cleanup"] > 600:
        cleanup()

def delete(key: str) -> bool:
    global _cache_stats
    if REDIS_AVAILABLE and redis_cache.enabled:
        redis_cache.delete(key)
    if key in _cache:
        del _cache[key]
        _cache_stats["deletes"] += 1
        return True
    return False

def cleanup() -> int:
    global _cache_stats
    now = time.time()
    expired = [k for k, v in _cache.items() if v["expires"] <= now]
    for key in expired:
        del _cache[key]
    _cache_stats["last_cleanup"] = now
    return len(expired)

def get_stats() -> Dict:
    total = _cache_stats["hits"] + _cache_stats["misses"]
    hit_rate = (_cache_stats["hits"] / total * 100) if total > 0 else 0
    return {
        "total_entries": len(_cache),
        "hits": _cache_stats["hits"],
        "misses": _cache_stats["misses"],
        "hit_rate": round(hit_rate, 2),
        "redis_available": REDIS_AVAILABLE and redis_cache.enabled if REDIS_AVAILABLE else False
    }

def clear_all() -> int:
    count = len(_cache)
    _cache.clear()
    if REDIS_AVAILABLE and redis_cache.enabled:
        redis_cache.flush_all()
    return count

# ========== Response Cache ==========
def _make_response_key(message: str, twin_name: str, lang: str) -> str:
    raw = f"{message.strip().lower()}|{twin_name}|{lang}"
    return f"resp:{hashlib.md5(raw.encode()).hexdigest()}"

def get_cached_response(message: str, twin_name: str, lang: str) -> Optional[str]:
    key = _make_response_key(message, twin_name, lang)
    return get(key)

def set_cached_response(message: str, twin_name: str, lang: str, reply: str, ttl: int = 300) -> None:
    key = _make_response_key(message, twin_name, lang)
    set(key, reply, ttl)

# ========== Context & Emotion Cache ==========
def cache_user_context(user_id: str, context: dict, ttl: int = 600) -> None:
    set(f"context:{user_id}", context, ttl)

def get_user_context(user_id: str) -> Optional[dict]:
    return get(f"context:{user_id}")

def cache_emotional_state(user_id: str, emotional_state: dict) -> None:
    set(f"emotion:{user_id}", emotional_state, ttl=120)

def get_emotional_state(user_id: str) -> Optional[dict]:
    return get(f"emotion:{user_id}")

def cache_ai_response(query: str, response: str, ttl: int = 300) -> None:
    query_hash = hashlib.md5(query.encode()).hexdigest()
    set(f"ai_response:{query_hash}", response, ttl)

def get_ai_response(query: str) -> Optional[str]:
    query_hash = hashlib.md5(query.encode()).hexdigest()
    return get(f"ai_response:{query_hash}")

# ========== Redis Cache Class ==========
class RedisCache:
    def __init__(self):
        self.enabled = False
        self.client = None
        if not REDIS_AVAILABLE:
            return
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        try:
            self.client = redis.Redis.from_url(redis_url, decode_responses=True, socket_connect_timeout=2, socket_timeout=2)
            self.client.ping()
            self.enabled = True
        except:
            pass

    def get(self, key: str) -> Optional[Any]:
        if not self.enabled or not self.client: return None
        try:
            data = self.client.get(key)
            return json.loads(data) if data else None
        except: return None

    def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        if not self.enabled or not self.client: return False
        try:
            self.client.setex(key, ttl, json.dumps(value, ensure_ascii=False))
            return True
        except: return False

    def delete(self, key: str) -> bool:
        if not self.enabled or not self.client: return False
        try:
            self.client.delete(key)
            return True
        except: return False

    def flush_all(self) -> bool:
        if not self.enabled or not self.client: return False
        try:
            self.client.flushdb()
            return True
        except: return False

redis_cache = RedisCache()

# ========== 🆕 تنظيف الذكريات من Supabase ==========
RETENTION_DAYS = {
    "free": 3, "free_trial_14d": 3, "premium_trial": 20,
    "premium": 30, "pro": 90, "yearly": 365,
}

def run_supabase_cleanup(dry: bool = False) -> Dict[str, Any]:
    """
    حذف الذكريات القديمة حسب باقة المستخدم.
    تُستدعى دورياً (cron) أو عند الضرورة.
    """
    if not SUPABASE:
        return {"error": "supabase_unavailable"}
    res: Dict[str, Any] = {"emergency": False, "tiers_cleaned": 0, "total_deleted": 0, "err": []}
    try:
        # فحص الطوارئ: إذا تجاوز عدد الذكريات 40 ألف
        cnt_result = SUPABASE.table("memories").select("id", count="exact").execute()
        total_count = cnt_result.count or 0
        if total_count > 40000:
            res["emergency"] = True
            if not dry:
                cut = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()
                del_result = SUPABASE.table("memories").delete().lt("created_at", cut).execute()
                res["total_deleted"] = len(del_result.data) if del_result.data else 0

        # تنظيف حسب الباقة
        for tier, days in RETENTION_DAYS.items():
            cut = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
            users_result = SUPABASE.table("profiles").select("user_id").eq("tier", tier).execute()
            uids = [u["user_id"] for u in (users_result.data or [])]
            if not uids:
                continue
            if not dry:
                del_result = SUPABASE.table("memories").delete().in_("user_id", uids).lt("created_at", cut).execute()
                deleted = len(del_result.data) if del_result.data else 0
                res["total_deleted"] = res["total_deleted"] + deleted
                res["tiers_cleaned"] = res["tiers_cleaned"] + 1
        return res
    except Exception as e:
        logger.error(f"Supabase cleanup failed: {e}")
        res["err"].append(str(e))
        return res

# ========== رسالة التهيئة ==========
print(f"✅ Cache & Cleanup v4.0 | Redis: {'متصل' if redis_cache.enabled else 'محلي'} | Supabase: {'متصل' if SUPABASE else 'غير متصل'}")
