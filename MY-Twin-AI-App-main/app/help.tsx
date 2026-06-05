import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTwinStore } from '../store/useTwinStore';
import { HelpCircle, HeartPulse } from 'lucide-react-native';

export default function Help() {
  const { lang, theme } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = theme === 'dark';
  const t = (ar: string, en: string) => isAr ? ar : en;

  return (
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
      <View style={s.container}>
        <Text style={[s.title, isDark && { color: '#FFF' }]}>{t('المساعدة','Help')}</Text>
        <HelpCircle size={40} stroke={isDark ? '#D8B4FE' : '#6B21A8'} style={{ alignSelf: 'center', marginBottom: 20 }} />
        <TouchableOpacity style={[s.btn, { backgroundColor: '#EF4444' }]}>
          <HeartPulse size={16} stroke="#FFF" />
          <Text style={s.btnText}>{t('دعم طوارئ نفسي','Emergency Support')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 20, backgroundColor: '#F8F6F2', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: '#1A1A1A', marginBottom: 20 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12 },
  btnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
});
