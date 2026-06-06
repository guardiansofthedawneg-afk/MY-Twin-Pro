# 🧬 MyTwin — رفيقك الرقمي الذكي

[![Expo](https://img.shields.io/badge/Expo-51-blue.svg)](https://expo.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-green.svg)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.11-yellow.svg)](https://python.org)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

**MyTwin** هو أول رفيق ذكي عربي يحاكي الوعي البشري، يبني علاقة عاطفية حقيقية مع المستخدم عبر 6 مراحل (من "غريب" إلى "توأم روح").

---

## ✨ **لماذا MyTwin مختلف؟**

| الميزة | MyTwin | المنافسون |
|--------|--------|-----------|
| 🗣️ **دعم اللهجات العامية** | ✅ 19 لهجة عربية | ❌ الفصحى فقط |
| 🧠 **8 نماذج ذكاء اصطناعي** | ✅ Gemini + Groq + OpenRouter | ❌ نموذج واحد |
| 😊 **تحليل عاطفي متقدم** | ✅ الوقت + الطقس + المشاعر | ❌ أساسي |
| 🎙️ **صوت بشري محسن** | ✅ Edge TTS + ElevenLabs | ⚠️ روبوتي |
| 🔗 **تكاملات خارجية** | ✅ YouTube + Spotify + الطقس | ❌ لا يوجد |
| 🌙 **Dark Mode** | ✅ كامل | ⚠️ جزئي |
| 💰 **نظام إحالة** | ✅ مكافآت توكن | ❌ لا يوجد |

---

## 🏗️ **البنية التقنية**

```

MyTwin/
├── backend/              # الخادم الخلفي (FastAPI)
│   ├── main.py           # نقطة النهاية الرئيسية
│   ├── twin_brain.py     # العقل المدبر للتوأم
│   ├── emotional_engine.py  # محرك المشاعر
│   ├── dialect_engine.py    # محرك اللهجات العامية
│   ├── memory_engine.py     # الذاكرة طويلة المدى
│   ├── voice_engine.py      # الصوت (TTS + STT)
│   └── ...
├── app/                  # الواجهة الأمامية (Expo/React Native)
│   ├── chat.tsx          # شاشة المحادثة
│   ├── profile.tsx       # الملف الشخصي
│   ├── settings.tsx      # الإعدادات
│   └── ...
└── components/           # مكونات قابلة لإعادة الاستخدام
├── SideMenu.tsx
├── Emoji.tsx
└── ...

```

---

## 🚀 **تشغيل المشروع محلياً**

### المتطلبات
- Node.js 18+
- Python 3.11+
- Supabase (للحصول على `SUPABASE_URL` و `SUPABASE_KEY`)

### التثبيت
```bash
git clone https://github.com/mohamed101/MyTwin.git
cd MyTwin
npm install
cd backend
pip install -r requirements.txt
```

التشغيل

```bash
# الواجهة الأمامية
npm start

# الخادم الخلفي
cd backend
uvicorn main:app --reload
```

---

📡 الخدمات الخارجية المدعومة

الخدمة نقطة النهاية الحالة
YouTube /api/services/youtube ✅
Spotify /api/services/spotify ✅
الطقس /api/services/weather ✅
Todoist /api/services/todoist ✅
Google Calendar /api/services/calendar ✅
تيليجرام /api/telegram/webhook ✅

---

🔗 روابط مهمة

· توثيق API
· سياسة الخصوصية

---

© 2026 Soul Sync Ltd. جميع الحقوق محفوظة.
