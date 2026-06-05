import { SafeAreaView, View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTwinStore } from '../store/useTwinStore';
import { HeartPulse, Smile, ThumbsUp, Frown, Angry, Coffee } from 'lucide-react-native';

export default function Mood() {
  const { lang, theme } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = theme === 'dark';
  const t = (ar: string, en: string) => isAr ? ar : en;

  const moods = [
    { icon: Smile, label: t('سعيد','Happy'), color: '#10B981' },
    { icon: ThumbsUp, label: t('راضٍ','Satisfied'), color: '#3B82F6' },
    { icon: Frown, label: t('حزين','Sad'), color: '#F59E0B' },
    { icon: Angry, label: t('غاضب','Angry'), color: '#EF4444' },
    { icon: Coffee, label: t('متعب','Tired'), color: '#8B5CF6' },
  ];

  return (
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
      <ScrollView style={s.container} contentContainerStyle={{ padding: 20 }}>
        <Text style={[s.title, isDark && { color: '#FFF' }]}>{t('لوحة المشاعر','Mood Board')}</Text>
        <HeartPulse size={40} stroke={isDark ? '#D8B4FE' : '#6B21A8'} style={{ alignSelf: 'center', marginBottom: 24 }} />
        {moods.map((m, i) => {
          const Icon = m.icon;
          return (
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
            <View key={i} style={[s.row, isDark && { backgroundColor: '#2A2A2A', borderColor: '#444' }]}>
              <Icon size={24} stroke={m.color} />
              <Text style={[s.label, isDark && { color: '#FFF' }]}>{m.label}</Text>
              <View style={[s.dot, { backgroundColor: m.color }]} />
            </View>
          );
        })}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: '#FFF', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#F0F0F0' },
  label: { fontSize: 15, color: '#1A1A1A', flex: 1 },
  dot: { width: 12, height: 12, borderRadius: 6 },
});
