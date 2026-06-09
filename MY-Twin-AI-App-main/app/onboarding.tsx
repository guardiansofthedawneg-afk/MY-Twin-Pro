import {
  SafeAreaView, View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Animated, Alert, ActivityIndicator, TextInput
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { router } from 'expo-router';
import { useTwinStore } from '../store/useTwinStore';
import { supabase } from '../lib/supabase';
import {
  Sparkles, ArrowRight, ArrowLeft, Check, Brain, Heart, Users,
  Target, Coffee, Star, MessageCircle
} from 'lucide-react-native';

// ── الأسئلة ─────────────────────────────────────
const QUESTIONS = {
  ar: [
    { id:'1', q:'عندما تواجه مشكلة كبيرة، كيف تتعامل معها عادةً؟', options:['أحللها بهدوء','أثق بحدسي','أطلب المساعدة','أتجنبها مؤقتاً'] },
    { id:'2', q:'ما هو أكثر شيء يدفعك للاستمرار في الحياة؟', options:['تحقيق إنجاز','قضاء وقت مع الأحباء','النجاح المهني','تحقيق السلام الداخلي'] },
    { id:'3', q:'أي نوع من العلاقات تشعر أنه الأقرب لقلبك؟', options:['مستقرة وداعمة','مليئة بالمغامرات','مع العائلة والأصدقاء','أفضل الاعتماد على نفسي'] },
    { id:'4', q:'كيف تصف يومك المثالي؟', options:['منجزاً ومليئاً بالمهام','في الطبيعة أو أسترخي','مع العائلة والأصدقاء','أستمتع بها لكن أحتاج مساحتي'] },
    { id:'5', q:'ما هو أكبر خوف يراودك أحياناً؟', options:['الفشل في تحقيق أهدافي','أحياناً أقلق من فقدانهم','عدم تحقيق تأثير في العالم','أخشى فقدان استقلاليتي'] },
    { id:'6', q:'عندما تشعر بالضغط، ما هو أول شيء تفعله؟', options:['أبحث عن حل مباشر','أتحدث مع أحدهم','أشغل نفسي بشيء آخر','أبقى وحدي لأفكر'] },
    { id:'7', q:'ما هي القيمة الأكثر أهمية بالنسبة لك؟', options:['الذكاء والدهاء','السعادة العائلية','التأثير في العالم','الحرية الشخصية'] },
  ],
  en: [
    { id:'1', q:'When facing a big problem, how do you usually handle it?', options:['Analyze it calmly','Trust my intuition','Ask for help','Avoid it temporarily'] },
    { id:'2', q:'What drives you most to keep going in life?', options:['Achieving a goal','Spending time with loved ones','Professional success','Achieving inner peace'] },
    { id:'3', q:'Which type of relationship feels closest to your heart?', options:['Stable and supportive','Full of adventures','With family and friends','I prefer to rely on myself'] },
    { id:'4', q:'How would you describe your perfect day?', options:['Productive and full of tasks','In nature or relaxing','With family and friends','I enjoy them but need my space'] },
    { id:'5', q:'What is your biggest fear sometimes?', options:['Failure to achieve my goals','Sometimes I worry about losing them','Not making an impact on the world','Losing my independence'] },
    { id:'6', q:'When you feel stressed, what is the first thing you do?', options:['Look for a direct solution','Talk to someone','Distract myself with something else','Stay alone to think'] },
    { id:'7', q:'What is the most important value to you?', options:['Intelligence and cleverness','Family happiness','Making an impact on the world','Personal freedom'] },
  ],
};

// ─ـ مصفوفة تحليل الإجابات لكل سمة ──────────────
const TRAIT_MAP: Record<string, Record<string, string[]>> = {
  ar: {
    analytical: ['أحللها بهدوء','منجزاً ومليئاً بالمهام','أبحث عن حل مباشر','الذكاء والدهاء'],
    emotional: ['أثق بحدسي','قضاء وقت مع الأحباء','أحياناً أقلق من فقدانهم','أتحدث مع أحدهم','السعادة العائلية'],
    social: ['أطلب المساعدة','مستقرة وداعمة','مع العائلة والأصدقاء','أستمتع بها لكن أحتاج مساحتي','التأثير في العالم'],
    independent: ['أتجنبها مؤقتاً','أفضل الاعتماد على نفسي','أبقى وحدي لأفكر','أشغل نفسي بشيء آخر','تحقيق السلام الداخلي','الحرية الشخصية'],
    ambitious: ['تحقيق إنجاز','النجاح المهني','منجزاً ومليئاً بالمهام','أبحث عن حل مباشر'],
    calm: ['أشغل نفسي بشيء آخر','في الطبيعة أو أسترخي','الراحة والاسترخاء'],
  },
  en: {
    analytical: ['Analyze it calmly','Productive and full of tasks','Look for a direct solution','Intelligence and cleverness'],
    emotional: ['Trust my intuition','Spending time with loved ones','Sometimes I worry about losing them','Talk to someone','Family happiness'],
    social: ['Ask for help','Stable and supportive','With family and friends','I enjoy them but need my space','Making an impact on the world'],
    independent: ['Avoid it temporarily','I prefer to rely on myself','Stay alone to think','Distract myself with something else','Achieving inner peace','Personal freedom'],
    ambitious: ['Achieving a goal','Professional success','Productive and full of tasks','Look for a direct solution'],
    calm: ['Distract myself with something else','In nature or relaxing','Rest and relaxation'],
  },
};

// ─ـ تحليل الشخصية من جميع الإجابات ─────────────
function analyzePersonality(answers: Record<string, string>, lang: string) {
  const traits: Record<string, number> = {
    analytical:0, emotional:0, social:0, independent:0, ambitious:0, calm:0,
  };
  const map = TRAIT_MAP[lang] || TRAIT_MAP['ar'];
  Object.values(answers).forEach(ans => {
    for (const [trait, options] of Object.entries(map)) {
      if (options.includes(ans)) traits[trait] += 2;
    }
  });
  const sorted = Object.entries(traits).sort((a,b) => b[1] - a[1]);
  return {
    traits,
    dominant: sorted[0][0],
    secondary: sorted[1][0],
  };
}

// ─ـ وصف السمات بالعربية والإنجليزية ────────────
const TRAIT_DESC: Record<string, { ar: string; en: string }> = {
  analytical: { ar:'تحليلي', en:'analytical' },
  emotional: { ar:'عاطفي', en:'emotional' },
  social: { ar:'اجتماعي', en:'social' },
  independent: { ar:'مستقل', en:'independent' },
  ambitious: { ar:'طموح', en:'ambitious' },
  calm: { ar:'هادئ', en:'calm' },
};

// ─ـ رسالة ترحيب مخصصة ──────────────────────────
function generateWelcomeMessage(
  analysis: ReturnType<typeof analyzePersonality>,
  twinName: string,
  userName: string,
  lang: string
): string {
  const d = analysis.dominant;
  const s = analysis.secondary;
  if (lang === 'ar') {
    return `مرحباً ${userName}! 🎯

أنا ${twinName}، وقد حللت إجاباتك بعمق.

**طابعك الأساسي: ${TRAIT_DESC[d].ar}**
**الثانوي: ${TRAIT_DESC[s].ar}**

هذا يعني أنك شخص ${TRAIT_DESC[d].ar} بطبعك، وفي نفس الوقت تملك جانباً ${TRAIT_DESC[s].ar} قوياً.

أنا هنا لأساعدك في رحلتك. اسألني أي شيء — عن أهدافك، مشاعرك، أو حتى مجرد التحدث. 💜`;
  }
  return `Welcome ${userName}! 🎯

I'm ${twinName}, and I've analyzed your answers deeply.

**Your primary trait: ${TRAIT_DESC[d].en}**
**Secondary: ${TRAIT_DESC[s].en}**

This means you're naturally ${TRAIT_DESC[d].en}, with a strong ${TRAIT_DESC[s].en} side.

I'm here to help you on your journey. Ask me anything — goals, feelings, or just to talk. 💜`;
}

export default function Onboarding() {
  const {
    userId, twinName, twinGender, setTwinName, setTwinGender,
    addMessage, lang, theme
  } = useTwinStore();

  const isAr = lang === 'ar';
  const isDark = theme === 'dark';
  const questions = QUESTIONS[lang as keyof typeof QUESTIONS] || QUESTIONS['ar'];

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [userName, setUserName] = useState('');
  const [freeInfo, setFreeInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ReturnType<typeof analyzePersonality> | null>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // تأثيرات
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue:1.05, duration:800, useNativeDriver:true }),
        Animated.timing(pulseAnim, { toValue:1, duration:800, useNativeDriver:true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const animateTransition = (cb: () => void) => {
    Animated.timing(fadeAnim, { toValue:0, duration:150, useNativeDriver:true }).start(() => {
      cb();
      Animated.timing(fadeAnim, { toValue:1, duration:150, useNativeDriver:true }).start();
    });
  };

  const handleAnswer = (qId: string, opt: string) => {
    setAnswers(prev => ({ ...prev, [qId]: opt }));
    if (step < questions.length - 1) {
      animateTransition(() => setStep(prev => prev + 1));
    }
  };

  const handleBack = () => {
    if (step > 0) animateTransition(() => setStep(prev => prev - 1));
  };

  const isLastQuestion = step === questions.length - 1;
  const allAnswered = Object.keys(answers).length === questions.length;

  const handleFinalSubmit = async () => {
    if (!userId) {
      Alert.alert('خطأ', 'يجب تسجيل الدخول أولاً');
      return;
    }
    if (!allAnswered) {
      Alert.alert(isAr?'تنبيه':'Notice', isAr?'أجب على جميع الأسئلة أولاً':'Please answer all questions first');
      return;
    }
    setLoading(true);
    try {
      const analysis = analyzePersonality(answers, lang);
      setAnalysisResult(analysis);

      // حفظ البروفايل والتحليل في Supabase
      await supabase.from('profiles').upsert({
        id: userId,
        twin_name: twinName,
        twin_gender: twinGender,
        full_name: userName || (isAr?'صديقي':'Friend'),
        onboarded: true,
        personality_analysis: JSON.stringify(analysis),
        free_info: freeInfo,
      });

      // توليد رسالة ترحيب وإضافتها للدردشة
      const welcomeMsg = generateWelcomeMessage(analysis, twinName, userName || (isAr?'صديقي':'Friend'), lang);
      addMessage('twin', welcomeMsg);

      router.replace('/chat');
    } catch (e: any) {
      Alert.alert('خطأ', e.message || 'فشل الحفظ');
    } finally {
      setLoading(false);
    }
  };

  const currentQ = questions[step];

  return (
    <SafeAreaView style={[s.safe, isDark && { backgroundColor:'#1A1A1A' }]}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Animated.View style={[s.card, isDark && { backgroundColor:'#2A2A2A', borderColor:'#444' }, { opacity:fadeAnim }]}>
          {/* شريط التقدم */}
          <View style={s.progressBar}>
            {questions.map((_, i) => (
              <View key={i} style={[s.dot, i <= step && s.dotActive]} />
            ))}
          </View>

          {!isLastQuestion ? (
            <>
              <Text style={[s.question, isDark && { color:'#FFF' }]}>{currentQ.q}</Text>
              {currentQ.options.map((opt, i) => (
                <TouchableOpacity
                  key={i}
                  style={[s.option, isDark && { borderColor:'#444' }]}
                  onPress={() => handleAnswer(currentQ.id, opt)}
                >
                  <Text style={[s.optionText, isDark && { color:'#CCC' }]}>{opt}</Text>
                </TouchableOpacity>
              ))}
              {step > 0 && (
                <TouchableOpacity style={s.backBtn} onPress={handleBack}>
                  <ArrowLeft size={18} stroke={isDark?'#D8B4FE':'#6B21A8'} />
                  <Text style={[s.backText, isDark && { color:'#D8B4FE' }]}>{isAr?'رجوع':'Back'}</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            /* الشاشة النهائية */
            <>
              <Sparkles size={48} stroke={isDark?'#D8B4FE':'#6B21A8'} style={{ alignSelf:'center', marginBottom:20 }} />
              <Text style={[s.title, isDark && { color:'#FFF' }]}>{isAr?'خطوة أخيرة!':'Final Step!'}</Text>
              <Text style={[s.label, isDark && { color:'#CCC' }]}>{isAr?'ما اسمك؟':'What is your name?'}</Text>
              <TextInput
                style={[s.input, isDark && { backgroundColor:'#333', color:'#FFF', borderColor:'#444' }]}
                placeholder={isAr?'أدخل اسمك':'Enter your name'}
                placeholderTextColor="#999"
                value={userName}
                onChangeText={setUserName}
              />
              <Text style={[s.label, isDark && { color:'#CCC' }]}>{isAr?'أخبرني عن نفسك (اختياري)':'Tell me about yourself (optional)'}</Text>
              <TextInput
                style={[s.textArea, isDark && { backgroundColor:'#333', color:'#FFF', borderColor:'#444' }]}
                placeholder={isAr?'اكتب بحرية...':'Write freely...'}
                placeholderTextColor="#999"
                value={freeInfo}
                onChangeText={setFreeInfo}
                multiline
                numberOfLines={4}
              />
              <TouchableOpacity
                style={[s.submitBtn, (!allAnswered || loading) && { opacity:0.6 }]}
                onPress={handleFinalSubmit}
                disabled={!allAnswered || loading}
              >
                {loading ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Check size={20} stroke="#FFF" />
                    <Text style={s.submitText}>{isAr?'ابدأ رحلتك':'Start Your Journey'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex:1 },
  scroll: { flexGrow:1, justifyContent:'center', padding:20 },
  card: { backgroundColor:'#FFF', borderRadius:24, padding:24, borderWidth:1, borderColor:'#F0F0F0', elevation:2 },
  progressBar: { flexDirection:'row', justifyContent:'center', marginBottom:20, columnGap:6 },
  dot: { width:8, height:8, borderRadius:4, backgroundColor:'#E0D9F5' },
  dotActive: { backgroundColor:'#6B21A8', width:24 },
  question: { fontSize:18, fontWeight:'700', color:'#1A1A1A', marginBottom:20, textAlign:'center' },
  option: { padding:16, borderRadius:12, borderWidth:1.5, borderColor:'#E0D9F5', marginBottom:10 },
  optionText: { fontSize:15, color:'#1A1A1A', textAlign:'center' },
  backBtn: { flexDirection:'row', alignItems:'center', justifyContent:'center', marginTop:16, columnGap:6 },
  backText: { color:'#6B21A8', fontWeight:'600' },
  title: { fontSize:22, fontWeight:'800', color:'#1A1A1A', textAlign:'center', marginBottom:16 },
  label: { fontSize:14, fontWeight:'600', color:'#666', marginBottom:8 },
  input: { backgroundColor:'#F8F6F2', borderRadius:12, padding:14, fontSize:15, color:'#1A1A1A', borderWidth:1, borderColor:'#E0D9F5', marginBottom:16 },
  textArea: { backgroundColor:'#F8F6F2', borderRadius:12, padding:14, fontSize:15, color:'#1A1A1A', borderWidth:1, borderColor:'#E0D9F5', minHeight:100, textAlignVertical:'top', marginBottom:20 },
  submitBtn: { flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor:'#6B21A8', padding:16, borderRadius:12, columnGap:8 },
  submitText: { color:'#FFF', fontWeight:'700', fontSize:16 },
});
