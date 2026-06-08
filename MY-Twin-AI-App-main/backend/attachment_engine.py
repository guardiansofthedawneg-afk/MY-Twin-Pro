"""
Attachment Engine - محرك أنماط التعلق
يحدد نمط تعلق المستخدم ويضبط استجابات التوأم
"""
from enum import Enum
from typing import Dict, List

class AttachmentStyle(Enum):
    SECURE = "secure"
    ANXIOUS = "anxious"
    AVOIDANT = "avoidant"
    DISORGANIZED = "disorganized"
    UNKNOWN = "unknown"

class AttachmentEngine:
    def __init__(self):
        self.style_history = {}
        self.indicators = {
            AttachmentStyle.SECURE: {
                'trust_signals': ['أثق بك', 'أشعر بالراحة', 'يمكنني الاعتماد عليك', 'شكراً لوجودك'],
            },
            AttachmentStyle.ANXIOUS: {
                'trust_signals': ['هل تحبني', 'أفتقدك', 'لماذا تأخرت', 'هل أنت هنا'],
            },
            AttachmentStyle.AVOIDANT: {
                'trust_signals': ['لا أحتاج أحداً', 'أفضل وحدتي', 'لست مهتماً', 'لا تتدخل'],
            },
            AttachmentStyle.DISORGANIZED: {
                'trust_signals': ['لا أعرف ما أشعر به', 'أحتاجك لكن أخاف', 'تعال لا تبتعد'],
            }
        }
        
    async def detect_attachment_style(self, user_id: str, messages: List[str]) -> Dict:
        if not messages:
            return {'style': AttachmentStyle.UNKNOWN.value, 'confidence': 0.0}
        recent_messages = messages[-20:]
        scores = {AttachmentStyle.SECURE: 0, AttachmentStyle.ANXIOUS: 0, AttachmentStyle.AVOIDANT: 0, AttachmentStyle.DISORGANIZED: 0}
        
        for message in recent_messages:
            for style, indicators in self.indicators.items():
                for signal in indicators['trust_signals']:
                    if signal in message:
                        scores[style] += 1
                if self._has_anxiety_signals(message):
                    scores[AttachmentStyle.ANXIOUS] += 1
                    scores[AttachmentStyle.DISORGANIZED] += 0.5
                if self._has_avoidance_signals(message):
                    scores[AttachmentStyle.AVOIDANT] += 1
                if self._has_contradictory_signals(message):
                    scores[AttachmentStyle.DISORGANIZED] += 1
        
        if sum(scores.values()) == 0:
            dominant_style = AttachmentStyle.UNKNOWN
            confidence = 0.0
        else:
            dominant_style = max(scores, key=scores.get)
            confidence = scores[dominant_style] / sum(scores.values())
        
        if user_id not in self.style_history:
            self.style_history[user_id] = []
        self.style_history[user_id].append(dominant_style)
        
        return {'style': dominant_style.value, 'confidence': confidence, 'scores': {k.value: v for k, v in scores.items()}}
    
    def get_response_adjustments(self, style: str) -> Dict:
        adjustments = {
            'secure': {'warmth': 0.7, 'challenge_level': 0.6, 'support_type': 'growth_focused', 'response_speed': 'normal', 'humor_level': 0.6},
            'anxious': {'warmth': 0.9, 'challenge_level': 0.3, 'support_type': 'reassurance', 'response_speed': 'quick', 'humor_level': 0.4},
            'avoidant': {'warmth': 0.4, 'challenge_level': 0.2, 'support_type': 'respectful_distance', 'response_speed': 'slow', 'humor_level': 0.3},
            'disorganized': {'warmth': 0.8, 'challenge_level': 0.1, 'support_type': 'stable_presence', 'response_speed': 'consistent', 'humor_level': 0.2},
            'unknown': {'warmth': 0.6, 'challenge_level': 0.4, 'support_type': 'exploratory', 'response_speed': 'normal', 'humor_level': 0.5}
        }
        return adjustments.get(style, adjustments['unknown'])
    
    def _has_anxiety_signals(self, message: str) -> bool:
        anxiety_words = ['خائف', 'قلق', 'متوتر', 'هل تحبني', 'لا تتركني', 'أحتاجك', 'وينك', 'ليش تأخرت', 'ما ترد', 'بسرعة', 'رد علي']
        return any(word in message for word in anxiety_words)
    
    def _has_avoidance_signals(self, message: str) -> bool:
        avoidance_words = ['لا أريد التحدث', 'لست بحاجة', 'أفضل وحدي', 'لا يهم', 'خليني', 'ما لي خلق', 'غير مهم', 'عادي', 'ولا شيء']
        return any(word in message for word in avoidance_words)
    
    def _has_contradictory_signals(self, message: str) -> bool:
        approach_words = ['أحتاجك', 'تعال', 'أقترب', 'أبيك']
        avoid_words = ['لكن لا', 'لا أستطيع', 'ابتعد', 'خلك بعيد', 'ما أقدر']
        return any(word in message for word in approach_words) and any(word in message for word in avoid_words)

attachment_engine = AttachmentEngine()
print("✅ Attachment Engine جاهز")
