import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { API } from '../lib/api';
import { useTwinStore, type TwinGender } from '../store/useTwinStore';
import { Brain, ArrowRight, User, Sparkles } from 'lucide-react-native';
import { track } from '../lib/analytics';

const QUESTIONS = [
  { id: 1, q: 'عندما تواجه مشكلة صعبة، كيف تتصرف عادةً؟', o: ['أحللها بهدوء', 'أثق بحدسي', 'أطلب المساعدة', 'أتجنبها مؤقتاً'] },
  { id: 2, q: 'ما هو أكثر شيء يمنحك الطاقة والإيجابية؟', o: ['تحقيق إنجاز', 'قضاء وقت مع الأحباء', 'اكتشاف شيء جديد', 'الراحة والاسترخاء'] },
  { id: 3, q: 'كيف تصف علاقاتك مع الأشخاص المقربين منك؟', o: ['مستقرة وداعمة', 'أحياناً أقلق من فقدانهم', 'أستمتع بها لكن أحتاج مساحتي', 'أفضل الاعتماد على نفسي'] },
  { id: 4, q: 'عندما تشعر بالحزن أو الضيق، ما هو أول شيء تفعله؟', o: ['أتحدث مع أحدهم', 'أبقى وحدي لأفكر', 'أشغل نفسي بشيء آخر', 'أبحث عن حل مباشر'] },
  { id: 5, q: 'ما هو أكبر حلم أو طموح تسعى لتحقيقه؟', o: ['النجاح المهني', 'السعادة العائلية', 'التأثير في العالم', 'تحقيق السلام الداخلي'] },
  { id: 6, q: 'كيف تفضل أن تقضي يومك المثالي؟', o: ['منجزاً ومليئاً بالمهام', 'مع العائلة والأصدقاء', 'أتعلم أو أقرأ شيئاً جديداً', 'في الطبيعة أو أسترخي'] },
  { id: 7, q: 'ما هي الصفة التي تقدرها أكثر في الآخرين؟', o: ['الصدق والوفاء', 'الذكاء والدهاء', 'اللطف والتعاطف', 'القوة والاستقلالية'] },
];

function analyzePersonality(answers: Record<string, string>) {
  const traits: Record<string, number> = { analytical: 0, emotional: 0, social: 0, independent: 0, ambitious: 0, calm: 0 };
  if (answers['1'] === 'أحللها بهدوء') traits.analytical += 2;
  if (answers['2'] === 'تحقيق إنجاز') traits.ambitious += 2;
  if (answers['3'] === 'مستقرة وداعمة') traits.social += 2;
  const dominant = Object.entries(traits).sort((a, b) => b[1] - a[1])[0][0];
  return { traits, dominant_type: dominant.toUpperCase() };
}

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionStep, setQuestionStep] = useState(0);
  const [freeInfo, setFreeInfo] = useState('');
  const [twinGender, setTwinGender] = useState<TwinGender>('female');
  const [userName, setUserName] = useState('');
  const [twinName, setTwinName] = useState('');
  const [loading, setLoading] = useState(false);
  const { userId, theme } = useTwinStore();
  const isDark = theme === 'dark';

  const pickAnswer = (answer: string) => {
    setAnswers({ ...answers, [questionStep + 1]: answer });
    if (questionStep < QUESTIONS.length - 1) setQuestionStep(questionStep + 1);
    else setStep(2);
  };

  const handleFinalSubmit = async () => {
    if (!userName || !twinName) { Alert.alert('خطأ', 'يرجى ملء جميع الحقول'); return; }
    setLoading(true);
    try {
      const analysis = analyzePersonality(answers);
      await supabase.from('profiles').upsert({ id: userId, twin_name: twinName, twin_gender: twinGender, full_name: userName, onboarded: true });
      track('onboarding_completed', { personality_type: analysis.dominant_type });
      // إرسال رسالة تحليل الشخصية تلقائياً
      try {
        await API.post('/api/chat', { message: `مرحباً! أنا ${userName}. تم تحليل شخصيتي: ${analysis.dominant_type}. صفاتي: ${JSON.stringify(analysis.traits)}`, twin_name: twinName, bond_level: 0, dims: {} });
      } catch (e) {}
      setStep(6);
    } catch { Alert.alert('خطأ', 'لم نتمكن من حفظ بياناتك'); }
    finally { setLoading(false); setStep(6); }
  };

  const skip = () => setStep(6);

  if (loading) return (
    <SafeAreaView style={[s.center, isDark && { backgroundColor: '#1A1A1A' }]}>
      <ActivityIndicator size="large" color="#6B21A8" />
      <Text style={[s.loadingText, isDark && { color: '#FFF' }]}>جاري إعداد توأمك...</Text>
    </SafeAreaView>
  );

  if (step === 6) return (
    <SafeAreaView style={[s.center, isDark && { backgroundColor: '#1A1A1A' }]}>
      <Sparkles size={64} stroke="#6B21A8" style={{ marginBottom: 16 }} />
      <Text style={[s.welcomeTitle, isDark && { color: '#FFF' }]}>مرحباً {userName || 'بك'}!</Text>
      <Text style={[s.welcomeSub, isDark && { color: '#CCC' }]}>أنا {twinName || 'توأمك'}، {twinGender === 'female' ? 'رفيقتك' : 'رفيقك'} الرقمي.</Text>
      <TouchableOpacity style={s.primaryBtn} onPress={() => router.replace('/chat')}>
        <ArrowRight size={18} stroke="#FFF" />
        <Text style={s.primaryBtnText}>ابدأ الرحلة</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={[s.container, isDark && { backgroundColor: '#1A1A1A' }]}>
      <ScrollView contentContainerStyle={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <TouchableOpacity style={s.skipBtn} onPress={skip}><Text style={s.skipText}>تخطي ←</Text></TouchableOpacity>

        {step === 1 && (<>
          <Text style={[s.progress, isDark && { color: '#CCC' }]}>{questionStep + 1} / {QUESTIONS.length}</Text>
          <View style={s.progressBar}><View style={[s.progressFill, { width: `${((questionStep + 1) / QUESTIONS.length) * 100}%` }]} /></View>
          <Brain size={32} stroke={isDark ? '#D8B4FE' : '#6B21A8'} style={{ alignSelf: 'center', marginBottom: 16 }} />
          <Text style={[s.question, isDark && { color: '#FFF' }]}>{QUESTIONS[questionStep].q}</Text>
          {QUESTIONS[questionStep].o.map((opt, i) => (
            <TouchableOpacity key={i} style={[s.option, isDark && { backgroundColor: '#2A2A2A', borderColor: '#444' }]} onPress={() => pickAnswer(opt)}>
              <Text style={[s.optionText, isDark && { color: '#FFF' }]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </>)}

        {step === 2 && (<>
          <Text style={[s.sectionTitle, isDark && { color: '#FFF' }]}>هل هناك شيء تريد أن يعرفه توأمك عنك؟</Text>
          <TextInput style={[s.textArea, isDark && { backgroundColor: '#2A2A2A', borderColor: '#444', color: '#FFF' }]} multiline numberOfLines={6} placeholder="مثلاً: أحب القهوة..." placeholderTextColor="#999" value={freeInfo} onChangeText={setFreeInfo} />
          <TouchableOpacity style={s.primaryBtn} onPress={() => setStep(3)}><Text style={s.primaryBtnText}>متابعة</Text></TouchableOpacity>
        </>)}

        {step === 3 && (<>
          <Text style={[s.sectionTitle, isDark && { color: '#FFF' }]}>اختر جنس توأمك</Text>
          <View style={s.genderRow}>
            {(['female', 'male'] as TwinGender[]).map(g => (
              <TouchableOpacity key={g} style={[s.genderCard, twinGender === g && s.selectedCard, isDark && { backgroundColor: '#2A2A2A', borderColor: twinGender === g ? '#D8B4FE' : '#444' }]} onPress={() => setTwinGender(g)}>
                <Text style={{ fontSize: 48 }}>{g === 'female' ? '👩' : '👨'}</Text>
                <Text style={[s.genderText, isDark && { color: '#FFF' }]}>{g === 'female' ? 'أنثى' : 'ذكر'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={s.primaryBtn} onPress={() => setStep(4)}><Text style={s.primaryBtnText}>متابعة</Text></TouchableOpacity>
        </>)}

        {step === 4 && (<>
          <Text style={[s.sectionTitle, isDark && { color: '#FFF' }]}>أخبرنا عنك وعن توأمك</Text>
          <TextInput style={[s.input, isDark && { backgroundColor: '#2A2A2A', borderColor: '#444', color: '#FFF' }]} placeholder="اسمك" placeholderTextColor="#999" value={userName} onChangeText={setUserName} />
          <TextInput style={[s.input, isDark && { backgroundColor: '#2A2A2A', borderColor: '#444', color: '#FFF' }]} placeholder="اسم توأمك" placeholderTextColor="#999" value={twinName} onChangeText={setTwinName} />
          <TouchableOpacity style={[s.primaryBtn, (!userName || !twinName) && { opacity: 0.5 }]} onPress={handleFinalSubmit} disabled={!userName || !twinName}>
            <Text style={s.primaryBtnText}>إنشاء توأمي</Text>
          </TouchableOpacity>
        </>)}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F6F2' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { marginTop: 16, fontSize: 15, color: '#666' },
  welcomeTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  welcomeSub: { fontSize: 16, textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  skipBtn: { position: 'absolute', top: 20, right: 20, padding: 8, zIndex: 10 },
  skipText: { color: '#6B21A8', fontSize: 15, fontWeight: '600' },
  progress: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 8 },
  progressBar: { height: 4, backgroundColor: '#E0D9F5', borderRadius: 2, marginBottom: 32 },
  progressFill: { height: '100%', backgroundColor: '#6B21A8', borderRadius: 2 },
  question: { fontSize: 22, fontWeight: '600', color: '#1A1A1A', textAlign: 'center', marginBottom: 32 },
  option: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E0D9F5' },
  optionText: { color: '#1A1A1A', textAlign: 'center', fontSize: 15 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', textAlign: 'center', marginBottom: 24 },
  textArea: { backgroundColor: '#FFF', color: '#1A1A1A', padding: 16, borderRadius: 12, fontSize: 15, minHeight: 120, marginBottom: 24, borderWidth: 1, borderColor: '#E0D9F5' },
  input: { backgroundColor: '#FFF', color: '#1A1A1A', padding: 16, borderRadius: 12, fontSize: 15, marginBottom: 16, borderWidth: 1, borderColor: '#E0D9F5' },
  genderRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 32 },
  genderCard: { flex: 1, padding: 24, borderRadius: 16, backgroundColor: '#FFF', alignItems: 'center', borderWidth: 2, borderColor: '#E0D9F5' },
  selectedCard: { borderColor: '#6B21A8', backgroundColor: '#F3F0FF' },
  genderText: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginTop: 8 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#6B21A8', padding: 16, borderRadius: 14 },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
