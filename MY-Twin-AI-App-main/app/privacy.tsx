import { SafeAreaView, View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTwinStore } from '../store/useTwinStore';
import { Shield } from 'lucide-react-native';

export default function Privacy() {
  const { lang, theme } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = theme === 'dark';
  const t = (ar: string, en: string) => isAr ? ar : en;

  return (
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
      <ScrollView style={s.container} contentContainerStyle={{ padding: 20 }}>
        <Text style={[s.title, isDark && { color: '#FFF' }]}>{t('سياسة الخصوصية','Privacy Policy')}</Text>
        <Shield size={40} stroke={isDark ? '#D8B4FE' : '#6B21A8'} style={{ alignSelf: 'center', marginBottom: 20 }} />
        <Text style={[s.text, isDark && { color: '#CCC' }]}>
          {t('نحن نحمي خصوصيتك...','We protect your privacy...')}
        </Text>
      </ScrollView>
    </SafeAreaView>
    </SafeAreaView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F8F6F2' },
  title: { fontSize: 24, fontWeight: '800', color: '#1A1A1A', marginBottom: 20, textAlign: 'center' },
  text: { fontSize: 15, color: '#444', lineHeight: 24, textAlign: 'center' },
});
