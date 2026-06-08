"""
MyTwin – Reasoning Engine v6.0 (Agent Framework with Tool Registry)
- يحلل الرسالة ويحدد المهمة (Task) والأدوات المطلوبة.
- يخطط لخطوات متعددة (Multi-step Planning).
- ينفذ الأدوات (Tool Executor) من خلال Tool Registry.
- يتأمل في النتائج (Reflection).
- يدعم العربية والإنجليزية.
"""
import os, logging, json, asyncio
from typing import Dict, Any, Optional, List, Callable
from groq_helper import call_groq

logger = logging.getLogger(__name__)

class ToolRegistry:
    """سجل الأدوات الديناميكي."""
    _tools: Dict[str, Callable] = {}

    @classmethod
    def register(cls, name: str, func: Callable):
        cls._tools[name] = func

    @classmethod
    def get_tool(cls, name: str) -> Optional[Callable]:
        return cls._tools.get(name)

    @classmethod
    def list_tools(cls) -> List[str]:
        return list(cls._tools.keys())

class ReasoningEngine:
    def __init__(self, gemini_key: Optional[str] = None):
        self.gemini_key = gemini_key or os.getenv("GEMINI_API_KEY")
        self.max_steps = 3  # الحد الأقصى لعدد الخطوات في الخطة

    async def plan(self, message: str, emotion: Dict[str, Any], context: str = "", lang: str = "ar") -> Dict[str, Any]:
        """
        التخطيط: تحليل الرسالة وبناء خطة متعددة الخطوات.
        """
        available_tools = ", ".join(ToolRegistry.list_tools())
        if lang == "ar":
            prompt = f"""أنت وكيل ذكي. حلل الرسالة وابني خطة عمل متعددة الخطوات. أعد ONLY JSON:
{{
  "analysis": "تحليل سريع للموقف",
  "steps": [
    {{"action": "search", "tool": "google_search", "query": "..."}},
    {{"action": "process", "tool": "none", "reasoning": "..."}}
  ],
  "final_action": "general"
}}
السياق: {context}
الرسالة: "{message}"
المشاعر: {emotion.get('primary', 'neutral')}
الأدوات المتاحة: {available_tools}
JSON:"""
        else:
            prompt = f"""You are an intelligent agent. Analyze and build a multi-step plan. Return ONLY JSON:
{{"analysis": "...", "steps": [...], "final_action": "..."}}
Context: {context}
Message: "{message}"
Available tools: {available_tools}
JSON:"""

        try:
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(None, call_groq, prompt)
            if result:
                raw = result.strip()
                if raw.startswith("```json"): raw = raw.split("```json")[1].split("```")[0].strip()
                elif raw.startswith("```"): raw = raw.split("```")[1].split("```")[0].strip()
                plan = json.loads(raw)
                if len(plan.get("steps", [])) > self.max_steps:
                    plan["steps"] = plan["steps"][:self.max_steps]
                return plan
        except Exception as e:
            logger.warning(f"Planning failed: {e}")
        return {"analysis": "Failed to plan", "steps": [], "final_action": "general"}

    async def execute_step(self, step: Dict[str, Any], user_id: Optional[str] = None) -> Optional[str]:
        """
        تنفيذ خطوة واحدة: البحث، تنفيذ أداة، أو معالجة.
        """
        action = step.get("action", "none")
        tool = step.get("tool", "none")
        query = step.get("query", "")

        if action == "search":
            if tool == "google_search":
                from external_services import search_google
                return await search_google(query)
            elif tool == "youtube":
                from external_services import search_youtube
                return await search_youtube(query)
            else:
                return "بحث عام غير متاح."
        
        elif action == "process":
            return None  # سيتم توليد الرد في النهاية
        
        elif action == "tool":
            # تنفيذ أداة مسجلة في Tool Registry
            tool_func = ToolRegistry.get_tool(tool)
            if tool_func:
                return await tool_func(user_id, query)
            else:
                return None
        
        return None

    async def reflect(self, plan: Dict[str, Any], result: str, lang: str = "ar") -> Dict[str, Any]:
        """
        التأمل: تحليل نتيجة الخطة لتعديل السلوك المستقبلي.
        """
        if lang == "ar":
            prompt = f"""تأمل في نتيجة الخطة وأعد ONLY JSON:
{{
  "was_effective": true/false,
  "what_worked": "ما نجح",
  "what_didnt": "ما لم ينجح",
  "adjustment": "كيف ستعدل خططك المستقبلية"
}}
الخطة: {json.dumps(plan)}
النتيجة: "{result}"
JSON:"""
        else:
            prompt = f"""Reflect on the plan's result and return ONLY JSON:
{{"was_effective": true/false, "what_worked": "...", "what_didnt": "...", "adjustment": "..."}}
Plan: {json.dumps(plan)}
Result: "{result}"
JSON:"""

        try:
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(None, call_groq, prompt)
            if result:
                raw = result.strip()
                if raw.startswith("```json"): raw = raw.split("```json")[1].split("```")[0].strip()
                elif raw.startswith("```"): raw = raw.split("```")[1].split("```")[0].strip()
                return json.loads(raw)
        except Exception as e:
            logger.warning(f"Reflection failed: {e}")
        return {"was_effective": True, "what_worked": "", "what_didnt": "", "adjustment": ""}
