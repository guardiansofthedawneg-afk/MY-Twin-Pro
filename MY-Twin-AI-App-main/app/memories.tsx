import { SafeAreaView, View, Text, StyleSheet, FlatList } from 'react-native';
import { useTwinStore } from '../store/useTwinStore';
import { BrainCircuit } from 'lucide-react-native';

export default function Memories() {
  const { lang, theme } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = theme === 'dark';
  const t = (ar: string, en: string) => isAr ? ar : en;

  const memories = [
    { id: '1', text: t('أول لقاء','First meeting') },
    { id: '2', text: t('محادثة عن الأحلام','Dream chat') },
  ];

  return (
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
      <View style={s.container}>
        <Text style={[s.title, isDark && { color: '#FFF' }]}>{t('ذكريات','Memories')}</Text>
        <FlatList
          data={memories}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={[s.row, isDark && { backgroundColor: '#2A2A2A', borderColor: '#444' }]}>
              <BrainCircuit size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
              <Text style={[s.text, isDark && { color: '#FFF' }]}>{item.text}</Text>
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
});
