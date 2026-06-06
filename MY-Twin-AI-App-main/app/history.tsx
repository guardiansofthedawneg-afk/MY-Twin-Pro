import { SafeAreaView, View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useTwinStore } from '../store/useTwinStore';
import { MessageCircle, ChevronRight } from 'lucide-react-native';
import { router, Href } from 'expo-router';

export default function History() {
  const { lang, theme, chatHistory } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = theme === 'dark';
  const t = (ar: string, en: string) => isAr ? ar : en;

  // تجميع المحادثات: كل رسالة من المستخدم تعتبر بداية محادثة جديدة
  const conversations = chatHistory.reduce((acc: any[], msg) => {
    if (msg.role === 'user') acc.push({ id: acc.length, preview: msg.content.slice(0, 50) + '...' });
    return acc;
  }, []);

  return (
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
      <View style={[s.container, isDark && { backgroundColor: '#1A1A1A' }]}>
        <Text style={[s.title, isDark && { color: '#FFF' }]}>{t('سجل المحادثات','Chat History')}</Text>
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={<Text style={[s.empty, isDark && { color: '#666' }]}>{t('لا توجد محادثات','No conversations')}</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.row, isDark && { backgroundColor: '#2A2A2A', borderColor: '#444' }]}
              onPress={() => router.push(`/chat?history=${item.id}` as Href)}
            >
              <MessageCircle size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
              <Text style={[s.preview, isDark && { color: '#CCC' }]} numberOfLines={1}>{item.preview}</Text>
              <ChevronRight size={16} stroke={isDark ? '#666' : '#CCC'} />
            </TouchableOpacity>
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
  preview: { flex: 1, fontSize: 14, color: '#1A1A1A' },
  empty: { textAlign: 'center', color: '#888', marginTop: 40, fontSize: 15 },
});
