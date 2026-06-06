class AIUnavailable(Exception):
    """يُرفع عندما تكون جميع نماذج AI غير متاحة"""
    pass

"""
MyTwin - Multi AI Client v3.0
8 نماذج AI مع توجيه ذكي حسب المهمة والباقة
"""
import os, logging, asyncio
from typing import Optional
import google.generativeai as genai
from openai import OpenAI

logger = logging.getLogger("multi_ai")

class MultiAIClient:
    def __init__(self):
        # ── Gemini (دائماً متاح — الاحتياطي النهائي) ──────
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            try:
                genai.configure(api_key=gemini_key)
                self.gemini_flash = genai.GenerativeModel(
                    "gemini-2.0-flash",
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.7,
                        max_output_tokens=300,
                    )
                )
            except Exception as e:
                logger.error(f"Gemini init failed: {e}")
                self.gemini_flash = None
        else:
            self.gemini_flash = None

        # ── Groq (سريع ومجاني) ────────────────────────────
        groq_key = os.getenv("GROQ_API_KEY")
        if groq_key:
            try:
                self.groq_client = OpenAI(
                    base_url="https://api.groq.com/openai/v1",
                    api_key=groq_key,
                )
            except Exception as e:
                logger.error(f"Groq init failed: {e}")
                self.groq_client = None
        else:
            self.groq_client = None

        # ── OpenRouter (6 نماذج مجانية) ───────────────────
        or_key = os.getenv("OPENROUTER_API_KEY")
        if or_key:
            try:
                self.or_client = OpenAI(
                    base_url="https://openrouter.ai/api/v1",
                    api_key=or_key,
                )
            except Exception as e:
                logger.error(f"OpenRouter init failed: {e}")
                self.or_client = None
        else:
            self.or_client = None

    # ── Gemini (الاحتياطي النهائي) ─────────────────────────
    def gemini_chat(self, prompt: str) -> str:
        if not self.gemini_flash:
            return "أنا هنا معاك 💜"
        try:
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(self.gemini_flash.generate_content, prompt)
                resp = future.result(timeout=15)  # مهلة 15 ثانية
            return resp.text.strip() if resp.text else "أنا هنا معاك 💜"
        except Exception as e:
            logger.error(f"Gemini error: {e}")
            return "أنا هنا معاك 💜"

    # ── helpers داخلية ────────────────────────────────────
    def _groq(self, model: str, prompt: str) -> Optional[str]:
        if not self.groq_client:
            return None
        try:
            resp = self.groq_client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=300,
                timeout=15,
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
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=300,
                timeout=15,
            )
            return resp.choices[0].message.content
        except Exception as e:
            logger.warning(f"OpenRouter [{model}]: {e}")
            return None

    # ── النماذج الـ 8 ──────────────────────────────────────
    def groq_chat(self, p: str) -> Optional[str]:
        """1. المحادثة اليومية — Groq (Llama 3.3)"""
        return self._groq("llama-3.3-70b-versatile", p)

    def llama4_chat(self, p: str) -> Optional[str]:
        """2. المحادثة العاطفية + التخطيط — Llama 4 Maverick"""
        return self._or("meta-llama/llama-4-maverick:free", p)

    def minimax_chat(self, p: str) -> Optional[str]:
        """3. البرمجة والتقنية — MiniMax M2.5"""
        return self._or("minimax/minimax-m2.5:free", p)

    def deepseek_chat(self, p: str) -> Optional[str]:
        """4. التحليل العميق — DeepSeek V4"""
        return self._or("deepseek/deepseek-v4-flash:free", p)

    def gemma4_chat(self, p: str) -> Optional[str]:
        """5. متعدد اللغات — Gemma 4"""
        return self._or("google/gemma-3-27b-it:free", p)

    def gptoss_chat(self, p: str) -> Optional[str]:
        """6. الاحتياطي العام — GPT-OSS 120B"""
        return self._or("openai/gpt-4o-mini:free", p)

    def qwen_chat(self, p: str) -> Optional[str]:
        """7. المهام المتعددة — Qwen 3.6"""
        return self._or("qwen/qwen2.5-72b-instruct:free", p)

    # ── توجيه المهام async (للاستخدام في twin_brain) ───────
    async def get_best_reply(self, prompt: str, task: str = "general") -> str:
        """يختار أفضل نموذج حسب نوع المهمة، مع احتياطيات متعددة"""
        chains = {
            "general":        [self.groq_chat, self.llama4_chat, self.deepseek_chat, self.gemini_chat],
            "emotional":      [self.groq_chat, self.llama4_chat, self.gemma4_chat, self.gemini_chat],
            "coding":         [self.minimax_chat, self.deepseek_chat, self.groq_chat, self.gemini_chat],
            "multimodal":     [self.llama4_chat, self.gemini_chat],
            "deep_reasoning": [self.deepseek_chat, self.qwen_chat, self.gptoss_chat, self.gemini_chat],
            "multilingual":   [self.gemma4_chat, self.llama4_chat, self.gemini_chat],
            "planning":       [self.llama4_chat, self.qwen_chat, self.gemini_chat],
            "agent":          [self.qwen_chat, self.llama4_chat, self.gemini_chat],
        }

        selected = chains.get(task, chains["general"])
        loop = asyncio.get_running_loop()
        last_error = ""

        for fn in selected:
            try:
                result = await loop.run_in_executor(None, fn, prompt)
                # ✅ شرط أكثر مرونة: أي رد غير فارغ مقبول
                if result and len(result.strip()) >= 1:
                    logger.info(f"✅ [{task}] → {fn.__name__}")
                    return result.strip()
            except Exception as e:
                logger.warning(f"⚠️ {fn.__name__}: {e}")
                last_error = str(e)
                continue

        # احتياطي نهائي: Gemini
        logger.warning(f"⚠️ All models failed for [{task}]. Last error: {last_error}")
        return self.gemini_chat(prompt)

    # ── توجيه المهام sync (للتوافق مع الكود القديم) ────────
    def get_best_reply_sync(self, prompt: str, task: str = "general") -> str:
        """نسخة متزامنة للتوافق"""
        chains = {
            "general":        [self.groq_chat, self.llama4_chat, self.deepseek_chat],
            "emotional":      [self.groq_chat, self.llama4_chat, self.gemma4_chat],
            "coding":         [self.minimax_chat, self.deepseek_chat, self.groq_chat],
            "deep_reasoning": [self.deepseek_chat, self.qwen_chat, self.gptoss_chat],
            "multilingual":   [self.gemma4_chat, self.llama4_chat],
            "planning":       [self.llama4_chat, self.qwen_chat],
            "agent":          [self.qwen_chat, self.llama4_chat],
        }

        for fn in chains.get(task, chains["general"]):
            try:
                result = fn(prompt)
                # ✅ شرط أكثر مرونة
                if result and len(result.strip()) >= 1:
                    logger.info(f"✅ sync [{task}] → {fn.__name__}")
                    return result.strip()
            except Exception as e:
                logger.warning(f"⚠️ {fn.__name__}: {e}")
                continue

        return self.gemini_chat(prompt)

    # ── توجيه حسب الباقة (من message_limits) ──────────────
    async def get_reply_for_tier(self, prompt: str, task: str, tier: str) -> str:
        """يختار النموذج المناسب حسب الباقة"""
        try:
            from message_limits import get_tier_models
            allowed = get_tier_models(tier)
        except ImportError:
            allowed = ["groq", "gemma4", "gemini"]

        model_map = {
            "groq":     self.groq_chat,
            "llama4":   self.llama4_chat,
            "minimax":  self.minimax_chat,
            "deepseek": self.deepseek_chat,
            "gemma4":   self.gemma4_chat,
            "gptoss":   self.gptoss_chat,
            "qwen":     self.qwen_chat,
            "gemini":   self.gemini_chat,
        }

        all_chains = {
            "general":        ["groq", "llama4", "deepseek", "gemini"],
            "emotional":      ["groq", "llama4", "gemma4", "gemini"],
            "coding":         ["minimax", "deepseek", "groq", "gemini"],
            "deep_reasoning": ["deepseek", "qwen", "gptoss", "gemini"],
            "multilingual":   ["gemma4", "llama4", "gemini"],
            "planning":       ["llama4", "qwen", "gemini"],
            "agent":          ["qwen", "llama4", "gemini"],
        }

        chain = all_chains.get(task, all_chains["general"])
        filtered = [m for m in chain if m in allowed] or ["groq", "gemini"]

        loop = asyncio.get_running_loop()
        for model_name in filtered:
            fn = model_map.get(model_name)
            if not fn:
                continue
            try:
                result = await loop.run_in_executor(None, fn, prompt)
                # ✅ شرط أكثر مرونة
                if result and len(result.strip()) >= 1:
                    logger.info(f"✅ tier[{tier}] [{task}] → {model_name}")
                    return result.strip()
            except Exception as e:
                logger.warning(f"⚠️ {model_name}: {e}")

        return self.gemini_chat(prompt)
