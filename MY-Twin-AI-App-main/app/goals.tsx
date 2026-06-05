import { SafeAreaView, View, Text, StyleSheet, FlatList } from 'react-native';
import { useTwinStore } from '../store/useTwinStore';
import { Target, CheckCircle2, Circle } from 'lucide-react-native';

export default function Goals() {
  const { lang, theme } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = theme === 'dark';
  const t = (ar: string, en: string) => isAr ? ar : en;

  const goals = [
    { id: '1', title: t('التحدث يومياً','Daily chat'), done: true },
    { id: '2', title: t('إكمال تحليل الشخصية','Complete personality analysis'), done: true },
    { id: '3', title: t('تدريب حياتي','Life coaching'), done: false },
    { id: '4', title: t('تحليل حلم','Dream analysis'), done: false },
  ];

  return (
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
      <View style={s.container}>
        <Text style={[s.title, isDark && { color: '#FFF' }]}>{t('أهدافي','My Goals')}</Text>
        <FlatList
          data={goals}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={[s.row, isDark && { backgroundColor: '#2A2A2A', borderColor: '#444' }]}>
              {item.done ? (
                <CheckCircle2 size={20} stroke="#10B981" />
              ) : (
                <Circle size={20} stroke={isDark ? '#666' : '#CCC'} />
              )}
              <Text style={[s.text, item.done && s.done, isDark && { color: item.done ? '#10B981' : '#FFF' }]}>{item.title}</Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 20, backgroundColor: '#F8F6F2' },
  title: { fontSize: 24, fontWeight: '800', color: '#1A1A1A', marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: '#FFF', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#F0F0F0' },
  text: { fontSize: 15, color: '#1A1A1A', flex: 1 },
  done: { textDecorationLine: 'line-through', color: '#10B981' },
});
