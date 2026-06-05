import { SafeAreaView, View, Text, StyleSheet, FlatList } from 'react-native';
import { useTwinStore } from '../store/useTwinStore';
import { History as HistoryIcon, MessageCircle } from 'lucide-react-native';

export default function History() {
  const { lang, theme, chatHistory } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = theme === 'dark';
  const t = (ar: string, en: string) => isAr ? ar : en;

  return (
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
      <View style={s.container}>
        <Text style={[s.title, isDark && { color: '#FFF' }]}>{t('سجل المحادثات','Chat History')}</Text>
        <FlatList
          data={[...chatHistory].reverse()}
          keyExtractor={(_, i) => i.toString()}
          ListEmptyComponent={<Text style={[s.empty, isDark && { color: '#666' }]}>{t('لا توجد محادثات','No conversations')}</Text>}
          renderItem={({ item }) => (
            <View style={[s.row, isDark && { backgroundColor: '#2A2A2A', borderColor: '#444' }]}>
              <MessageCircle size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
              <View style={{ flex: 1 }}>
                <Text style={[s.role, isDark && { color: '#D8B4FE' }]}>{item.role === 'user' ? t('أنت','You') : t('التوأم','Twin')}</Text>
                <Text style={[s.content, isDark && { color: '#CCC' }]} numberOfLines={2}>{item.content}</Text>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: '#FFF', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#F0F0F0' },
  role: { fontSize: 12, fontWeight: '700', color: '#6B21A8' },
  content: { fontSize: 14, color: '#1A1A1A', marginTop: 2 },
  empty: { textAlign: 'center', color: '#888', marginTop: 40, fontSize: 15 },
});
