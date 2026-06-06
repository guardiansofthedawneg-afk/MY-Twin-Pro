import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { useState } from 'react';
import { useTwinStore, TwinStyle, TwinGender, ReplyStyle } from '../store/useTwinStore';
import { Palette, User, Save } from 'lucide-react-native';

const STYLES = {
  ar: { supportive: 'داعم', coach: 'مدرب', wise: 'حكيم', fun: 'مرح', calm: 'هادئ' },
  en: { supportive: 'Supportive', coach: 'Coach', wise: 'Wise', fun: 'Fun', calm: 'Calm' },
};

export default function Customize() {
  const { twinName, twinGender, twinStyle, replyStyle, setTwinName, setTwinGender, setTwinStyle, setReplyStyle, lang, theme } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = theme === 'dark';
  const t = (ar: string, en: string) => isAr ? ar : en;

  const [name, setName] = useState(twinName || '');
  const [gender, setGender] = useState<TwinGender>(twinGender || 'female');
  const [style, setStyle] = useState<TwinStyle>(twinStyle || 'supportive');
  const [reply, setReply] = useState<ReplyStyle>(replyStyle || 'medium');

  const handleSave = () => {
    if (!name.trim()) { Alert.alert(t('خطأ','Error'), t('الرجاء إدخال اسم','Please enter a name')); return; }
    setTwinName(name.trim());
    setTwinGender(gender);
    setTwinStyle(style);
    setReplyStyle(reply);
    Alert.alert('✅', t('تم حفظ التغييرات','Changes saved'));
  };

  return (
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={[s.title, isDark && { color: '#FFF' }]}>{t('تخصيص التوأم','Customize Twin')}</Text>
        <Palette size={40} stroke={isDark ? '#D8B4FE' : '#6B21A8'} style={{ alignSelf: 'center', marginBottom: 20 }} />

        <Text style={[s.label, isDark && { color: '#CCC' }]}>{t('الاسم','Name')}</Text>
        <View style={[s.inputRow, isDark && { backgroundColor: '#2A2A2A', borderColor: '#444' }]}>
          <User size={18} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
          <TextInput style={[s.input, isDark && { color: '#FFF' }]} value={name} onChangeText={setName} placeholder={t('أدخل الاسم','Enter name')} placeholderTextColor="#999" />
        </View>

        <Text style={[s.label, isDark && { color: '#CCC' }]}>{t('النوع','Gender')}</Text>
        <View style={s.optionsRow}>
          {(['female', 'male'] as TwinGender[]).map(g => (
            <TouchableOpacity key={g} style={[s.option, gender === g && s.activeOption, isDark && { borderColor: gender === g ? '#D8B4FE' : '#444' }]} onPress={() => setGender(g)}>
              <Text style={[s.optionText, gender === g && s.activeText]}>{g === 'female' ? '♀ أنثى' : '♂ ذكر'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[s.label, isDark && { color: '#CCC' }]}>{t('طريقة الكلام','Reply Style')}</Text>
        <View style={s.optionsRow}>
          {(['short', 'medium', 'long'] as ReplyStyle[]).map(r => (
            <TouchableOpacity key={r} style={[s.option, reply === r && s.activeOption, isDark && { borderColor: reply === r ? '#D8B4FE' : '#444' }]} onPress={() => setReply(r)}>
              <Text style={[s.optionText, reply === r && s.activeText]}>{t(r === 'short' ? 'مختصر' : r === 'medium' ? 'متوسط' : 'مفصل', r)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[s.label, isDark && { color: '#CCC' }]}>{t('نمط الشخصية','Personality Style')}</Text>
        <View style={s.optionsRow}>
          {(Object.keys(STYLES.ar) as TwinStyle[]).map(sk => (
            <TouchableOpacity key={sk} style={[s.option, style === sk && s.activeOption, isDark && { borderColor: style === sk ? '#D8B4FE' : '#444' }]} onPress={() => setStyle(sk)}>
              <Text style={[s.optionText, style === sk && s.activeText]}>{STYLES[lang]?.[sk] || sk}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
          <Save size={18} stroke="#FFF" />
          <Text style={s.saveText}>{t('حفظ التغييرات','Save Changes')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#1A1A1A', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8, marginTop: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#F0F0F0' },
  input: { flex: 1, fontSize: 15, color: '#1A1A1A' },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: '#E0D9F5', backgroundColor: '#FFF' },
  activeOption: { borderColor: '#6B21A8', backgroundColor: '#F3F0FF' },
  optionText: { fontSize: 13, color: '#666', fontWeight: '500' },
  activeText: { color: '#6B21A8', fontWeight: '700' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#6B21A8', padding: 16, borderRadius: 12, marginTop: 32 },
  saveText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
