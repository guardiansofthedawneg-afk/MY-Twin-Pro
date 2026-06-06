class AIUnavailable(Exception):
    pass

import os, logging, asyncio
from typing import Optional
import google.generativeai as genai
from openai import OpenAI

logger = logging.getLogger("multi_ai")

class MultiAIClient:
    def __init__(self):
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        self.gemini_flash = genai.GenerativeModel(
            "gemini-2.0-flash",
            generation_config=genai.types.GenerationConfig(temperature=0.7, max_output_tokens=300)
        )
        groq_key = os.getenv("GROQ_API_KEY")
        self.groq_client = OpenAI(base_url="https://api.groq.com/openai/v1", api_key=groq_key) if groq_key else None
        or_key = os.getenv("OPENROUTER_API_KEY")
        self.or_client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=or_key) if or_key else None

    def gemini_chat(self, prompt: str) -> str:
        try:
            resp = self.gemini_flash.generate_content(prompt)
            return resp.text.strip()
        except Exception as e:
            logger.error(f"Gemini error: {e}")
            return "أنا هنا معاك 💜"

    def _groq(self, model: str, prompt: str) -> Optional[str]:
        if not self.groq_client: return None
        try:
            resp = self.groq_client.chat.completions.create(
                model=model, messages=[{"role": "user", "content": prompt}],
                temperature=0.7, max_tokens=300, timeout=15
            )
            return resp.choices[0].message.content
        except Exception as e:
            logger.warning(f"Groq [{model}]: {e}")
            return None

    def _or(self, model: str, prompt: str) -> Optional[str]:
        if not self.or_client: return None
        try:
            resp = self.or_client.chat.completions.create(
                model=model, messages=[{"role": "user", "content": prompt}],
                temperature=0.7, max_tokens=300, timeout=15
            )
            return resp.choices[0].message.content
        except Exception as e:
            logger.warning(f"OpenRouter [{model}]: {e}")
            return None

    def groq_chat(self, p: str) -> Optional[str]: return self._groq("llama-3.3-70b-versatile", p)
    def llama4_chat(self, p: str) -> Optional[str]: return self._or("meta-llama/llama-4-maverick:free", p)
    def minimax_chat(self, p: str) -> Optional[str]: return self._or("minimax/minimax-m2.5:free", p)
    def deepseek_chat(self, p: str) -> Optional[str]: return self._or("deepseek/deepseek-v4-flash:free", p)
    def gemma4_chat(self, p: str) -> Optional[str]: return self._or("google/gemma-3-27b-it:free", p)
    def gptoss_chat(self, p: str) -> Optional[str]: return self._or("openai/gpt-4o-mini:free", p)
    def qwen_chat(self, p: str) -> Optional[str]: return self._or("qwen/qwen2.5-72b-instruct:free", p)

    async def get_best_reply(self, prompt: str, task: str = "general") -> str:
        chains = {
            "general": [self.groq_chat, self.llama4_chat, self.deepseek_chat],
            "emotional": [self.groq_chat, self.llama4_chat, self.gemma4_chat],
            "coding": [self.minimax_chat, self.deepseek_chat, self.groq_chat],
            "deep_reasoning": [self.deepseek_chat, self.qwen_chat, self.gptoss_chat],
            "multilingual": [self.gemma4_chat, self.llama4_chat],
            "planning": [self.llama4_chat, self.qwen_chat],
            "agent": [self.qwen_chat, self.llama4_chat],
        }
        selected = chains.get(task, chains["general"])
        loop = asyncio.get_running_loop()
        last_error = ""
        for fn in selected:
            try:
                result = await loop.run_in_executor(None, fn, prompt)
                if result and len(result.strip()) > 5:
                    logger.info(f"✅ [{task}] → {fn.__name__}")
                    return result.strip()
            except Exception as e:
                logger.warning(f"⚠️ {fn.__name__}: {e}")
                last_error = str(e)
                continue
        # إذا فشلت كل النماذج
        raise AIUnavailable(f"All AI models failed for [{task}]. Last error: {last_error}")
