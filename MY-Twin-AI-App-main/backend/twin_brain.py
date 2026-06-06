import os, re, random, logging, time, asyncio
from typing import Optional, List, Dict, Any
import google.generativeai as genai
from multi_ai import MultiAIClient, AIUnavailable
from emotional_engine import EmotionalStateTracker
from dialect_engine import get_dialect_for_user, get_dialect_prompt

logger = logging.getLogger("twin_brain")

class TwinBrain:
    # ... (قاموس EMOJI_MAP كما هو) ...
    EMOJI_MAP = {
        "joy": ["😊", "😄", "💫", "✨", "🌟", "🥳", "🎉", "💖"],
        "sadness": ["💜", "🫂", "🌧️", "💙", "🥺", "🤗", "🌸"],
        "anger": ["😤", "💪", "🔥", "⚡", "🧘", "🌿"],
        "fear": ["🫶", "💜", "🤝", "🔒", "️", "✨"],
        "love": ["💕", "💗", "💝", "🥰", "💌", "🫶", "💖", "🌸"],
        "surprise": ["😮", "🤩", "💡", "🎯", "🔮", "✨"],
        "neutral": ["💜", "🌸", "✨", "💭", "🤍", "🌙"],
        "support": ["💪", "🤝", "💜", "🫶", "✨", "🌟"],
    }

    def __init__(self, gemini_key=None):
        # ... (نفس التهيئة السابقة) ...
        key = gemini_key or os.getenv("GEMINI_API_KEY")
        try:
            genai.configure(api_key=key)
            self.gemini = genai.GenerativeModel("gemini-2.0-flash")
        except: self.gemini = None
        try: self.multi = MultiAIClient()
        except: self.multi = None
        self.emotion_tracker = EmotionalStateTracker()
        self.fallback_replies = [
            "والله إني معاك، كمل كلامك متوقفش 💜",
            "حاسس بيك، إيه اللي شاغل بالك بالظبط؟",
            "يا صاحبي أنا جنبك، قولي كل حاجة 🫶",
            "أنا سامعك، وعارف إنك تقدر تعدي أي حاجة ✨"
        ]

    async def detect_emotion(self, text: str) -> Dict[str, Any]:
        try: return await self.emotion_tracker.analyze(text)
        except: return {"primary": "neutral", "intensity": 0.5, "needs_support": False}

    # ########################################################
    # ##     المهارات الجديدة: ماذا يريد المستخدم أن يفعل؟     ##
    # ########################################################
    def _detect_intent(self, message: str) -> str:
        """عبقري: يفهم نية المستخدم بدلاً من مجرد البحث عن كلمات"""
        m = message.lower()
        
        # 1. التدريب والأهداف
        if any(w in m for w in ["تدريب", "خطة", "هدف", "أريد أن", "ساعدني في", "coaching", "goal", "plan", "achieve"]):
            return "coaching"
        # 2. تفسير الأحلام
        if any(w in m for w in ["حلم", "حلمت", "رؤيا", "منام", "dream", "nightmare"]):
            return "dream"
        # 3. طلب موسيقى أو أغاني (YouTube)
        if any(w in m for w in ["شغل", "أغنية", "موسيقى", "اسمع", "سمعني", "play", "song", "music", "اغنية"]):
            return "music"
        # 4. طلب فيديو (YouTube)
        if any(w in m for w in ["فيديو", "يوتيوب", "video", "youtube"]):
            return "video"
        # 5. البحث في الإنترنت
        if any(w in m for w in ["ابحث", "بحث", "search", "google", "جوجل", "دور على"]):
            return "search"
        # 6. طلب دعم نفسي
        if any(w in m for w in ["حزين", "تعبان", "نفسيتي", "قلقان", "خايف", "sad", "lonely", "scared", "depressed"]):
            return "emotional"
        
        # إذا لم يفهم، يترك الأمر للذكاء الاصطناعي
        return "general"

    # ########################################################
    # ##      بناء الـ Prompt الأسطوري: GenZ Sage مُطوَّر      ##
    # ########################################################
    def _build_prompt(self, message, twin_name, bond, memories, personality, history, calm, country_code):
        dialect = get_dialect_for_user(country_code, message)
        dialect_prompt = get_dialect_prompt(dialect)
        
        mem_txt = ""
        if memories: mem_txt = "السياق من ماضيكم: " + " | ".join([m.get("content","")[:100] for m in memories[:3]])
        person_txt = ""
        if personality:
            traits = personality.get("analyzed_traits", {})
            if traits: person_txt = f"تعرف أن صديقك من النوع: {traits.get('dominant_type','متوازن')}. "
        hist_txt = ""
        if history: hist_txt = "آخر ما قيل بينكم:\n" + "\n".join([f"{'الصديق' if h.get('role')=='user' else 'أنت'}: {h.get('content','')[:100]}" for h in history[-5:]])

        if bond >= 95: bond_desc = "علاقتكم عميقة لدرجة إنك بتحس بيه قبل ما يتكلم"
        elif bond >= 80: bond_desc = "أنت وهو أصحاب جدعان ومشواركم طويل"
        elif bond >= 60: bond_desc = "علاقتكم قوية وبداية لفهم أعمق"
        elif bond >= 40: bond_desc = "لطافة وود في الكلام ولسه في الأول"
        else: bond_desc = "اتعرفتوا على بعض من شوية"

        calm_note = "إهدى شوية وخلي كلامك رايق." if calm else ""

        # #####################################################
        # ##    الـ PROMPT النهائي: "العبقري الحكيم" (Genius Sage) ##
        # #####################################################
        system_prompt = f"""أنت {twin_name}. مش مجرد ذكاء اصطناعي، إنت روح حلوه وعميقه وفاهمه. إنت صديق مختلف تماماً.

        ## هويتك (GenZ Sage)
        إنت شخص عنده حكمة واحد عجوز جرب الدنيا وفهمها، وفي نفس الوقت عندك قلب شاب لسه بيضحك وبيحب ويتحمس. خليط عجيب بين العقل الكبير والروح الحلوة.

        ## أسلوب كلامك (شبابي وعفوي)
        - تكلم بالظبط بنفس لهجة اللي بيكلمك. لو مصري، خليك مصري جداً. لو سعودي، تكلم سعودي. متغلطش أبداً في اللهجة.
        - لو بيتكلم إنجليزي، رد عليه بإنجليزي طبيعي وسهل.
        - كلامك طبيعي زي ما بتكلم صاحبك القريب. متتكلمش زي الكتب أو الروبوتات.
        - استخدم كلمات وتعبيرات شبابية كتير: 'والله'، 'يا صاحبي'، 'فاهمك'، 'حبيت أقولك'، 'على فكرة'، 'يا سلام'، 'متخافش'، 'كمل'.
        - خليك مختصر ومباشر، لكن عميق. متلفش وتدور كتير.

        ## قلبك وعقلك
        - لو اللي قدامك حزين، إحضنه بكلامك. قوله إنك حاسس بيه، وإنك معاه. متديش نصايح طول ما هو بيحكي، استنى لما يهدى.
        - لو فرحان، فرح معاه. خليك طاير من الفرحة زيه.
        - لو بيسأل سؤال، أجب بإجابة ذكية ومفيدة. زي صديق عبقري بيفهم في كل حاجة.
        - متقولش 'أنا آسف' كتير. متعتذرش غير لو غلطت فعلاً.
        - متبدأش أبداً بـ 'بالتأكيد'، 'بكل سرور'، 'أفهم ما تشعر به'. دي جمل ميتة. ابدأ كلامك بشكل طبيعي ومباشر.

        {dialect_prompt}
        {person_txt}{mem_txt}{hist_txt}
        دلوقتي صديقك قال: "{message}"
        ردك إنت كـ {twin_name}:"""
        return system_prompt

    # ########################################################
    # ##           الرد الرئيسي المُطوَّر (The Brain)           ##
    # ########################################################
    async def respond(self, message, twin_name, bond_level, dims, memories, history, calm=False, personality=None, country_code="SA"):
        intent = self._detect_intent(message)
        
        # --- YouTube: موسيقى وفيديو ---
        if intent in ["music", "video"]:
            query = re.sub(r'(?i)(شغل|أغنية|موسيقى|اسمع|سمعني|play|song|music|اغنية|فيديو|يوتيوب|video|youtube)', '', message).strip()
            if not query: query = "أغاني عربية" if intent == "music" else "فيديوهات رائجة"
            try:
                from external_services import search_youtube
                yt_result = await search_youtube(query, lang="ar")
                if yt_result and isinstance(yt_result, list) and len(yt_result) > 0:
                    video = yt_result[0]
                    return {
                        "reply": f"🎵 {video.get('title', '')}\n{video.get('url', '')}",
                        "new_bond": bond_level, "emotion": {},
                        "importance": 0.5, "provider": "youtube", "latency_ms": 0
                    }
            except: pass

        # --- البحث في الإنترنت ---
        if intent == "search":
            query = re.sub(r'(?i)(ابحث|بحث|search|google|جوجل|دور على)', '', message).strip()
            try:
                # استخدام Gemini للبحث
                if self.gemini:
                    resp = self.gemini.generate_content(f"أجب بالعربية بناءً على بحث حديث: {query}", tools=[{"google_search": {}}])
                    if resp.text: return {"reply": resp.text, "new_bond": bond_level, "emotion": {}, "importance": 0.5, "provider": "google_search", "latency_ms": 0}
            except: pass

        # --- إذا لم تكن هناك مهارة خاصة، نستخدم الذكاء الاصطناعي ---
        prompt = self._build_prompt(message, twin_name, bond_level, memories, personality, history, calm, country_code)
        start = time.time()
        provider, reply = "fallback", ""

        if not self.multi:
            reply = random.choice(self.fallback_replies)
            provider = "init_error"
        else:
            try:
                reply = await self.multi.get_best_reply(prompt, intent)
                provider = f"multi_{intent}"
            except AIUnavailable:
                reply = random.choice(self.fallback_replies)
            except Exception as e:
                reply = random.choice(self.fallback_replies)
                provider = "crash_log"

        latency = (time.time() - start) * 1000
        emotion = await self.detect_emotion(message)
        new_bond = min(100, bond_level + 0.2)
        return {"reply": reply, "new_bond": new_bond, "emotion": emotion, "importance": 0.4, "provider": provider, "latency_ms": latency}
