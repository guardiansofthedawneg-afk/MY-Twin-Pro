"""
MyTwin – External Services v4.1 (مع Open-Meteo للطقس المجاني)
YouTube + Spotify + Open-Meteo + Google Search + Todoist + Calendar
يتحقق من حدود الميزات اليومية قبل تنفيذ الخدمات.
"""
import os, logging, base64, asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, timedelta
import httpx

logger = logging.getLogger(__name__)

# ========== مفاتيح API ==========
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")
SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID", "")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET", "")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", os.getenv("YOUTUBE_API_KEY", ""))
GOOGLE_CSE_ID = os.getenv("GOOGLE_CSE_ID", "")

# ========== حدود الاستخدام ==========
def _get_limits_manager():
    try:
        from message_limits import check_feature_usage, get_tier_features
        return check_feature_usage, get_tier_features
    except:
        return None, None

# ========== Spotify ==========
class SpotifyClient:
    def __init__(self):
        self.client_id = SPOTIFY_CLIENT_ID
        self.client_secret = SPOTIFY_CLIENT_SECRET
        self._token = None
        self._token_expiry = None

    async def _get_token(self) -> Optional[str]:
        if not self.client_id or not self.client_secret:
            return None
        if self._token and self._token_expiry and datetime.now(timezone.utc) < self._token_expiry:
            return self._token
        auth = base64.b64encode(f"{self.client_id}:{self.client_secret}".encode()).decode()
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://accounts.spotify.com/api/token",
                    headers={"Authorization": f"Basic {auth}"},
                    data={"grant_type": "client_credentials"},
                    timeout=10.0
                )
                if resp.status_code == 200:
                    data = resp.json()
                    self._token = data.get("access_token")
                    self._token_expiry = datetime.now(timezone.utc) + timedelta(seconds=3600 - 60)
                    return self._token
        except Exception as e:
            logger.error(f"Spotify Auth Error: {e}")
        return None

    async def search(self, query: str) -> str:
        token = await self._get_token()
        if not token:
            return ""
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "https://api.spotify.com/v1/search",
                    headers={"Authorization": f"Bearer {token}"},
                    params={"q": query, "type": "track", "limit": 1},
                    timeout=10.0
                )
                if resp.status_code == 200:
                    tracks = resp.json().get("tracks", {}).get("items", [])
                    if tracks:
                        t = tracks[0]
                        return f"🎵 {t['name']} - {t['artists'][0]['name']}\n🔗 {t['external_urls']['spotify']}"
        except Exception as e:
            logger.error(f"Spotify Search Error: {e}")
        return ""

spotify_client = SpotifyClient()

async def search_spotify(query: str, user_id: Optional[str] = None, tier: str = "free") -> Optional[str]:
    check_func, _ = _get_limits_manager()
    if check_func and user_id:
        allowed, remaining = await asyncio.get_event_loop().run_in_executor(None, check_func, user_id, tier, "spotify")
        if not allowed:
            return "🎵 لقد استنفدت استخدام Spotify اليوم. جرب غداً!"
    return await spotify_client.search(query)

# ========== YouTube ==========
async def search_youtube(query: str, max_results: int = 3, lang: str = "ar", user_id: Optional[str] = None, tier: str = "free") -> Optional[str]:
    if not YOUTUBE_API_KEY:
        return None
    check_func, _ = _get_limits_manager()
    if check_func and user_id:
        allowed, remaining = await asyncio.get_event_loop().run_in_executor(None, check_func, user_id, tier, "youtube")
        if not allowed:
            return "📺 لقد استنفدت استخدام YouTube اليوم. عد غداً لمزيد من الفيديوهات."
    try:
        region = "SA" if lang == "ar" else "US"
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.googleapis.com/youtube/v3/search",
                params={
                    "key": YOUTUBE_API_KEY,
                    "q": query,
                    "part": "snippet",
                    "type": "video",
                    "maxResults": max_results,
                    "regionCode": region,
                    "relevanceLanguage": lang,
                },
                timeout=5.0
            )
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("items", [])
                if not items:
                    return None
                results = []
                for item in items[:max_results]:
                    title = item["snippet"]["title"]
                    video_id = item["id"]["videoId"]
                    results.append(f"📺 {title}\n🔗 https://youtube.com/watch?v={video_id}")
                return "\n\n".join(results)
    except Exception as e:
        logger.error(f"YouTube Error: {e}")
    return None

# ========== Open-Meteo (طقس مجاني بالكامل) ==========
# قاموس لتحويل أكواد الطقس إلى وصف بالعربية
WEATHER_CODES_AR = {
    0: "سماء صافية", 1: "غائم جزئياً", 2: "غائم", 3: "غائم كلياً",
    45: "ضباب", 48: "ضباب متجمد", 51: "رذاذ خفيف", 53: "رذاذ متوسط",
    55: "رذاذ كثيف", 61: "أمطار خفيفة", 63: "أمطار متوسطة", 65: "أمطار غزيرة",
    71: "ثلوج خفيفة", 73: "ثلوج متوسطة", 75: "ثلوج كثيفة", 80: "زخات مطر",
    95: "عاصفة رعدية", 96: "عاصفة رعدية مع بَرَد", 99: "عاصفة رعدية شديدة"
}

async def get_weather(city: str = "Cairo", lat: Optional[float] = None, lon: Optional[float] = None, user_id: Optional[str] = None, tier: str = "free") -> Optional[str]:
    """الحصول على الطقس من Open-Meteo (مجاني، بدون API Key)"""
    check_func, _ = _get_limits_manager()
    if check_func and user_id:
        allowed, remaining = await asyncio.get_event_loop().run_in_executor(None, check_func, user_id, tier, "weather")
        if not allowed:
            return "🌤️ لقد استنفدت استعلامات الطقس اليوم. حاول مجدداً غداً!"

    # إذا لم تُعطى الإحداثيات، نستخدم إحداثيات القاهرة كافتراضية
    if lat is None or lon is None:
        # يمكن تحسينها لاحقاً بتحويل اسم المدينة إلى إحداثيات (geocoding)
        lat, lon = 30.0444, 31.2357  # القاهرة

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "current_weather": True,
                    "daily": "temperature_2m_max,temperature_2m_min",
                    "timezone": "auto"
                },
                timeout=5.0
            )
            if resp.status_code == 200:
                data = resp.json()
                current = data.get("current_weather", {})
                temp = current.get("temperature", "?")
                wind = current.get("windspeed", 0)
                code = current.get("weathercode", 0)
                desc = WEATHER_CODES_AR.get(code, "غير معروف")
                humidity = "غير متوفر"  # Open-Meteo لا تقدم رطوبة في الخطط المجانية، يمكن إضافتها بطلب آخر

                return (
                    f"🌤️ الطقس في منطقتك:\n"
                    f"{desc}\n"
                    f"🌡️ درجة الحرارة: {temp}°C\n"
                    f"💨 سرعة الرياح: {wind} كم/س"
                )
            return None
    except Exception as e:
        logger.error(f"Open-Meteo Error: {e}")
        return None

# ========== Google Search ==========
async def search_google(query: str, num: int = 3, user_id: Optional[str] = None, tier: str = "free") -> Optional[str]:
    if not GOOGLE_API_KEY or not GOOGLE_CSE_ID:
        return None
    check_func, _ = _get_limits_manager()
    if check_func and user_id:
        allowed, remaining = await asyncio.get_event_loop().run_in_executor(None, check_func, user_id, tier, "search")
        if not allowed:
            return "🔍 لقد استنفدت عمليات البحث اليوم. حاول مجدداً غداً!"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.googleapis.com/customsearch/v1",
                params={"key": GOOGLE_API_KEY, "cx": GOOGLE_CSE_ID, "q": query, "num": min(num, 5)},
                timeout=5.0
            )
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("items", [])
                if not items:
                    return None
                results = []
                for item in items[:num]:
                    results.append(f"🔎 {item['title']}\n{item['snippet']}\n🔗 {item['link']}")
                return "\n\n".join(results)
    except Exception as e:
        logger.error(f"Google Search Error: {e}")
    return None

# ========== Todoist & Calendar ==========
async def get_todoist_tasks(token: str) -> str:
    if not token: return "يحتاج ربط حساب Todoist."
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.todoist.com/rest/v2/tasks",
                headers={"Authorization": f"Bearer {token}"},
                params={"filter": "today | overdue"}, timeout=10.0
            )
            if resp.status_code == 200:
                tasks = resp.json()
                if not tasks: return "لا توجد مهام اليوم 🎉"
                return "✅ مهامك:\n" + "\n".join(f"• {t['content']}" for t in tasks[:10])
    except Exception as e:
        logger.error(f"Todoist Error: {e}")
    return ""

async def get_calendar_events(token: str) -> str:
    if not token: return "يحتاج ربط Google Calendar."
    try:
        now = datetime.now(timezone.utc).isoformat() + "Z"
        end = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat() + "Z"
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                headers={"Authorization": f"Bearer {token}"},
                params={"timeMin": now, "timeMax": end, "maxResults": 5, "singleEvents": True, "orderBy": "startTime"},
                timeout=10.0
            )
            if resp.status_code == 200:
                events = resp.json().get("items", [])
                if not events: return "لا توجد أحداث اليوم."
                return "📅 أحداث اليوم:\n" + "\n".join(f"• {e.get('summary', '?')}" for e in events[:5])
    except Exception as e:
        logger.error(f"Calendar Error: {e}")
    return ""

# ========== دوال التوافق ==========
async def get_news(query: str = "world", lang: str = "ar") -> Optional[str]:
    return None

def get_location_info(query: str) -> str:
    return f"معلومات عن: {query}"

async def get_knowledge(query: str) -> Optional[str]:
    return None
