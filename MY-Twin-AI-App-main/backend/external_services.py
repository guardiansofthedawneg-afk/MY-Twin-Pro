"""
MyTwin – External Services v3.0 (موحد)
YouTube + Spotify + Weather + News + Todoist + Calendar + Knowledge
"""
import os
import logging
import base64
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, timedelta
import httpx

logger = logging.getLogger(__name__)

# ========== مفاتيح API ==========
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")
SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID", "")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET", "")
OPENWEATHER_API_KEY = os.getenv("OPENWEATHERMAP_API_KEY", "")

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
                if resp.status_code != 200:
                    return None
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

async def search_spotify(query: str) -> str:
    return await spotify_client.search(query)

# ========== YouTube ==========

async def search_youtube(query: str, max_results: int = 3, lang: str = "ar") -> Optional[str]:
    """البحث في YouTube وإرجاع نتائج منسقة"""
    if not YOUTUBE_API_KEY:
        return None
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
            return None
    except Exception as e:
        logger.error(f"YouTube Error: {e}")
        return None

# ========== الطقس ==========

async def get_weather(city: str = "Cairo", lat: Optional[float] = None, lon: Optional[float] = None) -> Optional[str]:
    """الحصول على حالة الطقس"""
    if not OPENWEATHER_API_KEY:
        return None
    try:
        async with httpx.AsyncClient() as client:
            if lat and lon:
                url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric&lang=ar"
            else:
                url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={OPENWEATHER_API_KEY}&units=metric&lang=ar"
            
            resp = await client.get(url, timeout=5.0)
            if resp.status_code == 200:
                data = resp.json()
                temp = data["main"]["temp"]
                desc = data["weather"][0]["description"]
                feels_like = data["main"]["feels_like"]
                humidity = data["main"]["humidity"]
                wind = data.get("wind", {}).get("speed", 0)
                city_name = data.get("name", city)
                return f"🌤️ الطقس في {city_name}:\n{desc}\n🌡️ درجة الحرارة: {temp}°C (تشعر وكأنها {feels_like}°C)\n💧 الرطوبة: {humidity}%\n💨 سرعة الرياح: {wind} م/ث"
            return None
    except Exception as e:
        logger.error(f"Weather Error: {e}")
        return None

# ========== Todoist ==========

async def get_todoist_tasks(token: str) -> str:
    """جلب مهام Todoist"""
    if not token:
        return "يحتاج ربط حساب Todoist."
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.todoist.com/rest/v2/tasks",
                headers={"Authorization": f"Bearer {token}"},
                params={"filter": "today | overdue"},
                timeout=10.0
            )
            if resp.status_code == 200:
                tasks = resp.json()
                if not tasks:
                    return "لا توجد مهام اليوم 🎉"
                return "✅ مهامك:\n" + "\n".join(f"• {t['content']}" for t in tasks[:10])
            return ""
    except Exception as e:
        logger.error(f"Todoist Error: {e}")
        return ""

# ========== Google Calendar ==========

async def get_calendar_events(token: str) -> str:
    """جلب أحداث Google Calendar"""
    if not token:
        return "يحتاج ربط Google Calendar."
    try:
        now = datetime.now(timezone.utc).isoformat() + "Z"
        end = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat() + "Z"
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                headers={"Authorization": f"Bearer {token}"},
                params={
                    "timeMin": now,
                    "timeMax": end,
                    "maxResults": 5,
                    "singleEvents": True,
                    "orderBy": "startTime",
                },
                timeout=10.0
            )
            if resp.status_code == 200:
                events = resp.json().get("items", [])
                if not events:
                    return "لا توجد أحداث اليوم."
                return "📅 أحداث اليوم:\n" + "\n".join(
                    f"• {e.get('summary', '?')}" for e in events[:5]
                )
            return ""
    except Exception as e:
        logger.error(f"Calendar Error: {e}")
        return ""

# ========== الأخبار ==========

async def get_news(query: str = "world", lang: str = "ar") -> Optional[str]:
    """الحصول على آخر الأخبار (للتوافق)"""
    # يمكن تفعيلها لاحقًا مع NewsAPI
    return None

def get_location_info(query: str) -> str:
    """معلومات عن موقع (للتوافق)"""
    return f"معلومات عن: {query}"

async def get_knowledge(query: str) -> Optional[str]:
    """البحث عن معرفة (للتوافق)"""
    return None
