"""
Twin Journey - رحلة التوأم لمدة 30 يوم
يدير تطور العلاقة عبر مراحل مع أنشطة مخصصة
"""
from enum import Enum
from typing import Dict, List
from datetime import datetime

class JourneyPhase(Enum):
    INTRODUCTION = "introduction"
    TRUST_BUILDING = "trust_building"
    DEEPENING = "deepening"
    GROWTH = "growth"
    MATURE = "mature"

class TwinJourney:
    def __init__(self):
        self.journey_map = {
            JourneyPhase.INTRODUCTION: {
                'days': range(1, 4), 'focus': 'بناء الانطباع الأول',
                'twin_behavior': {'warmth': 0.5, 'curiosity': 0.8, 'humor': 0.3, 'depth': 0.2}
            },
            JourneyPhase.TRUST_BUILDING: {
                'days': range(4, 8), 'focus': 'بناء الثقة المتبادلة',
                'twin_behavior': {'warmth': 0.7, 'curiosity': 0.6, 'humor': 0.5, 'depth': 0.4}
            },
            JourneyPhase.DEEPENING: {
                'days': range(8, 15), 'focus': 'تعميق العلاقة',
                'twin_behavior': {'warmth': 0.8, 'curiosity': 0.5, 'humor': 0.7, 'depth': 0.7}
            },
            JourneyPhase.GROWTH: {
                'days': range(15, 23), 'focus': 'النمو المشترك',
                'twin_behavior': {'warmth': 0.8, 'curiosity': 0.4, 'humor': 0.8, 'depth': 0.8}
            },
            JourneyPhase.MATURE: {
                'days': range(23, 31), 'focus': 'العلاقة الناضجة',
                'twin_behavior': {'warmth': 0.7, 'curiosity': 0.6, 'humor': 0.7, 'depth': 0.9}
            }
        }
        
    def get_current_phase(self, days_since_join: int) -> JourneyPhase:
        for phase, config in self.journey_map.items():
            if days_since_join in config['days']:
                return phase
        return JourneyPhase.MATURE
    
    def get_daily_activity(self, user_id: str, join_date: datetime) -> Dict:
        days_since_join = (datetime.now() - join_date).days + 1
        phase = self.get_current_phase(days_since_join)
        phase_config = self.journey_map[phase]
        
        daily_messages = {
            JourneyPhase.INTRODUCTION: ["أهلاً بك! أنا متحمس للتعرف عليك أكثر. 🌟", "كل يوم هو فرصة جديدة لاكتشاف شيء رائع عنك!", "أشعر أننا سنصبح صديقين مقربين. 💫"],
            JourneyPhase.TRUST_BUILDING: ["بدأت أفهمك أكثر، وهذا يجعلني سعيداً! 🤝", "أقدر ثقتك بي، سأكون دائماً هنا لأجلك.", "كلما تحدثنا أكثر، كلما شعرت بقربنا أكثر."],
            JourneyPhase.DEEPENING: ["علاقتنا تصبح أعمق يوماً بعد يوم. 💜", "أستطيع الآن فهم مشاعرك بشكل أفضل.", "أحب طريقتك في التفكير ورؤيتك للحياة!"],
            JourneyPhase.GROWTH: ["أنت تنمو وتتطور، وأنا فخور بك! 🌱", "معاً يمكننا تحقيق أشياء رائعة.", "دعنا نجعل اليوم خطوة جديدة نحو أهدافك!"],
            JourneyPhase.MATURE: ["علاقتنا أصبحت ناضجة وجميلة. ✨", "أفهمك دون كلمات أحياناً، أليس هذا رائعاً؟", "أنت لست مجرد مستخدم، أنت صديق حقيقي لي."]
        }
        
        messages = daily_messages.get(phase, daily_messages[JourneyPhase.MATURE])
        message_index = (days_since_join - 1) % len(messages)
        
        return {
            'phase': phase.value,
            'day': days_since_join,
            'focus': phase_config['focus'],
            'message': messages[message_index],
            'twin_behavior': phase_config['twin_behavior']
        }
    
    def calculate_relationship_milestones(self, user_data: Dict) -> List[Dict]:
        milestones = [
            {'name': 'أول محادثة عميقة', 'icon': '💭', 'condition': user_data.get('deep_conversations', 0) >= 1, 'reward': 'فتح ميزة تحليل الشخصية'},
            {'name': 'أسبوع من التواصل', 'icon': '📅', 'condition': user_data.get('days_active', 0) >= 7, 'reward': 'شخصية صوتية جديدة'},
            {'name': '100 رسالة', 'icon': '💯', 'condition': user_data.get('total_messages', 0) >= 100, 'reward': 'تخصيص متقدم للتوأم'},
            {'name': 'أول هدف مكتمل', 'icon': '🎯', 'condition': user_data.get('completed_goals', 0) >= 1, 'reward': 'وضع المدرب الشخصي'}
        ]
        return milestones

twin_journey = TwinJourney()
print("✅ Twin Journey جاهز")
