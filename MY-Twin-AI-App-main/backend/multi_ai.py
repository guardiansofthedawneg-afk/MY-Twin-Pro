class AIUnavailable(Exception):
    """يُرفع عندما تكون جميع نماذج AI غير متاحة"""
    pass

"""
MyTwin - Multi AI Client v4.0
توزيع ذكي للمهام: كل نموذج ≤ 3 مهام، Gemini احتياطي نهائي فقط
"""
import os, logging, asyncio
from typing import Optional
import google.generativeai as genai
from openai import OpenAI

logger = logging.getLogger("multi_ai")

class MultiAIClient:
    def __init__(self):
        # ── Gemini (احتياطي نهائي فقط) ──────────────────
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            try:
                genai.configure(api_key=gemini_key)
                self.gemini_flash = genai.GenerativeModel(
                    "gemini-2.0-flash",
                    generation_config=genai.types.GenerationConfig(temperature=0.7, max_output_tokens=300)
                )
            except Exception as e:
                logger.error(f"Gemini init failed: {e}")
                self.gemini_flash = None
        else:
            self.gemini_flash = None

        # ── Groq (مجاني وسريع) ─────────────────────────
        groq_key = os.getenv("GROQ_API_KEY")
        self.groq_client = OpenAI(base_url="https://api.groq.com/openai/v1", api_key=groq_key) if groq_key else None

        # ── OpenRouter (6 نماذج مجانية) ────────────────
        or_key = os.getenv("OPENROUTER_API_KEY")
        self.or_client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=or_key) if or_key else None

    # ── Gemini (احتياطي) ───────────────────────────────
    def gemini_chat(self, prompt: str) -> str:
        if not self.gemini_flash:
            return "أنا هنا معاك 💜"
        try:
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(self.gemini_flash.generate_content, prompt)
                resp = future.result(timeout=15)
            return resp.text.strip() if resp.text else "أنا هنا معاك 💜"
        except Exception as e:
            logger.error(f"Gemini error: {e}")
            return "أنا هنا معاك 💜"

    # ── helpers ────────────────────────────────────────
    def _groq(self, model: str, prompt: str) -> Optional[str]:
        if not self.groq_client: return None
        try:
            resp = self.groq_client.chat.completions.create(model=model, messages=[{"role":"user","content":prompt}], temperature=0.7, max_tokens=300, timeout=15)
            return resp.choices[0].message.content
        except Exception as e:
            logger.warning(f"Groq [{model}]: {e}")
            return None

    def _or(self, model: str, prompt: str) -> Optional[str]:
        if not self.or_client: return None
        try:
            resp = self.or_client.chat.completions.create(model=model, messages=[{"role":"user","content":prompt}], temperature=0.7, max_tokens=300, timeout=15)
            return resp.choices[0].message.content
        except Exception as e:
            logger.warning(f"OpenRouter [{model}]: {e}")
            return None

    # ── النماذج ────────────────────────────────────────
    def groq_chat(self, p: str) -> Optional[str]:
        return self._groq("llama-3.3-70b-versatile", p)
    def llama4_chat(self, p: str) -> Optional[str]:
        return self._or("meta-llama/llama-4-maverick:free", p)
    def minimax_chat(self, p: str) -> Optional[str]:
        return self._or("minimax/minimax-m2.5:free", p)
    def deepseek_chat(self, p: str) -> Optional[str]:
        return self._or("deepseek/deepseek-v4-flash:free", p)
    def gemma4_chat(self, p: str) -> Optional[str]:
        return self._or("google/gemma-3-27b-it:free", p)
    def gptoss_chat(self, p: str) -> Optional[str]:
        return self._or("openai/gpt-4o-mini:free", p)
    def qwen_chat(self, p: str) -> Optional[str]:
        return self._or("qwen/qwen2.5-72b-instruct:free", p)

    # ── توجيه المهام (الإصدار 4.0 – توزيع متوازن) ─────
    async def get_best_reply(self, prompt: str, task: str = "general") -> str:
        """
        توزيع المهام:
        - general: Groq → Llama4 → DeepSeek
        - emotional: Groq → Llama4
        - coding: DeepSeek → MiniMax
        - deep_reasoning: DeepSeek → Qwen → GPT-OSS
        - multilingual: Gemma4 → MiniMax
        - planning: Qwen → Llama4
        - coaching/dream/music/video: Groq (سريع ومجاني)
        - search: DeepSeek → Groq
        - agent: Qwen → Llama4
        """
        chains = {
            "general":        [self.groq_chat, self.llama4_chat, self.deepseek_chat],
            "emotional":      [self.groq_chat, self.llama4_chat],
            "coding":         [self.deepseek_chat, self.minimax_chat],
            "deep_reasoning": [self.deepseek_chat, self.qwen_chat, self.gptoss_chat],
            "multilingual":   [self.gemma4_chat, self.minimax_chat],
            "planning":       [self.qwen_chat, self.llama4_chat],
            "coaching":       [self.groq_chat, self.llama4_chat],
            "dream":          [self.groq_chat, self.llama4_chat],
            "music":          [self.groq_chat],
            "video":          [self.groq_chat],
            "search":         [self.deepseek_chat, self.groq_chat],
            "agent":          [self.qwen_chat, self.llama4_chat],
        }
        selected = chains.get(task, chains["general"])
        loop = asyncio.get_running_loop()
        last_error = ""
        for fn in selected:
            try:
                result = await loop.run_in_executor(None, fn, prompt)
                if result and len(result.strip()) >= 1:
                    logger.info(f"✅ [{task}] → {fn.__name__}")
                    return result.strip()
            except Exception as e:
                logger.warning(f"⚠️ {fn.__name__}: {e}")
                last_error = str(e)
                continue
        logger.warning(f"⚠️ All models failed for [{task}]. Last error: {last_error}")
        return self.gemini_chat(prompt)

    # ── نسخة sync ──────────────────────────────────────
    def get_best_reply_sync(self, prompt: str, task: str = "general") -> str:
        chains = {
            "general":        [self.groq_chat, self.llama4_chat, self.deepseek_chat],
            "emotional":      [self.groq_chat, self.llama4_chat],
            "coding":         [self.deepseek_chat, self.minimax_chat],
            "deep_reasoning": [self.deepseek_chat, self.qwen_chat, self.gptoss_chat],
            "multilingual":   [self.gemma4_chat, self.minimax_chat],
            "planning":       [self.qwen_chat, self.llama4_chat],
            "coaching":       [self.groq_chat, self.llama4_chat],
            "dream":          [self.groq_chat, self.llama4_chat],
            "music":          [self.groq_chat],
            "video":          [self.groq_chat],
            "search":         [self.deepseek_chat, self.groq_chat],
            "agent":          [self.qwen_chat, self.llama4_chat],
        }
        for fn in chains.get(task, chains["general"]):
            try:
                result = fn(prompt)
                if result and len(result.strip()) >= 1:
                    logger.info(f"✅ sync [{task}] → {fn.__name__}")
                    return result.strip()
            except Exception as e:
                logger.warning(f"⚠️ {fn.__name__}: {e}")
                continue
        return self.gemini_chat(prompt)

    # ── توجيه حسب الباقة ───────────────────────────────
    async def get_reply_for_tier(self, prompt: str, task: str, tier: str) -> str:
        try:
            from message_limits import get_tier_models
            allowed = get_tier_models(tier)
        except ImportError:
            allowed = ["groq", "gemma4", "gemini"]
        model_map = {
            "groq": self.groq_chat, "llama4": self.llama4_chat, "minimax": self.minimax_chat,
            "deepseek": self.deepseek_chat, "gemma4": self.gemma4_chat,
            "gptoss": self.gptoss_chat, "qwen": self.qwen_chat, "gemini": self.gemini_chat,
        }
        all_chains = {
            "general": ["groq", "llama4", "deepseek"],
            "emotional": ["groq", "llama4"],
            "coding": ["deepseek", "minimax"],
            "deep_reasoning": ["deepseek", "qwen", "gptoss"],
            "multilingual": ["gemma4", "minimax"],
            "planning": ["qwen", "llama4"],
        }
        chain = all_chains.get(task, all_chains["general"])
        filtered = [m for m in chain if m in allowed] or ["groq", "gemini"]
        loop = asyncio.get_running_loop()
        for model_name in filtered:
            fn = model_map.get(model_name)
            if not fn: continue
            try:
                result = await loop.run_in_executor(None, fn, prompt)
                if result and len(result.strip()) >= 1:
                    logger.info(f"✅ tier[{tier}] [{task}] → {model_name}")
                    return result.strip()
            except Exception as e:
                logger.warning(f"⚠️ {model_name}: {e}")
        return self.gemini_chat(prompt)
