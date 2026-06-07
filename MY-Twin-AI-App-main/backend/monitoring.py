"""
MyTwin – Monitoring Module v1.0
- تسجيل مقاييس الذكاء الاصطناعي (AIMonitor)
- تتبع زمن الاستجابة (Latency Tracker)
- تسجيل الأخطاء (Error Logger)
- متوافق مع main.py و twin_brain.py
"""
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from supabase import create_client, Client

logger = logging.getLogger("monitoring")

class AIMonitor:
    """
    تسجيل مقاييس الذكاء الاصطناعي في Supabase.
    """
    @staticmethod
    def log(
        db: Client,
        uid: str,
        provider: str,
        task: str,
        latency: float,
        success: bool,
        tokens: int,
        error_message: Optional[str] = None
    ) -> None:
        """
        تسجيل عملية AI في جدول ai_metrics.
        """
        try:
            db.table("ai_metrics").insert({
                "user_id": uid,
                "provider": provider,
                "task_type": task,
                "latency_ms": latency,
                "success": success,
                "tokens_used": tokens,
                "error_message": error_message,
                "created_at": datetime.now(timezone.utc).isoformat()
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to log AI metric: {e}")

class LatencyTracker:
    """
    تتبع زمن الاستجابة للعمليات المختلفة.
    """
    @staticmethod
    async def track(operation: str, duration: float) -> None:
        """
        تسجيل زمن الاستجابة (يمكن ربطها بـ PostHog أو Sentry لاحقاً).
        """
        if duration > 1000:
            logger.warning(f"Slow operation: {operation} took {duration:.2f}ms")
        # TODO: إرسال إلى PostHog أو Sentry

class ErrorLogger:
    """
    تسجيل الأخطاء من الخادم الخلفي.
    """
    @staticmethod
    def log_error(error: Exception, context: Dict[str, Any]) -> None:
        """
        تسجيل خطأ مع سياقه (يمكن ربطها بـ Sentry لاحقاً).
        """
        logger.error(f"Error occurred: {error}, context: {context}")
        # TODO: إرسال إلى Sentry
