"""MyTwin API v8.0 — All Features Enabled + Latency Tracker"""
import os, asyncio, logging, hmac, hashlib, json
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
from emotional_engine import calc_energy, tts_params, get_voice_emotion
from time import time
from monitoring import AIMonitor
from multi_ai import AIUnavailable
from latency_tracker import tracker  # ✅ تتبع زمن الاستجابة

# ========== الخدمات الخارجية ==========
from external_services import (
    search_youtube, search_spotify, get_weather,
    get_todoist_tasks, get_calendar_events,
    get_news, get_location_info, get_knowledge
)

# ========== تيليجرام Webhook ==========
from telegram_webhook import router as telegram_router, setup_webhook

try:
    from product_recommender import extract_purchase_intent, get_recommended_product, format_product_suggestion, log_product_impression
    HAS_PRODUCT_RECOMMENDER = True
except ImportError:
    HAS_PRODUCT_RECOMMENDER = False

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mytwin")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
RC_SECRET = os.getenv("REVENUECAT_WEBHOOK_SECRET", "")
CRON_SECRET_KEY = os.getenv("CRON_SECRET_KEY", "")

if not all([SUPABASE_URL, SUPABASE_KEY, GEMINI_KEY]):
    raise RuntimeError("Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, GEMINI_API_KEY")

if not CRON_SECRET_KEY:
    logger.warning("CRON_SECRET_KEY is not configured. Cron endpoint will be disabled for security.")

def parse_allowed_origins(raw: str) -> list[str]:
    origins = []
    for origin in [o.strip() for o in raw.split(",") if o.strip()]:
        if origin in ("*", "null"): continue
        if origin.startswith("http://") or origin.startswith("https://"):
            origins.append(origin)
    return origins

ALLOWED_ORIGINS = ["https://mytwin.app", "http://localhost:3000", "http://localhost:8000", "http://127.0.0.1:19006", "http://10.0.0.1:8000"]
if extra_origins := parse_allowed_origins(os.getenv("ALLOWED_ORIGINS", "")):
    ALLOWED_ORIGINS = extra_origins

if not ALLOWED_ORIGINS: raise RuntimeError("ALLOWED_ORIGINS must contain at least one valid origin")

db: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
brain = TwinBrain(GEMINI_KEY)
from consciousness_core import ConsciousnessCore
consciousness = ConsciousnessCore(twin_name="MyTwin", gemini_key=GEMINI_KEY)

app = FastAPI(title="MyTwin API", version="8.0.0")

# ========== تيليجرام Webhook ==========
app.include_router(telegram_router)

@app.on_event("startup")
async def startup_event():
    await setup_webhook()

# ─── Monitoring Middleware ─────────────────────────────────────
@app.middleware("http")
async def monitor_requests(request: Request, call_next):
    start = time()
    response = await call_next(request)
    duration = time() - start
    logger.info(f"{request.method} {request.url.path} completed in {duration:.3f}s with status {response.status_code}")
    return response

@app.middleware("http")
async def csrf_check(request: Request, call_next):
    if request.method in ("POST", "PUT", "DELETE", "PATCH"):
        origin = request.headers.get("origin", "")
        if origin and origin not in ALLOWED_ORIGINS:
            return JSONResponse(status_code=403, content={"detail": "Origin not allowed"})
    return await call_next(request)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], allow_headers=["Authorization", "Content-Type", "X-Cron-Key", "X-Requested-With", "X-Country-Code", "X-Twin-Gender"], allow_credentials=True, max_age=600)

async def run_async(fn, *args):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, fn, *args)

async def get_user(auth: str = Header(default=None)) -> Optional[str]:
    if not auth:
        return None
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="unauthorized")
    token = auth[7:].strip()
    try:
        user = await run_async(lambda: db.auth.get_user(token))
        if not getattr(user, "user", None) or not getattr(user.user, "id", None):
            raise HTTPException(status_code=401, detail="unauthorized")
        return user.user.id
    except Exception as exc:
        logger.warning(f"get_user auth failed: {exc}")
        raise HTTPException(status_code=401, detail="unauthorized")

async def get_profile(uid):
    k = f"p:{uid}"
    if c := cache_get(k): return c
    try:
        r = await run_async(lambda: db.table("profiles").select("*").eq("id", uid).single().execute())
        p = r.data or {}
        cache_set(k, p, 600)
        return p
    except Exception as exc:
        logger.error(f"get_profile failed for {uid}: {exc}")
        raise HTTPException(status_code=500, detail="profile_fetch_error")

async def get_usage(uid):
    t = date.today().isoformat()
    try:
        r = await run_async(lambda: db.table("daily_usage").select("messages").eq("user_id", uid).eq("date", t).limit(1).execute())
        return r.data[0].get("messages", 0) if getattr(r, "data", None) else 0
    except Exception as exc:
        logger.warning(f"get_usage failed for {uid}: {exc}")
        return 0

class ChatReq(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    twin_name: str = Field("توأمك")
    bond_level: float = Field(0.0)
    dims: dict = Field(default_factory=dict)
    history: list = Field(default_factory=list)

@app.get("/")
async def root(): return {"status":"ok","version":"8.0.0"}
@app.get("/health")
async def health(): return {"status":"ok","version":"8.0.0"}

@app.post("/api/chat")
@limiter.limit("30/minute")
async def chat(
    request: Request,
    body: ChatReq,
    uid=Depends(get_user),
    calm: str = Header("false"),
    x_country_code: str = Header("SA"),
    x_twin_gender: str = Header("female")
):
    is_calm = calm.lower() == "true"
    country_code = x_country_code or "SA"
    twin_gender = x_twin_gender or "female"
    
    p = await get_profile(uid)
    tier = p.get("tier","free")
    sd = p.get("signup_date") or p.get("created_at", datetime.now(timezone.utc).isoformat())
    ts = p.get("trial_start")
    est = len(body.message.encode()) + sum(len(m.get("content","").encode()) for m in body.history[-10:]) // 4 + 150
    ok, rem = check_tok(uid, tier, est, sd, ts)
    if not ok:
        used = await get_usage(uid)
        lim = BASE_TOK.get(tier, 3000)
        if used + est > lim: raise HTTPException(429, "token_limit")
        rem = lim - used - est
    emo_filter = None
    emo = {"needs_support": False}

    # ✅ تتبع زمن اكتشاف المشاعر
    tracker.start("emotion_detection")
    try:
        emo = brain.detect_emotion(body.message)
        if emo.get("needs_support"): emo_filter = "sadness"
    except Exception as exc:
        logger.warning(f"emotion detection failed: {exc}")
    finally:
        tracker.end()

    mems = []
    try:
        from memory_engine import DeepMemorySystem
        mems = DeepMemorySystem().retrieve(uid, body.message, days=7, lim=5, emotion_filter=emo_filter)
    except ImportError:
        logger.debug("DeepMemorySystem unavailable")
    except Exception as exc:
        logger.warning(f"memory retrieval failed: {exc}")
    if not mems:
        try:
            from memory_engine import get_mems
            mems = await run_async(lambda: get_mems(uid, body.message, 7, 5))
        except Exception as exc:
            logger.warning(f"fallback memory retrieval failed: {exc}")
    personality_data = None
    try:
        pers = await run_async(lambda: db.table("personality_profiles").select("analyzed_traits").eq("user_id", uid).single().execute())
        if pers.data: personality_data = pers.data.get("analyzed_traits")
    except Exception as exc:
        logger.debug(f"Personality lookup failed: {exc}")

    # ✅ تتبع زمن استجابة الدماغ
    tracker.start("brain_response")
    try:
        res = await run_async(lambda: brain.respond(
            message=body.message, twin_name=body.twin_name, bond_level=body.bond_level,
            dims=body.dims, memories=mems, history=body.history[-10:], calm=is_calm,
            personality=personality_data, country_code=country_code
        ))
        tracker.end()
        AIMonitor.log(
            db=db, uid=uid, provider=res.get("provider"),
            task=res.get("task", "general"), latency=res.get("latency_ms", 0),
            success=True, tokens=est
        )
    except AIUnavailable:
        return {
            "reply": "أواجه حالياً ضغطاً تقنياً مؤقتاً، لكنني ما زلت معك وسأعود للعمل الكامل خلال لحظات 💜",
            "provider": "fallback", "confidence": 0
        }
    except Exception as e:
        logger.error(f"brain: {e}")
        raise HTTPException(500, "ai_error")
    sug = None
    if HAS_PRODUCT_RECOMMENDER:
        try:
            intent = extract_purchase_intent(body.message)
            if intent:
                prod = get_recommended_product(intent)
                if prod:
                    sug = format_product_suggestion(prod)
                    asyncio.create_task(run_async(lambda: log_product_impression(uid, str(prod.get("id")), f"{uid}-{datetime.now(timezone.utc).timestamp()}")))
        except Exception as exc:
            logger.warning(f"product recommendation failed: {exc}")
    asyncio.create_task(run_async(lambda: db.rpc("increment_daily_usage", {"p_user_id":uid, "p_field":"messages"}).execute()))
    if len(body.message) > 20 and res.get("importance", 0) > 0.6:
        try:
            from memory_engine import store_mem
            asyncio.create_task(run_async(lambda: store_mem(uid, body.message, res.get("importance", 0.5), res.get("emotion", {}).get("primary", "neutral"))))
        except Exception as exc:
            logger.warning(f"memory store task failed: {exc}")
    
    energy = calc_energy(p.get("last_active",""), p.get("daily_msgs",0), res.get("emotion",{}).get("primary","neutral"))
    emotion_data = res.get("emotion", {})
    voice_emotion = get_voice_emotion(emotion_data)
    voice = tts_params(emotion_data.get("primary", "neutral"), is_calm)
    from dialect_engine import get_voice_dialect
    voice_dialect = get_voice_dialect(country_code)
    
    resp = {
        "reply": res["reply"],
        "new_bond": res["new_bond"],
        "emotion": res["emotion"],
        "energy": energy,
        "tts": voice,
        "tts_tier": tier,
        "tts_gender": twin_gender,
        "tts_emotion": voice_emotion,
        "tts_dialect": voice_dialect,
        "tokens_left": rem,
        "provider": res.get("provider","gemini_flash"),
        "latency_breakdown": tracker.get_breakdown(),  # ✅ تقرير زمن الاستجابة
    }
    if "dream_data" in res: resp["dream"] = res["dream_data"]
    if "coaching_data" in res: resp["coaching"] = res["coaching_data"]
    if sug: resp["suggestion"] = sug
    return resp

@app.delete("/api/account")
async def del_acc(uid=Depends(get_user)):
    await run_async(lambda: db.table("profiles").delete().eq("id", uid).execute())
    try: await run_async(lambda: db.auth.admin.delete_user(uid))
    except Exception as e: logger.warning(f"del user: {e}")
    return {"status":"deleted"}

@app.post("/cron/cleanup")
async def cron_cleanup(req: Request):
    key = req.headers.get("X-Cron-Key", "")
    if not CRON_SECRET_KEY: raise HTTPException(status_code=401, detail="cron_secret_not_configured")
    if key != CRON_SECRET_KEY: raise HTTPException(status_code=401, detail="unauthorized")
    await run_async(lambda: db.rpc("cleanup_expired_memories").execute())
    await run_async(lambda: db.table("messages").delete().lt("created_at", (datetime.now(timezone.utc)-timedelta(days=90)).isoformat()).execute())
    return {"status":"cleaned"}

@app.get("/api/consciousness/state")
async def get_consciousness(uid=Depends(get_user)):
    return consciousness.get_consciousness_state()
@app.get("/api/consciousness/predict")
async def predict_need(uid=Depends(get_user)):
    return {"prediction": consciousness.predict_need(uid)}
@app.get("/api/consciousness/desire")
async def get_desire():
    return {"desire": consciousness.express_desire()}
@app.post("/api/twin/state/sync")
async def sync_twin_state(uid=Depends(get_user)):
    state = await consciousness.load_state(uid)
    return state or {"status": "no_state_yet"}

class ReminderReq(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(default="", max_length=500)
    remind_at: str = Field(..., description="ISO format datetime")

@app.post("/api/reminders")
async def create_reminder(body: ReminderReq, uid=Depends(get_user)):
    await run_async(lambda: db.table("reminders").insert({
        "user_id": uid, "title": body.title, "description": body.description, "remind_at": body.remind_at
    }).execute())
    return {"status": "ok", "message": "تم إنشاء التذكير"}

@app.get("/api/reminders")
async def get_reminders(uid=Depends(get_user)):
    r = await run_async(lambda: db.table("reminders").select("*").eq("user_id", uid).order("remind_at", asc=True).execute())
    return r.data or []

@app.delete("/api/reminders/{reminder_id}")
async def delete_reminder(reminder_id: str, uid=Depends(get_user)):
    await run_async(lambda: db.table("reminders").delete().eq("id", reminder_id).eq("user_id", uid).execute())
    return {"status": "deleted"}

@app.get("/api/calendar/events")
async def get_calendar_events(uid=Depends(get_user)):
    return {"status": "not_configured", "message": "يحتاج ربط حساب Google"}

@app.post("/api/smart-home/control")
async def control_smart_device(service: str, entity_id: str, data: Optional[dict] = None, uid=Depends(get_user)):
    import smart_home as sh
    success = sh.call_service(service, entity_id, data)
    return {"status": "ok" if success else "failed"}

@app.get("/api/smart-home/status")
async def get_device_status(entity_id: str, uid=Depends(get_user)):
    import smart_home as sh
    state = sh.get_device_state(entity_id)
    return state or {"status": "unavailable"}

# ========== YouTube ==========
@app.get("/api/services/youtube")
async def youtube_endpoint(query: str, lang: str = "ar"):
    result = await search_youtube(query, lang=lang)
    return {"result": result} if result else {"error": "unavailable"}

# ========== Spotify ==========
@app.get("/api/services/spotify")
async def spotify_endpoint(query: str):
    result = await search_spotify(query)
    return {"result": result} if result else {"error": "unavailable"}

# ========== الطقس ==========
@app.get("/api/services/weather")
async def weather_endpoint(city: str = "Cairo", lat: Optional[float] = None, lon: Optional[float] = None):
    result = await get_weather(city, lat, lon)
    return {"result": result} if result else {"error": "unavailable"}

# ========== Todoist ==========
@app.get("/api/services/todoist")
async def todoist_endpoint(token: str = ""):
    result = await get_todoist_tasks(token)
    return {"result": result}

# ========== Google Calendar ==========
@app.get("/api/services/calendar")
async def calendar_endpoint(token: str = ""):
    result = await get_calendar_events(token)
    return {"result": result}

# ========== خدمات أخرى ==========
@app.get("/api/services/news")
async def news_endpoint(query: str = "world", lang: str = "ar"):
    result = await get_news(query, lang)
    return {"result": result} if result else {"error": "unavailable"}

@app.get("/api/services/maps")
async def maps_endpoint(query: str):
    return {"result": get_location_info(query)}

@app.get("/api/services/knowledge")
async def knowledge_endpoint(query: str):
    result = await get_knowledge(query)
    return {"result": result} if result else {"error": "unavailable"}

# ========== الإحالة ==========
class ReferralCodeReq(BaseModel):
    code: str = Field(..., min_length=2, max_length=20)

@app.post("/api/referral/generate")
async def generate_referral(uid=Depends(get_user)):
    from referral import generate_referral_code
    code = generate_referral_code(uid)
    await run_async(lambda: db.table("profiles").update({"referral_code": code}).eq("id", uid).execute())
    return {"code": code}

@app.post("/api/referral/activate")
async def activate_referral_endpoint(body: ReferralCodeReq, uid=Depends(get_user)):
    from referral import activate_referral
    result = activate_referral(uid, body.code)
    if result.get("success"):
        inviter_id = result.get("inviter_id")
        if inviter_id:
            from token_limits import add_referral_bonus
            add_referral_bonus(inviter_id, 500)
            add_referral_bonus(uid, 500)
        return {"success": True, "bonus": 500}
    raise HTTPException(400, result.get("error", "invalid_code"))

# ========== AI Endpoints ==========
@app.get("/api/ai/grok")
async def grok_chat(prompt: str):
    from multi_ai import MultiAIClient
    client = MultiAIClient()
    reply = client.groq_chat(prompt)
    return {"reply": reply or "Error"}

@app.get("/api/ai/openrouter")
async def openrouter_chat(prompt: str):
    from multi_ai import MultiAIClient
    client = MultiAIClient()
    reply = client.openrouter_chat(prompt)
    return {"reply": reply or "Error"}
