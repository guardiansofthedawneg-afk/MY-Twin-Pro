# 🧬 MyTwin API Documentation v8.0

## الأساسيات
- **Base URL:** `https://my-twin-pro-production-b744.up.railway.app`
- **التوثيق التفاعلي:** `/docs` (Swagger UI)
- **الإصدار:** 8.0.0

## المصادقة
جميع نقاط النهاية (ما عدا `/health`) تتطلب:
```

Authorization: Bearer <JWT_TOKEN>

```

---

## 💬 المحادثة

### إرسال رسالة
```http
POST /api/chat
Content-Type: application/json
Authorization: Bearer <TOKEN>

{
  "message": "مرحباً، كيف حالك؟",
  "twin_name": "توأمي",
  "bond_level": 50,
  "dims": {},
  "history": []
}
```

الرد المتوقع

```json
{
  "reply": "أهلاً! أنا بخير...",
  "new_bond": 50.2,
  "emotion": {"primary": "joy", "intensity": 0.8},
  "energy": 0.7,
  "tts": {"pitch": 1.12, "rate": 0.90},
  "tokens_left": 450,
  "provider": "hybrid_general",
  "latency_breakdown": {
    "emotion_detection": 12.5,
    "brain_response": 245.3
  }
}
```

---

🎵 Spotify

```http
GET /api/services/spotify?query=أغاني_حزينة
Authorization: Bearer <TOKEN>
```

---

📺 YouTube

```http
GET /api/services/youtube?query=تمارين_استرخاء&lang=ar
Authorization: Bearer <TOKEN>
```

---

🌤️ الطقس

```http
GET /api/services/weather?city=Cairo
Authorization: Bearer <TOKEN>
```

---

📅 Todoist

```http
GET /api/services/todoist?token=TODOIST_API_TOKEN
Authorization: Bearer <TOKEN>
```

---

📅 Google Calendar

```http
GET /api/services/calendar?token=GOOGLE_CALENDAR_TOKEN
Authorization: Bearer <TOKEN>
```

---

🎁 الإحالة

إنشاء كود إحالة

```http
POST /api/referral/generate
Authorization: Bearer <TOKEN>
```

تفعيل كود إحالة

```http
POST /api/referral/activate
Authorization: Bearer <TOKEN>
Content-Type: application/json

{"code": "MT-A3F2X1"}
```

---

🏠 المنزل الذكي

```http
GET /api/smart-home/status?entity_id=light.living_room
POST /api/smart-home/control?service=light&entity_id=light.living_room
Authorization: Bearer <TOKEN>
```

---

📡 تيليجرام Webhook

```http
POST /api/telegram/webhook
Content-Type: application/json

{
  "message": {"chat": {"id": 123456}, "text": "/start"}
}
```

---

⚡ أكواد الحالة

الكود المعنى
200 نجاح
401 غير مصرح
429 تجاوز الحد المسموح
500 خطأ داخلي

---

📊 حدود التوكن حسب الباقة

الباقة التوكن اليومي
Free 500
Plus 1,500
Premium 4,000
Pro 7,000
Yearly 15,000

---

© 2026 Soul Sync Ltd.
