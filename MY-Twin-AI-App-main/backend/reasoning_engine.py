"""
MyTwin – Reasoning Engine v7.0 (Agent Framework with Real Tools)
- تخطيط متعدد الخطوات (Multi-step Planning) مع وعي بالرحلة والتعلق.
- أدوات حقيقية: تذكير بأهداف، تحليل تقدم، جلب ذكريات، بحث، يوتيوب.
- تكامل مع multi_ai و twin_journey و attachment_engine.
"""
import os, logging, json, asyncio
from typing import Dict, Any, Optional, List, Callable

logger = logging.getLogger(__name__)

class ToolRegistry:
    """سجل الأدوات الديناميكي"""
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

    @classmethod
    def has_tool(cls, name: str) -> bool:
        return name in cls._tools

# ── تسجيل الأدوات الحقيقية ──────────────────────────
async def _tool_remind_goal(user_id: str, query: str = "") -> Optional[str]:
    """تذكير بأهداف المستخدم من Supabase"""
    try:
        from supabase import create_client
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_SERVICE_KEY", "")
        if not url or not key:
            return None
        db = create_client(url, key)
        res = db.table("goals").select("*").eq("user_id", user_id).eq("status", "active").order("created_at", desc=True).limit(3).execute()
        if res.data:
            goals = [g.get("title", "") for g in res.data]
            return "أهدافك النشطة: " + "، ".join(goals)
        return "لا توجد أهداف نشطة حالياً."
    except Exception as e:
        logger.warning(f"Tool remind_goal failed: {e}")
        return None

async def _tool_analyze_progress(user_id: str, query: str = "") -> Optional[str]:
    """تحليل تقدم المستخدم بناءً على سجل النمو"""
    try:
        from growth_tracker import get_growth_history
        history = await get_growth_history(user_id, limit=1)
        if history:
            last = history[0]
            return f"آخر تقرير نمو: {last.get('summary', 'لا يوجد')}"
        return "لم يتم تسجيل تقدم بعد."
    except Exception as e:
        logger.warning(f"Tool analyze_progress failed: {e}")
        return None

async def _tool_fetch_memory(user_id: str, query: str = "") -> Optional[str]:
    """جلب ذاكرة محددة تتعلق بكلمة مفتاحية"""
    try:
        from memory_graph import get_memory_context
        context = await get_memory_context(user_id)
        if context and query and query.lower() in str(context).lower():
            return str(context)
        return "لا توجد ذكريات تطابق البحث."
    except Exception as e:
        logger.warning(f"Tool fetch_memory failed: {e}")
        return None

# تسجيل الأدوات
ToolRegistry.register("remind_goal", _tool_remind_goal)
ToolRegistry.register("analyze_progress", _tool_analyze_progress)
ToolRegistry.register("fetch_memory", _tool_fetch_memory)

class ReasoningEngine:
    def __init__(self, gemini_key: Optional[str] = None):
        self.gemini_key = gemini_key
        self.max_steps = 3

    def _get_multi_client(self):
        try:
            from multi_ai import MultiAIClient
            return MultiAIClient()
        except:
            return None

    async def plan(self,
                   message: str,
                   emotion: Dict[str, Any],
                   context: str = "",
                   lang: str = "ar",
                   journey_phase: Optional[str] = None,
                   attachment_style: Optional[str] = None) -> Dict[str, Any]:
        """
        التخطيط: تحليل الرسالة وبناء خطة خطوات (وعي بالرحلة والتعلق)
        """
        available_tools = ", ".join(ToolRegistry.list_tools())
        extra_context = ""
        if journey_phase:
            extra_context += f" مرحلة الرحلة: {journey_phase}."
        if attachment_style:
            extra_context += f" نمط تعلق المستخدم: {attachment_style}."

        if lang == "ar":
            prompt = f"""أنت وكيل ذكي. حلل الرسالة وابني خطة عمل. أعد ONLY JSON:
{{
  "analysis": "تحليل سريع",
  "steps": [
    {{"action": "search", "tool": "google_search", "query": "..."}},
    {{"action": "tool", "tool": "remind_goal", "query": ""}},
    {{"action": "process", "tool": "none", "reasoning": "..."}}
  ],
  "final_action": "general"
}}
السياق: {context}{extra_context}
الرسالة: "{message}"
المشاعر: {emotion.get('primary', 'neutral')}
الأدوات المتاحة: {available_tools}
JSON:"""
        else:
            prompt = f"""You are an intelligent agent. Analyze and build a plan. Return ONLY JSON:
{{"analysis": "...", "steps": [...], "final_action": "..."}}
Context: {context}{extra_context}
Message: "{message}"
Available tools: {available_tools}
JSON:"""

        try:
            client = self._get_multi_client()
            if not client:
                return {"analysis": "", "steps": [], "final_action": "general"}
            loop = asyncio.get_running_loop()
            result = await client.get_best_reply(prompt, task="planning")
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
        return {"analysis": "", "steps": [], "final_action": "general"}

    async def execute_step(self, step: Dict[str, Any], user_id: Optional[str] = None) -> Optional[str]:
        """تنفيذ خطوة واحدة"""
        action = step.get("action", "none")
        tool = step.get("tool", "none")
        query = step.get("query", "")

        if action == "tool":
            tool_func = ToolRegistry.get_tool(tool)
            if tool_func:
                try:
                    loop = asyncio.get_running_loop()
                    result = await tool_func(user_id, query) if asyncio.iscoroutinefunction(tool_func) else await loop.run_in_executor(None, tool_func, user_id, query)
                    return str(result) if result else None
                except Exception as e:
                    logger.warning(f"Tool {tool} failed: {e}")
                    return None

        elif action == "search":
            if tool == "google_search":
                try:
                    from external_services import search_google
                    return await search_google(query)
                except:
                    pass
            elif tool == "youtube":
                try:
                    from external_services import search_youtube
                    return await search_youtube(query)
                except:
                    pass

        return None

    async def reflect(self, plan: Dict[str, Any], result: str, lang: str = "ar") -> Dict[str, Any]:
        """التأمل في نتيجة الخطة"""
        if lang == "ar":
            prompt = f"""تأمل في نتيجة الخطة وأعد ONLY JSON:
{{"was_effective": true/false, "what_worked": "...", "what_didnt": "...", "adjustment": "..."}}
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
            client = self._get_multi_client()
            if not client:
                return {"was_effective": True}
            loop = asyncio.get_running_loop()
            result = await client.get_best_reply(prompt, task="planning")
            if result:
                raw = result.strip()
                if raw.startswith("```json"): raw = raw.split("```json")[1].split("```")[0].strip()
                elif raw.startswith("```"): raw = raw.split("```")[1].split("```")[0].strip()
                return json.loads(raw)
        except Exception as e:
            logger.warning(f"Reflection failed: {e}")
        return {"was_effective": True}

# تسجيل أداة توصية المنتجات
async def _tool_recommend_product(user_id: str, query: str = "") -> Optional[str]:
    try:
        from product_recommender import product_recommender
        intent = await product_recommender.detect_purchase_intent(query, user_id)
        if intent:
            product = await product_recommender.get_best_product(intent, "free")
            if product:
                return product_recommender.format_suggestion(product, "ar")
        return "لا توجد توصيات حالية."
    except Exception as e:
        logger.warning(f"Tool recommend_product failed: {e}")
        return None

ToolRegistry.register("recommend_product", _tool_recommend_product)
