"""
MyTwin – Monitoring & Latency Tracker v4.0 (موحد)
- AIMonitor (تسجيل مقاييس AI)
- LatencyTracker (تتبع زمن الخطوات)
- ErrorLogger (تسجيل الأخطاء)
- SystemMonitor (مراقبة النظام)
- تنبيهات وتنبؤات
"""
import os, time, logging, psutil
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone, timedelta
from collections import deque

logger = logging.getLogger("monitoring")

# ========== مقاييس النظام الداخلية ==========
_metrics_history = deque(maxlen=100)
_alert_thresholds = {
    "response_time_ms": 1200,
    "error_rate": 0.05,
    "memory_percent": 85,
    "cpu_percent": 80,
}
_alert_cooldown = {}

# ========== AIMonitor (موجود) ==========
class AIMonitor:
    @staticmethod
    def log(db, uid, provider, task, latency, success, tokens, error_message=None):
        try:
            db.table("ai_metrics").insert({
                "user_id": uid, "provider": provider, "task_type": task,
                "latency_ms": latency, "success": success, "tokens_used": tokens,
                "error_message": error_message, "created_at": datetime.now(timezone.utc).isoformat()
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to log AI metric: {e}")

# ========== LatencyTracker (جديد + قديم) ==========
class LatencyTracker:
    """
    تتبع زمن الاستجابة للعمليات وخطوات المعالجة.
    """
    def __init__(self):
        self.breakdown: Dict[str, float] = {}
        self._current_step: str = None
        self._start_time: float = None

    def start(self, step: str) -> None:
        self._current_step = step
        self._start_time = time.time()

    def end(self) -> float:
        if not self._current_step or not self._start_time:
            return 0
        elapsed = (time.time() - self._start_time) * 1000
        self.breakdown[self._current_step] = round(elapsed, 2)
        logger.info(f"⏱️ {self._current_step}: {elapsed:.1f}ms")
        self._current_step = None
        self._start_time = None
        return elapsed

    def get_breakdown(self) -> Dict[str, float]:
        return self.breakdown

    def total(self) -> float:
        return round(sum(self.breakdown.values()), 2)

    @staticmethod
    async def track(operation: str, duration: float) -> None:
        """تتبع عملية واحدة (للاستخدام السريع)"""
        if duration > 1000:
            logger.warning(f"Slow operation: {operation} took {duration:.2f}ms")

# ========== ErrorLogger (موجود) ==========
class ErrorLogger:
    @staticmethod
    def log_error(error: Exception, context: Dict[str, Any]) -> None:
        logger.error(f"Error: {error}, context: {context}")

# ========== SystemMonitor (مراقبة النظام) ==========
def collect_system_metrics() -> Dict[str, Any]:
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "cpu_percent": psutil.cpu_percent(interval=0.5),
        "memory_percent": psutil.virtual_memory().percent,
        "disk_percent": psutil.disk_usage('/').percent,
        "active_connections": len(psutil.net_connections(kind='tcp')) if hasattr(psutil, 'net_connections') else 0,
    }

def record_metric(metric: Dict[str, Any]) -> None:
    _metrics_history.append(metric)

def check_alerts(metrics: Dict[str, Any]) -> List[str]:
    alerts = []
    now = time.time()
    def can_alert(key, cd=300):
        if key in _alert_cooldown and now - _alert_cooldown[key] < cd:
            return False
        _alert_cooldown[key] = now
        return True

    if metrics.get("avg_response_time_ms", 0) > _alert_thresholds["response_time_ms"] and can_alert("resp"):
        alerts.append(f"⚠️ زمن استجابة مرتفع: {metrics['avg_response_time_ms']:.0f}ms")
    if metrics.get("error_rate", 0) > _alert_thresholds["error_rate"] and can_alert("err"):
        alerts.append(f"🚨 نسبة أخطاء عالية: {metrics['error_rate']*100:.1f}%")
    if metrics.get("memory_percent", 0) > _alert_thresholds["memory_percent"] and can_alert("mem"):
        alerts.append(f"💾 ذاكرة مرتفعة: {metrics['memory_percent']:.1f}%")
    if metrics.get("cpu_percent", 0) > _alert_thresholds["cpu_percent"] and can_alert("cpu"):
        alerts.append(f"🔥 CPU مرتفع: {metrics['cpu_percent']:.1f}%")
    return alerts

def predict_trend(key: str, lookback=10, steps=5) -> Optional[float]:
    if len(_metrics_history) < lookback:
        return None
    recent = [m[key] for m in list(_metrics_history)[-lookback:] if key in m]
    if len(recent) < 3:
        return None
    avg_diff = sum(recent[i]-recent[i-1] for i in range(1, len(recent))) / (len(recent)-1)
    return recent[-1] + avg_diff * steps

def get_health_report() -> Dict:
    metrics = collect_system_metrics()
    alerts = check_alerts(metrics)
    pred_cpu = predict_trend("cpu_percent")
    pred_mem = predict_trend("memory_percent")
    preds = []
    if pred_cpu and pred_cpu > _alert_thresholds["cpu_percent"]:
        preds.append(f"🔮 CPU قد يتجاوز {_alert_thresholds['cpu_percent']}% قريباً")
    if pred_mem and pred_mem > _alert_thresholds["memory_percent"]:
        preds.append(f"🔮 الذاكرة قد تتجاوز {_alert_thresholds['memory_percent']}% قريباً")
    return {"current_metrics": metrics, "alerts": alerts, "predictions": preds, "history_count": len(_metrics_history)}

# ========== كائن عالمي للتتبع (متوافق مع main.py) ==========
tracker = LatencyTracker()
print("✅ Monitoring & Latency Tracker v4.0 | جاهز")
