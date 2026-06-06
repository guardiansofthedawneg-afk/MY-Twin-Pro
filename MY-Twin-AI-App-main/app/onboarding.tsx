import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, TextInput, Animated } from 'react-native';
import { router } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { API } from '../lib/api';
import { useTwinStore, type TwinGender } from '../store/useTwinStore';
import { Brain, ArrowRight, User, Sparkles, Heart, MessageCircle } from 'lucide-react-native';

const QUESTIONS = {
  ar: [
    { id: 1, q: 'عندما تواجه مشكلة صعبة، كيف تتصرف عادةً؟', o: ['أحللها بهدوء', 'أثق بحدسي', 'أطلب المساعدة', 'أتجنبها مؤقتاً'] },
    { id: 2, q: 'ما هو أكثر شيء يمنحك الطاقة والإيجابية؟', o: ['تحقيق إنجاز', 'قضاء وقت مع الأحباء', 'اكتشاف شيء جديد', 'الراحة والاسترخاء'] },
    { id: 3, q: 'كيف تصف علاقاتك مع الأشخاص المقربين منك؟', o: ['مستقرة وداعمة', 'أحياناً أقلق من فقدانهم', 'أستمتع بها لكن أحتاج مساحتي', 'أفضل الاعتماد على نفسي'] },
    { id: 4, q: 'عندما تشعر بالحزن أو الضيق، ما هو أول شيء تفعله؟', o: ['أتحدث مع أحدهم', 'أبقى وحدي لأفكر', 'أشغل نفسي بشيء آخر', 'أبحث عن حل مباشر'] },
    { id: 5, q: 'ما هو أكبر حلم أو طموح تسعى لتحقيقه؟', o: ['النجاح المهني', 'السعادة العائلية', 'التأثير في العالم', 'تحقيق السلام الداخلي'] },
    { id: 6, q: 'كيف تفضل أن تقضي يومك المثالي؟', o: ['منجزاً ومليئاً بالمهام', 'مع العائلة والأصدقاء', 'أتعلم أو أقرأ شيئاً جديداً', 'في الطبيعة أو أسترخي'] },
    { id: 7, q: 'ما هي الصفة التي تقدرها أكثر في الآخرين؟', o: ['الصدق والوفاء', 'الذكاء والدهاء', 'اللطف والتعاطف', 'القوة والاستقلالية'] },
  ],
  en: [
    { id: 1, q: 'When you face a difficult problem, how do you usually react?', o: ['Analyze it calmly', 'Trust my intuition', 'Ask for help', 'Avoid it temporarily'] },
    { id: 2, q: 'What gives you the most energy and positivity?', o: ['Achieving a goal', 'Spending time with loved ones', 'Discovering something new', 'Rest and relaxation'] },
    { id: 3, q: 'How would you describe your relationships with close ones?', o: ['Stable and supportive', 'Sometimes I worry about losing them', 'I enjoy them but need my space', 'I prefer to rely on myself'] },
    { id: 4, q: 'When you feel sad or upset, what is the first thing you do?', o: ['Talk to someone', 'Stay alone to think', 'Distract myself with something else', 'Look for a direct solution'] },
    { id: 5, q: 'What is your biggest dream or ambition?', o: ['Professional success', 'Family happiness', 'Making an impact on the world', 'Achieving inner peace'] },
    { id: 6, q: 'How do you prefer to spend your perfect day?', o: ['Productive and full of tasks', 'With family and friends', 'Learning or reading something new', 'In nature or relaxing'] },
    { id: 7, q: 'What quality do you value most in others?', o: ['Honesty and loyalty', 'Intelligence and cleverness', 'Kindness and empathy', 'Strength and independence'] },
  ],
};

function analyzePersonality(answers: Record<string, string>, lang: string) {
  const traits: Record<string, number> = { analytical: 0, emotional: 0, social: 0, independent: 0, ambitious: 0, calm: 0 };
  if (lang === 'ar') {
    if (answers['1'] === 'أحللها بهدوء') traits.analytical += 2;
    if (answers['2'] === 'تحقيق إنجاز') traits.ambitious += 2;
    if (answers['3'] === 'مستقرة وداعمة') traits.social += 2;
  } else {
    if (answers['1'] === 'Analyze it calmly') traits.analytical += 2;
    if (answers['2'] === 'Achieving a goal') traits.ambitious += 2;
    if (answers['3'] === 'Stable and supportive') traits.social += 2;
  }
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
  const { userId, lang, theme } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = theme === 'dark';
  const questions = QUESTIONS[lang] || QUESTIONS['ar'];
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.15, duration: 1200, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
    ])).start();
  }, []);

  const translateY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });
  const scale = pulseAnim;

  const pickAnswer = (answer: string) => {
    setAnswers({ ...answers, [questionStep + 1]: answer });
    if (questionStep < questions.length - 1) setQuestionStep(questionStep + 1);
    else setStep(2);
  };

  const handleFinalSubmit = async () => {
    if (!userName || !twinName) { Alert.alert(isAr ? 'خطأ' : 'Error', isAr ? 'يرجى ملء جميع الحقول' : 'Please fill all fields'); return; }
    setLoading(true);
    try {
      const analysis = analyzePersonality(answers, lang);
      await supabase.from('profiles').upsert({ id: userId, twin_name: twinName, twin_gender: twinGender, full_name: userName, onboarded: true });
      await API.post('/api/chat', {
        message: isAr
          ? `مرحباً ${userName}! أنا ${twinName}. بناءً على إجاباتك، شخصيتك من نوع ${analysis.dominant_type}. سأكون مرآتك الحكيمة ورفيقك الدائم 💜`
          : `Hello ${userName}! I'm ${twinName}. Based on your answers, your personality type is ${analysis.dominant_type}. I'll be your wise mirror and constant companion 💜`,
        twin_name: twinName,
        bond_level: 0,
        dims: {},
        history: [],
      });
      setStep(6);
    } catch { Alert.alert(isAr ? 'خطأ' : 'Error', isAr ? 'لم نتمكن من حفظ بياناتك' : 'Could not save your data'); }
    finally { setLoading(false); setStep(6); }
  };

  const skip = () => setStep(6);

  if (loading) return (
    <SafeAreaView style={[s.center, isDark && { backgroundColor: '#1A1A1A' }]}>
      <ActivityIndicator size="large" color="#6B21A8" />
      <Text style={[s.loadingText, isDark && { color: '#FFF' }]}>{isAr ? 'جاري إعداد توأمك...' : 'Preparing your twin...'}</Text>
    </SafeAreaView>
  );

  if (step === 6) return (
    <SafeAreaView style={[s.center, isDark && { backgroundColor: '#1A1A1A' }]}>
      <Animated.View style={{ transform: [{ scale }, { translateY }], marginBottom: 16 }}>
        <View style={s.logoCircle}>
          <Heart size={40} stroke="#6B21A8" fill="#F3F0FF" />
        </View>
      </Animated.View>
      <Text style={[s.welcomeTitle, isDark && { color: '#FFF' }]}>
        {isAr ? `مرحباً ${userName || 'بك'}!` : `Welcome ${userName || 'you'}!`}
      </Text>
      <Text style={[s.welcomeSub, isDark && { color: '#CCC' }]}>
        {isAr
          ? `أنا ${twinName || 'توأمك'}، ${twinGender === 'female' ? 'رفيقتك' : 'رفيقك'} الرقمي.`
          : `I'm ${twinName || 'your twin'}, your digital ${twinGender === 'female' ? 'companion' : 'companion'}.`}
      </Text>
      <TouchableOpacity style={s.primaryBtn} onPress={() => router.replace('/chat')}>
        <ArrowRight size={18} stroke="#FFF" />
        <Text style={s.primaryBtnText}>{isAr ? 'ابدأ الرحلة' : 'Start the journey'}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={[s.container, isDark && { backgroundColor: '#1A1A1A' }]}>
      <ScrollView contentContainerStyle={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <TouchableOpacity style={s.skipBtn} onPress={skip}><Text style={s.skipText}>{isAr ? 'تخطي ←' : 'Skip →'}</Text></TouchableOpacity>

        {/* شخصية التوأم المتحركة */}
        <Animated.View style={{ transform: [{ scale }, { translateY }], alignSelf: 'center', marginBottom: 20 }}>
          <View style={s.mascotCircle}>
            <MessageCircle size={36} stroke="#6B21A8" fill="#F3F0FF" />
          </View>
        </Animated.View>

        {step === 1 && (<>
          <Text style={[s.progress, isDark && { color: '#CCC' }]}>{questionStep + 1} / {questions.length}</Text>
          <View style={s.progressBar}><View style={[s.progressFill, { width: `${((questionStep + 1) / questions.length) * 100}%` }]} /></View>
          <Text style={[s.question, isDark && { color: '#FFF' }]}>{questions[questionStep].q}</Text>
          {questions[questionStep].o.map((opt, i) => (
            <TouchableOpacity key={i} style={[s.option, isDark && { backgroundColor: '#2A2A2A', borderColor: '#444' }]} onPress={() => pickAnswer(opt)}>
              <Text style={[s.optionText, isDark && { color: '#FFF' }]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </>)}

        {step === 2 && (<>
          <Text style={[s.sectionTitle, isDark && { color: '#FFF' }]}>
            {isAr ? 'هل هناك شيء تريد أن يعرفه توأمك عنك؟' : 'Is there anything you want your twin to know about you?'}
          </Text>
          <TextInput style={[s.textArea, isDark && { backgroundColor: '#2A2A2A', borderColor: '#444', color: '#FFF' }]} multiline numberOfLines={6} placeholder={isAr ? 'مثلاً: أحب القهوة...' : 'e.g. I love coffee...'} placeholderTextColor="#999" value={freeInfo} onChangeText={setFreeInfo} />
          <TouchableOpacity style={s.primaryBtn} onPress={() => setStep(3)}><Text style={s.primaryBtnText}>{isAr ? 'متابعة' : 'Continue'}</Text></TouchableOpacity>
        </>)}

        {step === 3 && (<>
          <Text style={[s.sectionTitle, isDark && { color: '#FFF' }]}>{isAr ? 'اختر جنس توأمك' : 'Choose your twin gender'}</Text>
          <View style={s.genderRow}>
            {(['female', 'male'] as TwinGender[]).map(g => (
              <TouchableOpacity key={g} style={[s.genderCard, twinGender === g && s.selectedCard, isDark && { backgroundColor: '#2A2A2A', borderColor: twinGender === g ? '#D8B4FE' : '#444' }]} onPress={() => setTwinGender(g)}>
                <View style={s.genderIconCircle}>
                  <User size={32} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
                </View>
                <Text style={[s.genderText, isDark && { color: '#FFF' }]}>{g === 'female' ? (isAr ? 'أنثى' : 'Female') : (isAr ? 'ذكر' : 'Male')}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={s.primaryBtn} onPress={() => setStep(4)}><Text style={s.primaryBtnText}>{isAr ? 'متابعة' : 'Continue'}</Text></TouchableOpacity>
        </>)}

        {step === 4 && (<>
          <Text style={[s.sectionTitle, isDark && { color: '#FFF' }]}>{isAr ? 'أخبرنا عنك وعن توأمك' : 'Tell us about you and your twin'}</Text>
          <TextInput style={[s.input, isDark && { backgroundColor: '#2A2A2A', borderColor: '#444', color: '#FFF' }]} placeholder={isAr ? 'اسمك' : 'Your name'} placeholderTextColor="#999" value={userName} onChangeText={setUserName} />
          <TextInput style={[s.input, isDark && { backgroundColor: '#2A2A2A', borderColor: '#444', color: '#FFF' }]} placeholder={isAr ? 'اسم توأمك' : 'Your twin name'} placeholderTextColor="#999" value={twinName} onChangeText={setTwinName} />
          <TouchableOpacity style={[s.primaryBtn, (!userName || !twinName) && { opacity: 0.5 }]} onPress={handleFinalSubmit} disabled={!userName || !twinName}>
            <Text style={s.primaryBtnText}>{isAr ? 'إنشاء توأمي' : 'Create My Twin'}</Text>
          </TouchableOpacity>
        </>)}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F6F2' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  mascotCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3F0FF', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#D8B4FE', shadowColor: '#6B21A8', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  logoCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#F3F0FF', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#6B21A8', shadowColor: '#6B21A8', shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  loadingText: { marginTop: 16, fontSize: 15, color: '#666' },
  welcomeTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  welcomeSub: { fontSize: 16, textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  skipBtn: { position: 'absolute', top: 20, right: 20, padding: 8, zIndex: 10 },
  skipText: { color: '#6B21A8', fontSize: 15, fontWeight: '600' },
  progress: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 8 },
  progressBar: { height: 4, backgroundColor: '#E0D9F5', borderRadius: 2, marginBottom: 32 },
  progressFill: { height: '100%', backgroundColor: '#6B21A8', borderRadius: 2 },
  question: { fontSize: 22, fontWeight: '600', color: '#1A1A1A', textAlign: 'center', marginBottom: 32 },
  option: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E0D9F5', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  optionText: { color: '#1A1A1A', textAlign: 'center', fontSize: 15 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', textAlign: 'center', marginBottom: 24 },
  textArea: { backgroundColor: '#FFF', color: '#1A1A1A', padding: 16, borderRadius: 12, fontSize: 15, minHeight: 120, marginBottom: 24, borderWidth: 1, borderColor: '#E0D9F5' },
  input: { backgroundColor: '#FFF', color: '#1A1A1A', padding: 16, borderRadius: 12, fontSize: 15, marginBottom: 16, borderWidth: 1, borderColor: '#E0D9F5' },
  genderRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 32 },
  genderCard: { flex: 1, padding: 24, borderRadius: 16, backgroundColor: '#FFF', alignItems: 'center', borderWidth: 2, borderColor: '#E0D9F5' },
  selectedCard: { borderColor: '#6B21A8', backgroundColor: '#F3F0FF' },
  genderIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F3F0FF', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  genderText: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#6B21A8', padding: 16, borderRadius: 14, shadowColor: '#6B21A8', shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
