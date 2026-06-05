import { SafeAreaView, View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useTwinStore } from '../store/useTwinStore';
import { MessageCircle, ChevronRight, PlusCircle } from 'lucide-react-native';
import { router, Href } from 'expo-router';

export default function History() {
  const { lang, theme, chatHistory, clearHistory } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = theme === 'dark';
  const t = (ar: string, en: string) => isAr ? ar : en;

  const conversations = chatHistory.reduce((acc: any[], msg) => {
    if (msg.role === 'user') acc.push({ id: acc.length, preview: msg.content.slice(0, 50) + '...' });
    return acc;
  }, []);

  const startNewChat = () => {
    clearHistory();
    router.push('/chat');
  };

  return (
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
      <View style={s.container}>
        <View style={s.headerRow}>
          <Text style={[s.title, isDark && { color: '#FFF' }]}>{t('سجل المحادثات','Chat History')}</Text>
          <TouchableOpacity onPress={startNewChat} style={s.newChatBtn}>
            <PlusCircle size={20} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
            <Text style={[s.newChatText, isDark && { color: '#D8B4FE' }]}>{t('جديد','New')}</Text>
          </TouchableOpacity>
        </View>
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#1A1A1A' },
  newChatBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  newChatText: { fontSize: 14, fontWeight: '600', color: '#6B21A8' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: '#FFF', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#F0F0F0' },
  preview: { flex: 1, fontSize: 14, color: '#1A1A1A' },
  empty: { textAlign: 'center', color: '#888', marginTop: 40, fontSize: 15 },
});
