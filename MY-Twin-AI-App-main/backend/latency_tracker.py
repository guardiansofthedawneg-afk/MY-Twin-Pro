"""
MyTwin – Latency Tracker
يتتبع زمن الاستجابة لكل خطوة في معالجة الرسالة
"""
import time
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class LatencyTracker:
    def __init__(self):
        self.breakdown: Dict[str, float] = {}
        self._current_step: str = None
        self._start_time: float = None

    def start(self, step: str) -> None:
        """بدء تتبع خطوة جديدة"""
        self._current_step = step
        self._start_time = time.time()

    def end(self) -> float:
        """إنهاء تتبع الخطوة الحالية وإرجاع الزمن بالمللي ثانية"""
        if not self._current_step or not self._start_time:
            return 0
        elapsed = (time.time() - self._start_time) * 1000
        self.breakdown[self._current_step] = round(elapsed, 2)
        logger.info(f"⏱️ {self._current_step}: {elapsed:.1f}ms")
        self._current_step = None
        self._start_time = None
        return elapsed

    def get_breakdown(self) -> Dict[str, float]:
        """إرجاع تقرير الأداء الكامل"""
        return self.breakdown

    def total(self) -> float:
        """إرجاع الزمن الكلي"""
        return round(sum(self.breakdown.values()), 2)

# كائن عالمي للاستخدام في main.py
tracker = LatencyTracker()
