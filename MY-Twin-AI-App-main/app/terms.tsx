import { SafeAreaView, ScrollView, Text, StyleSheet } from 'react-native';
import { useTwinStore } from '../store/useTwinStore';
import { FileText } from 'lucide-react-native';

export default function Terms() {
  const { lang, theme } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = theme === 'dark';

  const terms = isAr ? `
  الشروط والأحكام – MyTwin
  
  آخر تحديث: يونيو 2026
  
  1. القبول: باستخدامك لتطبيق MyTwin، فإنك توافق على هذه الشروط والأحكام بالكامل.
  
  2. الخدمة: MyTwin هو رفيق ذكي يعمل بالذكاء الاصطناعي. الردود التي يقدمها التوأم الرقمي هي لأغراض ترفيهية وداعمة فقط، ولا تغني عن استشارة المتخصصين في الصحة النفسية.
  
  3. الحساب: أنت مسؤول عن الحفاظ على سرية بيانات حسابك.
  
  4. الاستخدام المقبول: لا يجوز استخدام التطبيق لأي غرض غير قانوني أو ضار.
  
  5. الملكية الفكرية: جميع حقوق التطبيق مملوكة لشركة Soul Sync Ltd.
  
  6. إنهاء الخدمة: نحتفظ بالحق في إنهاء حسابك في أي وقت.
  
  7. تحديد المسؤولية: Soul Sync Ltd. غير مسؤولة عن أي أضرار ناتجة عن استخدام التطبيق.
  ` : `
  Terms & Conditions – MyTwin
  
  Last updated: June 2026
  
  1. Acceptance: By using MyTwin, you fully agree to these terms.
  
  2. Service: MyTwin is an AI-powered companion. Responses are for entertainment and support only, and do not replace professional mental health advice.
  
  3. Account: You are responsible for keeping your account credentials safe.
  
  4. Acceptable Use: Do not use the app for any illegal or harmful purpose.
  
  5. Intellectual Property: All rights are owned by Soul Sync Ltd.
  
  6. Termination: We reserve the right to terminate your account at any time.
  
  7. Limitation of Liability: Soul Sync Ltd. is not liable for any damages from using the app.
  `;

  return (
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
      <ScrollView style={s.container} contentContainerStyle={{ padding: 20 }}>
        <FileText size={40} stroke={isDark ? '#D8B4FE' : '#6B21A8'} style={{ alignSelf: 'center', marginBottom: 16 }} />
        <Text style={[s.title, isDark && { color: '#FFF' }]}>{isAr ? 'الشروط والأحكام' : 'Terms & Conditions'}</Text>
        <Text style={[s.body, isDark && { color: '#CCC' }]}>{terms}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F8F6F2' },
  title: { fontSize: 24, fontWeight: '800', color: '#1A1A1A', marginBottom: 16, textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 22, color: '#444' },
});
