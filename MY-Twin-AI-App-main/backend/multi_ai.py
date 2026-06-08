"""
MyTwin – Multi AI Client v6.0 (Smart Distribution)
- الأولوية: OpenRouter (مجاني) → Groq (عند الحاجة) → Gemini (احتياطي محلي)
- يقلل الضغط على Groq ويوزع الأحمال بذكاء
"""
import os, logging, asyncio
from typing import Optional
import google.generativeai as genai
from openai import OpenAI

logger = logging.getLogger("multi_ai")

class AIUnavailable(Exception):
    """يُرفع عندما تكون جميع نماذج AI غير متاحة"""
    pass

class MultiAIClient:
    def __init__(self):
        # ── Gemini (الاحتياطي الأخير – محلي) ──────────────────
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            try:
                genai.configure(api_key=gemini_key)
                self.gemini_flash = genai.GenerativeModel(
                    "gemini-2.0-flash",
                    generation_config=genai.types.GenerationConfig(temperature=0.7, max_output_tokens=150)
                )
            except Exception as e:
                logger.error(f"Gemini init failed: {e}")
                self.gemini_flash = None
        else:
            self.gemini_flash = None

        # ── Groq (سريع ولكن احتياطي الآن) ─────────────────
        groq_key = os.getenv("GROQ_API_KEY")
        self.groq_client = OpenAI(base_url="https://api.groq.com/openai/v1", api_key=groq_key) if groq_key else None

        # ── OpenRouter (المزود الرئيسي) ──────────────────
        or_key = os.getenv("OPENROUTER_API_KEY")
        self.or_client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=or_key) if or_key else None

    # ── helpers ────────────────────────────────────────────
    def _groq(self, model: str, prompt: str) -> Optional[str]:
        if not self.groq_client:
            return None
        try:
            resp = self.groq_client.chat.completions.create(
                model=model,
                messages=[{"role":"user","content":prompt}],
                temperature=0.7,
                max_tokens=150
            )
            return resp.choices[0].message.content
        except Exception as e:
            logger.warning(f"Groq [{model}]: {e}")
            return None

    def _or(self, model: str, prompt: str) -> Optional[str]:
        if not self.or_client:
            return None
        try:
            resp = self.or_client.chat.completions.create(
                model=model,
                messages=[{"role":"user","content":prompt}],
                temperature=0.7,
                max_tokens=150,
                extra_body={"provider": {"order": ["openai", "google", "meta", "deepseek", "microsoft"]}}
            )
            return resp.choices[0].message.content
        except Exception as e:
            logger.warning(f"OpenRouter [{model}]: {e}")
            return None

    # ── نماذج Groq (تُستخدم عند تعذر OpenRouter) ──────
    def groq_chat(self, p: str) -> Optional[str]:
        return self._groq("llama-3.3-70b-versatile", p)

    # ── نماذج OpenRouter المجانية (الأولوية الأولى) ──
    def deepseek_chat(self, p: str) -> Optional[str]:
        return self._or("deepseek/deepseek-v4-flash:free", p)

    def llama4_chat(self, p: str) -> Optional[str]:
        return self._or("meta-llama/llama-4-maverick:free", p)

    def minimax_chat(self, p: str) -> Optional[str]:
        return self._or("minimax/minimax-m2.5:free", p)

    def qwen_chat(self, p: str) -> Optional[str]:
        return self._or("qwen/qwen2.5-72b-instruct:free", p)

    def gemini25_free_chat(self, p: str) -> Optional[str]:
        return self._or("google/gemini-2.5-flash:free", p)

    def phi3_chat(self, p: str) -> Optional[str]:
        """Microsoft Phi-3 Mini – خفيف وسريع"""
        return self._or("microsoft/phi-3-mini-128k-instruct:free", p)

    # ── Gemini المحلي (الاحتياطي النهائي) ──────────────
    def gemini_chat(self, p: str) -> str:
        if not self.gemini_flash:
            return "أنا هنا معاك 💜"
        try:
            resp = self.gemini_flash.generate_content(p)
            return resp.text.strip() if resp.text else "أنا هنا معاك 💜"
        except Exception as e:
            logger.error(f"Gemini error: {e}")
            return "أنا هنا معاك 💜"

    # ── توجيه المهام (التوزيع الجديد الذكي) ─────────────
    async def get_best_reply(self, prompt: str, task: str = "general") -> str:
        chains = {
            "general":        [self.gemini25_free_chat, self.llama4_chat, self.groq_chat, self.gemini_chat],
            "emotional":      [self.llama4_chat, self.gemini25_free_chat, self.groq_chat, self.gemini_chat],
            "coding":         [self.deepseek_chat, self.phi3_chat, self.minimax_chat, self.groq_chat, self.gemini_chat],
            "deep_reasoning": [self.deepseek_chat, self.qwen_chat, self.groq_chat, self.gemini_chat],
            "multilingual":   [self.llama4_chat, self.qwen_chat, self.groq_chat, self.gemini_chat],
            "planning":       [self.qwen_chat, self.llama4_chat, self.gemini_chat],
            "coaching":       [self.llama4_chat, self.groq_chat, self.gemini_chat],
            "dream":          [self.llama4_chat, self.groq_chat, self.gemini_chat],
            "music":          [self.llama4_chat, self.groq_chat, self.gemini_chat],
            "video":          [self.llama4_chat, self.groq_chat, self.gemini_chat],
            "search":         [self.deepseek_chat, self.phi3_chat, self.groq_chat, self.gemini_chat],
            "agent":          [self.qwen_chat, self.phi3_chat, self.llama4_chat, self.gemini_chat],
        }
        selected = chains.get(task, chains["general"])
        loop = asyncio.get_running_loop()
        for fn in selected:
            try:
                result = await loop.run_in_executor(None, fn, prompt)
                if result and len(result.strip()) >= 1:
                    logger.info(f"✅ [{task}] → {fn.__name__}")
                    return result.strip()
            except Exception:
                continue
        return "أنا هنا معاك 💜"

    # ── نسخة sync (للتوافق) ───────────────────────────
    def get_best_reply_sync(self, prompt: str, task: str = "general") -> str:
        chains = {
            "general":        [self.gemini25_free_chat, self.llama4_chat, self.groq_chat, self.gemini_chat],
            "emotional":      [self.llama4_chat, self.gemini25_free_chat, self.groq_chat, self.gemini_chat],
            "coding":         [self.deepseek_chat, self.phi3_chat, self.minimax_chat, self.groq_chat, self.gemini_chat],
            "deep_reasoning": [self.deepseek_chat, self.qwen_chat, self.groq_chat, self.gemini_chat],
            "multilingual":   [self.llama4_chat, self.qwen_chat, self.groq_chat, self.gemini_chat],
            "planning":       [self.qwen_chat, self.llama4_chat, self.gemini_chat],
            "coaching":       [self.llama4_chat, self.groq_chat, self.gemini_chat],
            "dream":          [self.llama4_chat, self.groq_chat, self.gemini_chat],
            "music":          [self.llama4_chat, self.groq_chat, self.gemini_chat],
            "video":          [self.llama4_chat, self.groq_chat, self.gemini_chat],
            "search":         [self.deepseek_chat, self.phi3_chat, self.groq_chat, self.gemini_chat],
            "agent":          [self.qwen_chat, self.phi3_chat, self.llama4_chat, self.gemini_chat],
        }
        for fn in chains.get(task, chains["general"]):
            try:
                result = fn(prompt)
                if result and len(result.strip()) >= 1:
                    return result.strip()
            except Exception:
                continue
        return "أنا هنا معاك 💜"
