import {
  SafeAreaView, View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, Alert, Animated, Pressable
} from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  useTwinStore, TwinStyle, TwinGender, ReplyStyle
} from '../store/useTwinStore';
import {
  Palette, User, Save, Smile, Heart, Star, RotateCcw, Sparkles
} from 'lucide-react-native';

// ── ترجمات الصفات ──────────────────────────────
const STYLES = {
  ar: { supportive: 'داعم', coach: 'مدرب', wise: 'حكيم', fun: 'مرح', calm: 'هادئ' },
  en: { supportive: 'Supportive', coach: 'Coach', wise: 'Wise', fun: 'Fun', calm: 'Calm' },
};

const REPLY_LABELS = {
  ar: { short: 'مختصر', medium: 'متوسط', long: 'مفصل' },
  en: { short: 'Short', medium: 'Medium', long: 'Detailed' },
};

const GENDER_LABELS = {
  ar: { female: '♀ أنثى', male: '♂ ذكر' },
  en: { female: '♀ Female', male: '♂ Male' },
};

const TRAITS_OPTIONS = [
  'حنون', 'متفائل', 'ذكي', 'مخلص', 'صبور',
  'قوي', 'حساس', 'مغامر', 'عملي', 'خجول',
];

export default function Customize() {
  const {
    twinName, twinGender, twinStyle, replyStyle,
    twinTraits, setTwinName, setTwinGender, setTwinStyle,
    setReplyStyle, setTwinTraits, lang, theme,
  } = useTwinStore();

  const isAr = lang === 'ar';
  const isDark = theme === 'dark';
  const t = (ar: string, en: string) => isAr ? ar : en;

  const [name, setName] = useState(twinName || '');
  const [gender, setGender] = useState<TwinGender>(twinGender || 'female');
  const [style, setStyle] = useState<TwinStyle>(twinStyle || 'supportive');
  const [reply, setReply] = useState<ReplyStyle>(replyStyle || 'medium');
  const [selectedTraits, setSelectedTraits] = useState<string[]>(twinTraits || []);
  const [saved, setSaved] = useState(false);

  // مزامنة القيم من الـ Store عند تغيرها خارجياً
  useEffect(() => {
    setName(twinName || '');
    setGender(twinGender || 'female');
    setStyle(twinStyle || 'supportive');
    setReply(replyStyle || 'medium');
    setSelectedTraits(twinTraits || []);
  }, [twinName, twinGender, twinStyle, replyStyle, twinTraits]);

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      Alert.alert(t('خطأ', 'Error'), t('الرجاء إدخال اسم', 'Please enter a name'));
      return;
    }
    setTwinName(name.trim());
    setTwinGender(gender);
    setTwinStyle(style);
    setReplyStyle(reply);
    setTwinTraits(selectedTraits);
    setSaved(true);
    Alert.alert('✅', t('تم حفظ التغييرات', 'Changes saved'));
  }, [name, gender, style, reply, selectedTraits, setTwinName, setTwinGender, setTwinStyle, setReplyStyle, setTwinTraits, t]);

  const handleReset = () => {
    Alert.alert(
      t('إعادة التعيين', 'Reset'),
      t('هل تريد استعادة الإعدادات الافتراضية؟', 'Reset to default settings?'),
      [
        { text: t('إلغاء', 'Cancel'), style: 'cancel' },
        {
          text: t('تعيين', 'Reset'),
          onPress: () => {
            setTwinName('توأمك');
            setTwinGender('female');
            setTwinStyle('supportive');
            setReplyStyle('medium');
            setTwinTraits([]);
            setName('توأمك');
            setGender('female');
            setStyle('supportive');
            setReply('medium');
            setSelectedTraits([]);
          },
        },
      ]
    );
  };

  const toggleTrait = (trait: string) => {
    setSelectedTraits(prev => {
      if (prev.includes(trait)) return prev.filter(x => x !== trait);
      if (prev.length >= 5) {
        Alert.alert(t('تنبيه', 'Notice'), t('5 صفات كحد أقصى', 'Max 5 traits'));
        return prev;
      }
      return [...prev, trait];
    });
  };

  return (
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={[s.title, isDark && { color: '#FFF' }]}>
          {t('تخصيص التوأم', 'Customize Twin')}
        </Text>
        <Sparkles size={40} stroke={isDark ? '#D8B4FE' : '#6B21A8'} style={{ alignSelf: 'center', marginBottom: 20 }} />

        {/* الاسم */}
        <Text style={[s.label, isDark && { color: '#CCC' }]}>{t('الاسم', 'Name')}</Text>
        <View style={[s.inputRow, isDark && { backgroundColor: '#2A2A2A', borderColor: '#444' }]}>
          <User size={18} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
          <TextInput
            style={[s.input, isDark && { color: '#FFF' }]}
            value={name}
            onChangeText={setName}
            placeholder={t('أدخل الاسم', 'Enter name')}
            placeholderTextColor="#999"
            maxLength={20}
          />
        </View>

        {/* النوع */}
        <Text style={[s.label, isDark && { color: '#CCC' }]}>{t('النوع', 'Gender')}</Text>
        <View style={s.optionsRow}>
          {(['female', 'male'] as TwinGender[]).map(g => (
            <TouchableOpacity
              key={g}
              style={[s.option, gender === g && s.activeOption, isDark && { borderColor: gender === g ? '#D8B4FE' : '#444' }]}
              onPress={() => setGender(g)}
            >
              <Text style={[s.optionText, gender === g && s.activeText]}>
                {GENDER_LABELS[lang][g]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* أسلوب الرد */}
        <Text style={[s.label, isDark && { color: '#CCC' }]}>{t('طريقة الكلام', 'Reply Style')}</Text>
        <View style={s.optionsRow}>
          {(['short', 'medium', 'long'] as ReplyStyle[]).map(r => (
            <TouchableOpacity
              key={r}
              style={[s.option, reply === r && s.activeOption, isDark && { borderColor: reply === r ? '#D8B4FE' : '#444' }]}
              onPress={() => setReply(r)}
            >
              <Text style={[s.optionText, reply === r && s.activeText]}>
                {REPLY_LABELS[lang][r]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* نمط الشخصية */}
        <Text style={[s.label, isDark && { color: '#CCC' }]}>{t('نمط الشخصية', 'Personality Style')}</Text>
        <View style={s.optionsRow}>
          {(Object.keys(STYLES[lang]) as TwinStyle[]).map(sk => (
            <TouchableOpacity
              key={sk}
              style={[s.option, style === sk && s.activeOption, isDark && { borderColor: style === sk ? '#D8B4FE' : '#444' }]}
              onPress={() => setStyle(sk)}
            >
              <Text style={[s.optionText, style === sk && s.activeText]}>
                {STYLES[lang][sk] || sk}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* صفات التوأم */}
        <Text style={[s.label, isDark && { color: '#CCC' }]}>{t('صفات التوأم', 'Twin Traits')}</Text>
        <View style={s.optionsRow}>
          {TRAITS_OPTIONS.map(trait => (
            <TouchableOpacity
              key={trait}
              style={[
                s.option,
                selectedTraits.includes(trait) && s.activeOption,
                isDark && { borderColor: selectedTraits.includes(trait) ? '#D8B4FE' : '#444' }
              ]}
              onPress={() => toggleTrait(trait)}
            >
              <Text style={[s.optionText, selectedTraits.includes(trait) && s.activeText]}>
                {trait}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* أزرار الحفظ وإعادة التعيين */}
        <View style={s.btnRow}>
          <TouchableOpacity style={[s.saveBtn, saved && { backgroundColor: '#10B981' }]} onPress={handleSave}>
            {saved ? (
              <Sparkles size={18} stroke="#FFF" />
            ) : (
              <Save size={18} stroke="#FFF" />
            )}
            <Text style={s.saveText}>
              {t('حفظ التغييرات', 'Save Changes')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.resetBtn, isDark && { borderColor: '#444' }]} onPress={handleReset}>
            <RotateCcw size={18} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
            <Text style={[s.resetText, isDark && { color: '#D8B4FE' }]}>
              {t('استعادة الافتراضي', 'Reset')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: '#1A1A1A', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8, marginTop: 16 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 14,
    borderRadius: 12, borderWidth: 1, borderColor: '#F0F0F0', marginBottom: 4,
  },
  input: { flex: 1, fontSize: 15, color: '#1A1A1A' },
  optionsRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    // gap replacement:
    marginHorizontal: -4,
  },
  option: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5,
    borderColor: '#E0D9F5', backgroundColor: '#FFF',
    marginHorizontal: 4, marginBottom: 8,
  },
  activeOption: { borderColor: '#6B21A8', backgroundColor: '#F3F0FF' },
  optionText: { fontSize: 13, color: '#666', fontWeight: '500' },
  activeText: { color: '#6B21A8', fontWeight: '700' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 32 },
  saveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#6B21A8', padding: 16, borderRadius: 12,
    // gap replaced by columnGap in flex container? Not needed for row with gap, we use flex and margin
  },
  saveText: { color: '#FFF', fontWeight: '700', fontSize: 16, marginLeft: 8 },
  resetBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent', padding: 16, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E0D9F5',
  },
  resetText: { color: '#6B21A8', fontWeight: '700', fontSize: 16, marginLeft: 8 },
});
