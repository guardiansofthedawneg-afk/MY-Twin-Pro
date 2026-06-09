"""
MyTwin API v10.1 – يدعم البث المباشر (Streaming)
"""
import os, asyncio, logging, json
from datetime import datetime, timezone, timedelta, date
from typing import Optional, Dict, List, Any
from fastapi import FastAPI, HTTPException, Request, Depends, Header
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from slowapi.errors import RateLimitExceeded
from supabase import create_client, Client

from twin_brain import TwinBrain
from rate_limiter import limiter, rate_limit_exceeded_handler
from cache import get as cache_get, set as cache_set
from multi_ai import AIUnavailable
from consciousness_core import ConsciousnessCore
from message_limits import (
    check_message_limit, check_tok, check_feature_usage,
    get_usage_summary, get_tier_features, activate_referral_bonus,
    add_referral_tok_bonus
)
from external_services import (
    search_youtube, search_spotify, get_weather,
    get_todoist_tasks, get_calendar_events,
    get_news, get_location_info, get_knowledge
)
from telegram_webhook import router as telegram_router, setup_webhook
from referral import generate_referral_code, activate_referral
from proactive_engine import proactive_engine
from dream_engine import analyze_dream
from growth_tracker import get_growth_history

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mytwin")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
CRON_SECRET_KEY = os.getenv("CRON_SECRET_KEY", "")

if not all([SUPABASE_URL, SUPABASE_KEY, GEMINI_KEY]):
    raise RuntimeError("Missing required env vars")

db: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
brain = TwinBrain(GEMINI_KEY)
consciousness = ConsciousnessCore(twin_name="MyTwin", gemini_key=GEMINI_KEY)

ALLOWED_ORIGINS = [
    "https://mytwin.app",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:19006",
    "exp://192.168.1.1:19000"
]

app = FastAPI(title="MyTwin API", version="10.1.0")
app.include_router(telegram_router)

@app.on_event("startup")
async def startup_event():
    await setup_webhook()

app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_methods=["*"], allow_headers=["*"], allow_credentials=True)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# المصادقة
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

class ChatReq(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    twin_name: str = Field("توأمك")
    bond_level: float = Field(0.0)
    dims: dict = Field(default_factory=dict)
    history: list = Field(default_factory=list)

class ReferralCodeReq(BaseModel):
    code: str = Field(..., min_length=2, max_length=20)

# ========== المحادثة العادية ==========
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
    p = get_profile(uid)
    tier = p.get("tier", "free")
    signup_date = p.get("created_at")

    from safety_engine import safety_engine
    safety_check = safety_engine.check_safety(body.message)
    if not safety_check["safe"] and safety_check["severity"] == "critical":
        return {
            "reply": safety_engine.HELPLINE_MESSAGE,
            "safety_alert": True,
            "provider": "safety_engine"
        }

    allowed, remaining, reason = check_message_limit(uid, tier, signup_date)
    if not allowed:
        await proactive_engine.trigger_daily_limit_notification(uid, tier, p.get("lang", "ar"))
        return JSONResponse(
            status_code=429,
            content={
                "reply": "استنفدت طاقتي اليومية 💜 سأعود غداً بطاقة جديدة!",
                "limit_reached": True,
                "remaining": 0,
                "provider": "limit_handler"
            }
        )

    res = {}
    try:
        recent_msgs = [h.get("content", "") for h in body.history[-20:] if isinstance(h, dict)]
        recent_msgs.append(body.message)
        res = await brain.respond(
            message=body.message,
            twin_name=body.twin_name,
            bond_level=body.bond_level,
            dims=body.dims,
            memories=[],
            history=body.history[-10:],
            calm=is_calm,
            personality=None,
            country_code=country_code,
            user_id=uid,
            tier=tier,
            join_date=signup_date,
            recent_messages=recent_msgs
        )
        if not isinstance(res, dict):
            res = {"reply": "حدث خطأ تقني مؤقت 💜", "provider": "error_handler"}
    except AIUnavailable:
        res = {"reply": "أواجه ضغطاً تقنياً مؤقتاً، سأعود قريباً 💜", "provider": "fallback"}
    except Exception as e:
        logger.error(f"Critical Brain Error: {e}")
        res = {"reply": "أواجه ضغطاً تقنياً، سأعود قريباً 💜", "provider": "exception_handler"}

    try:
        loop = asyncio.get_running_loop()
        loop.run_in_executor(None, lambda: db.rpc("increment_daily_usage", {"p_user_id": uid, "p_field": "messages"}).execute())
    except:
        pass

    return {
        "reply": res.get("reply", "..."),
        "new_bond": res.get("new_bond", 0),
        "emotion": res.get("emotion", {}),
        "tokens_left": 999,
        "provider": res.get("provider", "unknown"),
        "latency_ms": res.get("latency_ms", 0),
        "journey_phase": res.get("journey_phase"),
        "journey_day": res.get("journey_day"),
        "attachment_style": res.get("attachment_style")
    }

# ========== المحادثة بالبث المباشر ==========
@app.post("/api/chat/stream")
@limiter.limit("30/minute")
async def chat_stream(
    request: Request,
    body: ChatReq,
    uid: str = Depends(get_user),
    calm: str = Header("false"),
    x_country_code: str = Header("SA"),
    x_twin_gender: str = Header("female")
):
    is_calm = calm.lower() == "true"
    country_code = x_country_code or "SA"
    p = get_profile(uid)
    tier = p.get("tier", "free")
    signup_date = p.get("created_at")

    from safety_engine import safety_engine
    safety_check = safety_engine.check_safety(body.message)
    if not safety_check["safe"] and safety_check["severity"] == "critical":
        return JSONResponse(content={"reply": safety_engine.HELPLINE_MESSAGE, "safety_alert": True})

    allowed, remaining, reason = check_message_limit(uid, tier, signup_date)
    if not allowed:
        return JSONResponse(status_code=429, content={"error": "limit_reached"})

    # بناء الـ prompt باستخدام prompt_builder
    from prompt_builder import PromptBuilder
    pb = PromptBuilder()
    # استخراج العاطفة والمعلومات (نسخة مختصرة)
    # نستخدم TwinBrain لتحليل العاطفة فقط، ثم نبني prompt يدوياً
    # يمكن تحسينه لاحقاً
    prompt = await pb.build(
        twin_name=body.twin_name,
        user_name="صديقي",
        relationship={"label": "Friend", "bond_level": body.bond_level, "instruction": "Be supportive."},
        emotion={"primary": "neutral", "intensity": 0.5},
        voice={"style": "Warm", "pitch": 1.0, "rate": 1.0},
        dialect={"dialect": "ar", "instruction": "Use modern Arabic naturally."},
        user_id=uid
    )
    prompt += f"\nUser message: {body.message}\nYour response:"

    async def token_generator():
        async for token in brain.multi.stream_reply(prompt, "general"):
            yield token

    return StreamingResponse(token_generator(), media_type="text/plain")

# ========== باقي المسارات (كما هي) ==========
@app.post("/api/referral/generate")
async def generate_referral(uid: str = Depends(get_user)):
    code = generate_referral_code(uid)
    try:
        db.table("profiles").update({"referral_code": code}).eq("id", uid).execute()
    except:
        pass
    return {"code": code}

@app.post("/api/referral/activate")
async def activate_referral_endpoint(body: ReferralCodeReq, uid: str = Depends(get_user)):
    result = activate_referral(uid, body.code)
    if result.get("success"):
        inviter_id = result.get("inviter_id")
        if inviter_id:
            add_referral_tok_bonus(inviter_id)
            add_referral_tok_bonus(uid)
            activate_referral_bonus(uid)
        return {"success": True, "bonus": 500}
    raise HTTPException(400, result.get("error", "invalid_code"))

@app.post("/cron/proactive")
async def cron_proactive(req: Request):
    key = req.headers.get("X-Cron-Key", "")
    if not CRON_SECRET_KEY or key != CRON_SECRET_KEY:
        raise HTTPException(401, "unauthorized")
    result = await proactive_engine.run_cron_job()
    return result

@app.post("/api/dream/analyze")
async def analyze_dream_endpoint(body: dict, uid: str = Depends(get_user)):
    return await analyze_dream(uid, body.get("dream", ""), body.get("lang", "ar"))

@app.get("/api/growth/history")
async def growth_history(uid: str = Depends(get_user)):
    return await get_growth_history(uid)

@app.get("/api/services/youtube")
async def youtube_endpoint(query: str, lang: str = "ar", uid: str = Depends(get_user)):
    p = get_profile(uid)
    allowed, remaining = check_feature_usage(uid, p.get("tier", "free"), "youtube")
    if not allowed:
        return JSONResponse(status_code=429, content={"error": "daily_limit_reached", "remaining": 0})
    result = await search_youtube(query, lang=lang)
    return {"result": result, "remaining": remaining} if result else {"error": "unavailable"}

@app.get("/api/services/spotify")
async def spotify_endpoint(query: str, uid: str = Depends(get_user)):
    p = get_profile(uid)
    allowed, remaining = check_feature_usage(uid, p.get("tier", "free"), "spotify")
    if not allowed:
        return JSONResponse(status_code=429, content={"error": "daily_limit_reached"})
    result = await search_spotify(query)
    return {"result": result, "remaining": remaining} if result else {"error": "unavailable"}

@app.get("/api/services/weather")
async def weather_endpoint(city: str = "Cairo", uid: str = Depends(get_user)):
    p = get_profile(uid)
    allowed, remaining = check_feature_usage(uid, p.get("tier", "free"), "weather")
    if not allowed:
        return JSONResponse(status_code=429, content={"error": "daily_limit_reached"})
    result = await get_weather(city)
    return {"result": result, "remaining": remaining} if result else {"error": "unavailable"}

@app.get("/")
async def root():
    return {"status": "ok", "version": "10.1.0"}

@app.delete("/api/account")
async def del_acc(uid: str = Depends(get_user)):
    db.table("profiles").delete().eq("id", uid).execute()
    return {"status": "deleted"}

@app.get("/api/consciousness/state")
async def get_consciousness(uid: str = Depends(get_user)):
    return consciousness.get_consciousness_state()

@app.get("/api/stats")
async def get_ai_stats(uid: str = Depends(get_user)):
    try:
        p = get_profile(uid)
        summary = get_usage_summary(uid, p.get("tier", "free"), p.get("created_at"))
        return {
            "daily_requests": summary["messages"]["used"],
            "total_memories": 0,
            "active_models": 8,
            "avg_latency": "450ms",
            "limits": summary
        }
    except Exception as e:
        logger.error(f"Stats error: {e}")
        return {"error": "unavailable"}

@app.get("/api/limits/check")
async def check_limits(uid: str = Depends(get_user), feature: str = ""):
    p = get_profile(uid)
    tier = p.get("tier", "free")
    if feature:
        allowed, remaining = check_feature_usage(uid, tier, feature)
        return {"feature": feature, "allowed": allowed, "remaining": remaining}
    summary = get_usage_summary(uid, tier, p.get("created_at"))
    return summary

@app.get("/api/proactive/check")
async def proactive_check(uid: str = Depends(get_user)):
    try:
        should_send = proactive_engine.should_send_proactive(uid)
        return {"should_send": should_send, "user_id": uid}
    except Exception as e:
        logger.error(f"Proactive check error: {e}")
        return {"error": "unavailable"}

# ========== Product Recommender Click Tracking ==========
@app.post("/api/product/click")
async def product_click(body: dict, uid: str = Depends(get_user)):
    product_id = body.get("product_id")
    if not product_id:
        raise HTTPException(400, "missing_product_id")
    from product_recommender import product_recommender
    success = product_recommender.log_click(uid, product_id)
    return {"success": success}
