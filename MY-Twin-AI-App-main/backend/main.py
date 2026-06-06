"""MyTwin API v8.4 — Fixed ALLOWED_ORIGINS & Auth"""
import os, asyncio, logging, json
from datetime import datetime, timezone, timedelta, date
from typing import Optional, Dict, List, Any
from fastapi import FastAPI, HTTPException, Request, Depends, Header
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from slowapi.errors import RateLimitExceeded
from supabase import create_client, Client
from twin_brain import TwinBrain
from rate_limiter import limiter, rate_limit_exceeded_handler
from token_limits import check_tok, BASE_TOK
from cache import get as cache_get, set as cache_set
from time import time
from multi_ai import AIUnavailable
from external_services import (
    search_youtube, search_spotify, get_weather,
    get_todoist_tasks, get_calendar_events,
    get_news, get_location_info, get_knowledge
)
from telegram_webhook import router as telegram_router, setup_webhook

# ---- Configuration ----
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mytwin")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")

if not all([SUPABASE_URL, SUPABASE_KEY, GEMINI_KEY]):
    raise RuntimeError("Missing required env vars")

db: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
brain = TwinBrain(GEMINI_KEY)
from consciousness_core import ConsciousnessCore
consciousness = ConsciousnessCore(twin_name="MyTwin", gemini_key=GEMINI_KEY)

# ✅ FIX: Define ALLOWED_ORIGINS BEFORE using it in middleware
ALLOWED_ORIGINS = [
    "https://mytwin.app", 
    "http://localhost:3000", 
    "http://localhost:8000", 
    "http://127.0.0.1:19006",
    "exp://192.168.1.1:19000" # For Expo Go testing
]
# ---- FastAPI App ----
app = FastAPI(title="MyTwin API", version="8.4.0")
app.include_router(telegram_router)

@app.on_event("startup")
async def startup_event():
    await setup_webhook()

# ---- CORS & Middleware ----
app.add_middleware(
    CORSMiddleware, 
    allow_origins=ALLOWED_ORIGINS, 
    allow_methods=["*"], 
    allow_headers=["*"], 
    allow_credentials=True
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# ---- Auth (Sync Supabase Calls) ----
def get_user(auth: str = Header(default=None, alias="Authorization")) -> Optional[str]:
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(401, "unauthorized")
    token = auth[7:].strip()
    try:
        user_resp = db.auth.get_user(token)
        if not user_resp.user or not user_resp.user.id:
            raise HTTPException(401, "unauthorized")
        return user_resp.user.id
    except Exception as e:
        logger.warning(f"Auth failed: {e}")
        raise HTTPException(401, "unauthorized")

def get_profile(uid: str) -> dict:
    k = f"p:{uid}"
    if c := cache_get(k): return c
    try:
        r = db.table("profiles").select("*").eq("id", uid).single().execute()
        p = r.data or {}
        cache_set(k, p, 600)
        return p
    except Exception as e:
        logger.error(f"Profile fetch failed: {e}")
        return {}

# ---- Models ----
class ChatReq(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    twin_name: str = Field("توأمك")
    bond_level: float = Field(0.0)
    dims: dict = Field(default_factory=dict)
    history: list = Field(default_factory=list)

# ---- Core Chat Endpoint ----
@app.post("/api/chat")
@limiter.limit("30/minute")
async def chat(
    request: Request,
    body: ChatReq,
    uid: str = Depends(get_user),
    calm: str = Header("false"),
    x_country_code: str = Header("SA"),
    x_twin_gender: str = Header("female")
):
    is_calm = calm.lower() == "true"
    country_code = x_country_code or "SA"
    twin_gender = x_twin_gender or "female"

    # 1. Get basic profile
    p = get_profile(uid)
    tier = p.get("tier", "free")

    # 2. Call TwinBrain with safety
    res = {}
    try:
        res = await brain.respond(
            message=body.message,
            twin_name=body.twin_name,
            bond_level=body.bond_level,
            dims=body.dims,
            memories=[],
            history=body.history[-10:],
            calm=is_calm,
            personality=None,
            country_code=country_code
        )
        if not isinstance(res, dict):
            logger.error(f"Brain returned non-dict: {type(res)}")
            res = {"reply": "حدث خطأ تقني مؤقت 💜", "provider": "error_handler"}
    except AIUnavailable:
        res = {"reply": "أواجه ضغطاً تقنياً مؤقتاً، سأعود قريباً 💜", "provider": "fallback"}
    except Exception as e:
        logger.error(f"Critical Brain Error: {e}")
        res = {"reply": "أواجه ضغطاً تقنياً، سأعود قريباً 💜", "provider": "exception_handler"}

    # 3. Increment usage safely
    try:
        loop = asyncio.get_running_loop()
        loop.run_in_executor(None, lambda: db.rpc("increment_daily_usage", {"p_user_id": uid, "p_field": "messages"}).execute())
    except Exception:        pass

    # 4. Return response
    return {
        "reply": res.get("reply", "..."),
        "new_bond": res.get("new_bond", 0),
        "emotion": res.get("emotion", {}),
        "tokens_left": 999,
        "provider": res.get("provider", "unknown"),
        "latency_ms": res.get("latency_ms", 0)
    }

# ---- Other Endpoints ----
@app.get("/")
async def root():
    return {"status": "ok", "version": "8.4.0"}

@app.delete("/api/account")
async def del_acc(uid: str = Depends(get_user)):
    db.table("profiles").delete().eq("id", uid).execute()
    return {"status": "deleted"}

@app.get("/api/services/youtube")
async def youtube_endpoint(query: str, lang: str = "ar"):
    result = await search_youtube(query, lang=lang)
    return {"result": result} if result else {"error": "unavailable"}

@app.get("/api/services/spotify")
async def spotify_endpoint(query: str):
    result = await search_spotify(query)
    return {"result": result} if result else {"error": "unavailable"}

@app.get("/api/services/weather")
async def weather_endpoint(city: str = "Cairo"):
    result = await get_weather(city)
    return {"result": result} if result else {"error": "unavailable"}

@app.get("/api/consciousness/state")
async def get_consciousness(uid: str = Depends(get_user)):
    return consciousness.get_consciousness_state()
