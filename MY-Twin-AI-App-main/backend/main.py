"""MyTwin API v6.3.0 — Production Ready"""
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
from message_limits import check_message_limit, get_bond_ceiling, apply_bond_ceiling, get_tier_models, get_usage_summary, activate_referral_bonus
from cache import get as cache_get, set as cache_set
from emotional_engine import calc_energy, tts_params
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

app = FastAPI(title="MyTwin API", version="6.3.0")

@app.middleware("http")
async def csrf_check(request: Request, call_next):
    if request.method in ("POST", "PUT", "DELETE", "PATCH"):
        origin = request.headers.get("origin", "")
        if origin and origin not in ALLOWED_ORIGINS:
            return JSONResponse(status_code=403, content={"detail": "Origin not allowed"})
    return await call_next(request)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], allow_headers=["Authorization", "Content-Type", "X-Cron-Key", "X-Requested-With"], allow_credentials=True, max_age=600)

async def run_async(fn, *args):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, fn, *args)

async def get_user(auth: str = Header(...)) -> str:
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
        r = await run_async(lambda: db.table("profiles").select("*").eq("user_id", uid).single().execute())
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
    def model_post_init(self, __context):
        if self.relationship_dims and not self.dims:
            self.dims = self.relationship_dims
    message: str = Field(..., min_length=1, max_length=2000)
    twin_name: str = Field("توأمك")
    bond_level: float = Field(0.0)
    dims: dict = Field(default_factory=dict)
    relationship_dims: dict = Field(default_factory=dict)
    history: list = Field(default_factory=list)

@app.get("/")
async def root(): return {"status":"ok","version":"6.3.0"}
@app.get("/health")
async def health(): return {"status":"ok","version":"6.3.0"}

@app.post("/api/chat")
@limiter.limit("30/minute")
async def chat(request: Request, body: ChatReq, uid=Depends(get_user), calm: str = Header("false")):
    is_calm = calm.lower() == "true"
    p = await get_profile(uid)
    tier = p.get("tier","free")
    sd = p.get("signup_date") or p.get("created_at", datetime.now(timezone.utc).isoformat())
    ts = p.get("trial_start")
    # نظام الرسائل اليومي
    allowed, remaining, reason = check_message_limit(uid, tier, sd)
    if not allowed:
        raise HTTPException(429, {
            "error": "daily_limit_reached",
            "message": "وصلت لحد رسائلك اليومي 💜",
            "hours_until_reset": get_usage_summary(uid, tier, sd).get("hours_until_reset", 0),
        })
    rem = remaining
    emo_filter = None
    emo = {"needs_support": False}
    try:
        emo = brain.detect_emotion(body.message)
        if emo.get("needs_support"): emo_filter = "sadness"
    except Exception as exc:
        logger.warning(f"emotion detection failed: {exc}")
    mems = []
    try:
        from memory_engine import DeepMemorySystem
        mems = DeepMemorySystem().retrieve(uid, body.message, days=7, lim=5, emotion_filter=emo_filter)
    except ImportError:
        mems = []
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
    try:
        res = await brain.respond_with_knowledge(
            message=body.message, twin_name=body.twin_name, bond_level=body.bond_level,
            dims=body.dims, memories=mems, history=body.history[-10:],
            uid=uid, calm=is_calm, personality=personality_data
        )
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
    voice = tts_params(res.get("emotion",{}).get("primary","neutral"), is_calm)
    # تطبيق سقف الـ Bond
    capped_bond = apply_bond_ceiling(res["new_bond"], tier, sd)
    resp = {"reply": res["reply"], "new_bond": capped_bond, "emotion": res["emotion"], "energy": energy, "tts": voice, "tokens_left": rem, "provider": res.get("provider","gemini_flash")}
    if "dream_data" in res: resp["dream"] = res["dream_data"]
    if "coaching_data" in res: resp["coaching"] = res["coaching_data"]
    if sug: resp["suggestion"] = sug
    return resp

@app.delete("/api/account")
async def del_acc(uid=Depends(get_user)):
    await run_async(lambda: db.table("profiles").delete().eq("user_id", uid).execute())
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
    await run_async(lambda: db.table("reminders").insert({"user_id": uid, "title": body.title, "description": body.description, "remind_at": body.remind_at}).execute())
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

@app.get("/api/services/weather")
async def weather_endpoint(city: str = "Cairo", lat: Optional[float] = None, lon: Optional[float] = None):
    from external_services import get_weather
    result = get_weather(city, lat, lon)
    return {"result": result} if result else {"error": "unavailable"}

@app.get("/api/services/news")
async def news_endpoint(query: str = "world", lang: str = "ar"):
    from external_services import get_news
    result = get_news(query, lang)
    return {"result": result} if result else {"error": "unavailable"}

@app.get("/api/services/maps")
async def maps_endpoint(query: str):
    from external_services import get_location_info
    return {"result": get_location_info(query)}

@app.get("/api/services/knowledge")
async def knowledge_endpoint(query: str):
    from external_services import get_knowledge
    result = get_knowledge(query)
    return {"result": result} if result else {"error": "unavailable"}

class ReferralCodeReq(BaseModel):
    code: str = Field(..., min_length=2, max_length=20)

@app.post("/api/referral/generate")
async def generate_referral(uid=Depends(get_user)):
    from referral import generate_referral_code
    code = generate_referral_code(uid)
    await run_async(lambda: db.table("profiles").update({"referral_code": code}).eq("user_id", uid).execute())
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
