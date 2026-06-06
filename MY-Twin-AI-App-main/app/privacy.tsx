import { SafeAreaView, ScrollView, Text, StyleSheet } from 'react-native';
import { useTwinStore } from '../store/useTwinStore';
import { Shield } from 'lucide-react-native';

export default function Privacy() {
  const { lang, theme } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = theme === 'dark';

  const policy = isAr ? `
  سياسة الخصوصية والشروط – MyTwin
  
  آخر تحديث: يونيو 2026
  
  1. جمع البيانات: نجمع فقط البيانات الضرورية لتشغيل التطبيق (البريد الإلكتروني، الاسم، تفضيلات التوأم). لا نبيع بياناتك لأي طرف ثالث.
  
  2. المحادثات: جميع محادثاتك مشفرة ومخزنة بشكل آمن على خوادم Supabase. لا يطلع عليها أي شخص آخر.
  
  3. الذكاء الاصطناعي: يستخدم MyTwin نماذج ذكاء اصطناعي متعددة (Gemini، Groq، OpenRouter). قد تتم معالجة بعض الرسائل على خوادم هذه النماذج وفقًا لسياسات الخصوصية الخاصة بها.
  
  4. الصوت: عند استخدام ميزة الصوت، يتم تحويل النص إلى كلام باستخدام Edge TTS أو ElevenLabs. لا يتم تخزين التسجيلات الصوتية.
  
  5. ملفات تعريف الارتباط: لا نستخدم ملفات تعريف ارتباط.
  
  6. حقوق المستخدم: يمكنك طلب حذف حسابك وجميع بياناتك في أي وقت من خلال الإعدادات.
  
  7. الامتثال القانوني: تلتزم Soul Sync Ltd. بكافة القوانين واللوائح الدولية المتعلقة بحماية البيانات والخصوصية، بما في ذلك اللائحة العامة لحماية البيانات (GDPR) وقانون خصوصية المستهلك في كاليفورنيا (CCPA).
  
  8. تحديد المسؤولية: يتم توفير التطبيق "كما هو". لا تتحمل Soul Sync Ltd. أي مسؤولية عن أي أضرار ناتجة عن استخدام التطبيق. المستخدم هو المسؤول الوحيد عن تفاعلاته مع التوأم الرقمي.
  
  9. الاتصال: للأسئلة حول الخصوصية، راسلنا على support@mytwin.app.
  ` : `
  Privacy Policy & Terms – MyTwin
  
  Last updated: June 2026
  
  1. Data Collection: We collect only data necessary to operate the app (email, name, twin preferences). We do not sell your data to third parties.
  
  2. Chats: All your chats are encrypted and stored securely on Supabase servers. No one else has access.
  
  3. AI: MyTwin uses multiple AI models (Gemini, Groq, OpenRouter). Some messages may be processed on these models' servers according to their privacy policies.
  
  4. Voice: When using voice features, text-to-speech is processed via Edge TTS or ElevenLabs. Voice recordings are not stored.
  
  5. Cookies: We do not use cookies.
  
  6. User Rights: You can request deletion of your account and all data at any time via Settings.
  
  7. Legal Compliance: Soul Sync Ltd. complies with all international data protection and privacy laws, including GDPR and CCPA.
  
  8. Limitation of Liability: The app is provided "as is". Soul Sync Ltd. is not liable for any damages arising from the use of the app. The user is solely responsible for their interactions with the digital twin.
  
  9. Contact: For privacy questions, email support@mytwin.app.
  `;

  return (
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
      <ScrollView style={s.container} contentContainerStyle={{ padding: 20 }}>
        <Shield size={40} stroke={isDark ? '#D8B4FE' : '#6B21A8'} style={{ alignSelf: 'center', marginBottom: 16 }} />
        <Text style={[s.title, isDark && { color: '#FFF' }]}>{isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}</Text>
        <Text style={[s.body, isDark && { color: '#CCC' }]}>{policy}</Text>
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
