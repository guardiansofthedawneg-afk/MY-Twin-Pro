import { SafeAreaView, View, Text, StyleSheet, FlatList } from 'react-native';
import { useTwinStore } from '../store/useTwinStore';
import { History } from 'lucide-react-native';

export default function Timeline() {
  const { lang, theme } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = theme === 'dark';
  const t = (ar: string, en: string) => isAr ? ar : en;

  const memories = [
    { id: '1', date: '2026-06-01', text: t('أول محادثة','First chat') },
    { id: '2', date: '2026-06-02', text: t('تحليل شخصية','Personality analysis') },
    { id: '3', date: '2026-06-03', text: t('تدريب حياتي','Life coaching') },
  ];

  return (
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
      <View style={s.container}>
        <Text style={[s.title, isDark && { color: '#FFF' }]}>{t('خط الذكريات','Memory Timeline')}</Text>
        <FlatList
          data={memories}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={[s.row, isDark && { backgroundColor: '#2A2A2A', borderColor: '#444' }]}>
              <History size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
              <View>
                <Text style={[s.text, isDark && { color: '#FFF' }]}>{item.text}</Text>
                <Text style={s.date}>{item.date}</Text>
              </View>
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
  text: { fontSize: 15, color: '#1A1A1A' },
  date: { fontSize: 12, color: '#888', marginTop: 4 },
});
