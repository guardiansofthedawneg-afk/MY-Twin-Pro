"""
MyTwin – Smart Home Controller v2.0 (Async & Multi-Platform)
يدعم: Home Assistant، WLED، ESPHome، MQTT (اختياري)
- جميعها مجانية بدون مفاتيح API للاستخدام المحلي.
- تحقق من حدود الاستخدام اليومي.
- جاهز للتسجيل كأداة في Reasoning Engine.
"""
import os, logging, asyncio
from typing import Dict, Optional, Any
import httpx

logger = logging.getLogger("smart_home")

# ========== الإعدادات ==========
HA_URL = os.getenv("HOME_ASSISTANT_URL", "").rstrip("/")
HA_TOKEN = os.getenv("HOME_ASSISTANT_TOKEN", "")
WLED_BASE_URL = os.getenv("WLED_BASE_URL", "")       # مثال: http://192.168.1.50
ESPHOME_BASE_URL = os.getenv("ESPHOME_BASE_URL", "")  # مثال: http://192.168.1.60
MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))

# ========== مساعد النطق (للأوامر الصوتية) ==========
VOICE_COMMANDS = {
    "شغل النور": ("light.turn_on", "light.living_room"),
    "اطفئ النور": ("light.turn_off", "light.living_room"),
    "غير لون النور إلى": ("set_color", None),  # special handling
}

# ========== حدود الاستخدام ==========
def _get_limits_manager():
    try:
        from message_limits import check_feature_usage
        return check_feature_usage
    except:
        return None

async def _check_smart_home_limit(user_id: str, tier: str) -> bool:
    """التحقق من حد استخدام المنزل الذكي اليومي"""
    check_func = _get_limits_manager()
    if check_func and user_id:
        allowed, remaining = await asyncio.get_event_loop().run_in_executor(
            None, check_func, user_id, tier, "smart_home"
        )
        if not allowed:
            logger.info("Smart home limit reached")
            return False
    return True

# ========== Home Assistant API (غير متزامن) ==========
async def ha_call_service(service: str, entity_id: str, data: Optional[Dict] = None) -> bool:
    """استدعاء خدمة في Home Assistant"""
    if not HA_URL or not HA_TOKEN:
        logger.warning("Home Assistant غير مهيأ")
        return False
    try:
        domain, service_name = service.split(".")
        url = f"{HA_URL}/api/services/{domain}/{service_name}"
        headers = {
            "Authorization": f"Bearer {HA_TOKEN}",
            "Content-Type": "application/json",
        }
        payload = {"entity_id": entity_id}
        if data:
            payload.update(data)
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, headers=headers, timeout=10.0)
            return resp.status_code == 200
    except Exception as e:
        logger.error(f"Home Assistant error: {e}")
        return False

async def ha_get_state(entity_id: str) -> Optional[Dict]:
    """جلب حالة جهاز من Home Assistant"""
    if not HA_URL or not HA_TOKEN:
        return None
    try:
        url = f"{HA_URL}/api/states/{entity_id}"
        headers = {"Authorization": f"Bearer {HA_TOKEN}"}
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, timeout=10.0)
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        logger.error(f"Get state error: {e}")
    return None

# ========== WLED (إضاءة LED ملونة – مجاني) ==========
async def wled_set_color(color: str, brightness: int = 255, effect: Optional[str] = None) -> bool:
    """
    تغيير لون إضاءة WLED.
    color: اسم اللون بالعربية (أحمر، أخضر...) أو RGB.
    """
    if not WLED_BASE_URL:
        logger.warning("WLED غير مهيأ")
        return False

    colors_rgb = {
        "أحمر": [255, 0, 0], "أخضر": [0, 255, 0], "أزرق": [0, 0, 255],
        "بنفسجي": [128, 0, 128], "أصفر": [255, 255, 0], "برتقالي": [255, 165, 0],
        "أبيض": [255, 255, 255], "وردي": [255, 20, 147], "سماوي": [0, 255, 255],
    }
    if color in colors_rgb:
        rgb = colors_rgb[color]
    else:
        # حاول تفسير RGB مباشر
        try:
            rgb = [int(x) for x in color.split(",")]
            if len(rgb) != 3:
                return False
        except:
            return False

    try:
        payload = {"on": True, "bri": brightness, "seg": [{"col": [rgb]}]}
        if effect:
            payload["seg"][0]["fx"] = effect
        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{WLED_BASE_URL}/json/state", json=payload, timeout=5.0)
            return resp.status_code == 200
    except Exception as e:
        logger.error(f"WLED error: {e}")
        return False

async def wled_turn_off() -> bool:
    if not WLED_BASE_URL: return False
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{WLED_BASE_URL}/json/state", json={"on": False}, timeout=5.0)
            return resp.status_code == 200
    except Exception as e:
        logger.error(f"WLED off error: {e}")
        return False

# ========== ESPHome (أجهزة DIY) ==========
async def esphome_control(entity_id: str, action: str = "toggle") -> bool:
    """
    التحكم بجهاز ESPHome عبر REST API.
    entity_id: اسم الكيان كما في ESPHome (مثل switch.relay1)
    action: toggle, turn_on, turn_off
    """
    if not ESPHOME_BASE_URL:
        return False
    try:
        # ESPHome REST API: POST /switch/relay1/toggle
        domain, name = entity_id.split(".")
        url = f"{ESPHOME_BASE_URL}/{domain}/{name}/{action}"
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, timeout=5.0)
            return resp.status_code == 200
    except Exception as e:
        logger.error(f"ESPHome error: {e}")
        return False

# ========== MQTT (اختياري – للمستخدمين المتقدمين) ==========
async def mqtt_publish(topic: str, payload: str) -> bool:
    """إرسال أمر عبر MQTT"""
    try:
        import asyncio_mqtt
        from asyncio_mqtt import Client
        async with Client(MQTT_BROKER, MQTT_PORT) as client:
            await client.publish(topic, payload, qos=1)
            return True
    except ImportError:
        logger.warning("asyncio-mqtt غير مثبت")
        return False
    except Exception as e:
        logger.error(f"MQTT error: {e}")
        return False

# ========== واجهة موحدة للتطبيق ==========
async def process_voice_command(command: str, user_id: Optional[str] = None, tier: str = "free") -> str:
    """
    معالجة أمر صوتي من المستخدم.
    مثال: "شغل النور" → يتم تنفيذ الإجراء المناسب.
    """
    if not await _check_smart_home_limit(user_id, tier):
        return "🚫 لقد استنفدت أوامر المنزل الذكي اليوم."

    # البحث في الأوامر المدعومة
    for phrase, (service, entity) in VOICE_COMMANDS.items():
        if phrase in command:
            if phrase == "غير لون النور إلى":
                # استخراج اللون من النص
                color = command.split("إلى")[-1].strip()
                # محاولة WLED أولاً
                if WLED_BASE_URL:
                    success = await wled_set_color(color)
                    if success:
                        return f"✨ تم تغيير لون الإضاءة إلى {color}"
                # ثم Home Assistant
                if HA_URL:
                    success = await ha_call_service("light.turn_on", entity or "light.living_room", {"color_name": color})
                    if success:
                        return f"✨ تم تغيير لون الإضاءة إلى {color}"
                return "⚠️ لم أتمكن من تغيير اللون. تأكد من توصيل الإضاءة."
            else:
                # تنفيذ الخدمة على Home Assistant أولاً
                if HA_URL:
                    success = await ha_call_service(service, entity)
                elif WLED_BASE_URL and "light" in service:
                    if "turn_on" in service:
                        success = await wled_set_color("أبيض", 255)
                    elif "turn_off" in service:
                        success = await wled_turn_off()
                    else:
                        success = False
                elif ESPHOME_BASE_URL:
                    action = "turn_on" if "turn_on" in service else "turn_off" if "turn_off" in service else "toggle"
                    success = await esphome_control(entity, action)
                else:
                    return "⚠️ لا يوجد نظام منزل ذكي مهيأ. يمكنك ربط Home Assistant أو WLED."
                return "✅ تم تنفيذ الأمر" if success else "❌ فشل تنفيذ الأمر."

    return "🤔 لم أفهم الأمر. جرب: 'شغل النور' أو 'غير لون النور إلى أحمر'."

# ========== دوال التوافق مع القديم ==========
def call_service(service: str, entity_id: str, data: Optional[Dict] = None) -> bool:
    """نسخة تزامنية (للاستخدام القديم)"""
    import asyncio
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(ha_call_service(service, entity_id, data))

def get_device_state(entity_id: str) -> Optional[Dict]:
    """نسخة تزامنية"""
    import asyncio
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(ha_get_state(entity_id))

def set_light_color(entity_id: str, color: str, brightness: int = 255) -> bool:
    """نسخة تزامنية للتحكم في الإضاءة (تدعم HA و WLED)"""
    if WLED_BASE_URL:
        import asyncio
        loop = asyncio.get_event_loop()
        return loop.run_until_complete(wled_set_color(color, brightness))
    return call_service("light.turn_on", entity_id, {"color_name": color, "brightness": brightness})

print("✅ Smart Home Controller v2.0 | WLED/ESPHome/HA | جاهز")
