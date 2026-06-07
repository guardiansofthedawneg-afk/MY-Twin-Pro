"""MyTwin – Groq Helper (للنماذج المجانية)"""
import os, logging
from typing import Optional
from openai import OpenAI

logger = logging.getLogger("groq_helper")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
groq_client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=GROQ_API_KEY,
) if GROQ_API_KEY else None

def call_groq(prompt: str, temperature: float = 0.7, max_tokens: int = 300) -> Optional[str]:
    if not groq_client:
        return None
    try:
        resp = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens,
            timeout=15,
        )
        return resp.choices[0].message.content
    except Exception as e:
        logger.error(f"Groq call failed: {e}")
        return None
