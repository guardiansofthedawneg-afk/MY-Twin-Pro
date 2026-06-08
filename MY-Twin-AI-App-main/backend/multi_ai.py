"""
MyTwin – Multi AI Client v4.0 (Optimized Distribution)
- Gemini used only as 3rd fallback
- Each task has 2 primary models + Gemini as last resort
- Saves API quota and improves speed
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
        # ── Gemini (الاحتياطي الثالث فقط) ──────────────────
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

        # ── Groq (سريع ومجاني) ─────────────────────────────
        groq_key = os.getenv("GROQ_API_KEY")
        self.groq_client = OpenAI(base_url="https://api.groq.com/openai/v1", api_key=groq_key) if groq_key else None

        # ── OpenRouter (نماذج رئيسية) ──────────────────────
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
                max_tokens=150
            )
            return resp.choices[0].message.content
        except Exception as e:
            logger.warning(f"OpenRouter [{model}]: {e}")
            return None

    # ── النماذج الرئيسية (الأولوية الأولى) ────────────────
    def groq_chat(self, p: str) -> Optional[str]:
        return self._groq("llama-3.3-70b-versatile", p)

    def deepseek_chat(self, p: str) -> Optional[str]:
        return self._or("deepseek/deepseek-v4-flash:free", p)

    def llama4_chat(self, p: str) -> Optional[str]:
        return self._or("meta-llama/llama-4-maverick:free", p)

    def minimax_chat(self, p: str) -> Optional[str]:
        return self._or("minimax/minimax-m2.5:free", p)

    def qwen_chat(self, p: str) -> Optional[str]:
        return self._or("qwen/qwen2.5-72b-instruct:free", p)

    # ── Gemini (الاحتياطي الثالث) ─────────────────────────
    def gemini_chat(self, p: str) -> str:
        if not self.gemini_flash:
            return "أنا هنا معاك 💜"
        try:
            resp = self.gemini_flash.generate_content(p)
            return resp.text.strip() if resp.text else "أنا هنا معاك 💜"
        except Exception as e:
            logger.error(f"Gemini error: {e}")
            return "أنا هنا معاك 💜"

    # ── توجيه المهام (التوزيع الجديد) ────────────────────────
    async def get_best_reply(self, prompt: str, task: str = "general") -> str:
        chains = {
            "general":        [self.groq_chat, self.llama4_chat, self.gemini_chat],
            "emotional":      [self.groq_chat, self.llama4_chat, self.gemini_chat],
            "coding":         [self.deepseek_chat, self.minimax_chat, self.gemini_chat],
            "deep_reasoning": [self.deepseek_chat, self.qwen_chat, self.gemini_chat],
            "multilingual":   [self.llama4_chat, self.gemini_chat],
            "planning":       [self.qwen_chat, self.llama4_chat, self.gemini_chat],
            "coaching":       [self.groq_chat, self.llama4_chat, self.gemini_chat],
            "dream":          [self.groq_chat, self.llama4_chat, self.gemini_chat],
            "music":          [self.groq_chat, self.gemini_chat],
            "video":          [self.groq_chat, self.gemini_chat],
            "search":         [self.deepseek_chat, self.groq_chat, self.gemini_chat],
            "agent":          [self.qwen_chat, self.llama4_chat, self.gemini_chat],
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

    # ── نسخة sync ──────────────────────────────────────────
    def get_best_reply_sync(self, prompt: str, task: str = "general") -> str:
        chains = {
            "general":        [self.groq_chat, self.llama4_chat, self.gemini_chat],
            "emotional":      [self.groq_chat, self.llama4_chat, self.gemini_chat],
            "coding":         [self.deepseek_chat, self.minimax_chat, self.gemini_chat],
            "deep_reasoning": [self.deepseek_chat, self.qwen_chat, self.gemini_chat],
            "multilingual":   [self.llama4_chat, self.gemini_chat],
            "planning":       [self.qwen_chat, self.llama4_chat, self.gemini_chat],
            "coaching":       [self.groq_chat, self.llama4_chat, self.gemini_chat],
            "dream":          [self.groq_chat, self.llama4_chat, self.gemini_chat],
            "music":          [self.groq_chat, self.gemini_chat],
            "video":          [self.groq_chat, self.gemini_chat],
            "search":         [self.deepseek_chat, self.groq_chat, self.gemini_chat],
            "agent":          [self.qwen_chat, self.llama4_chat, self.gemini_chat],
        }
        for fn in chains.get(task, chains["general"]):
            try:
                result = fn(prompt)
                if result and len(result.strip()) >= 1:
                    return result.strip()
            except Exception:
                continue
        return "أنا هنا معاك 💜"
