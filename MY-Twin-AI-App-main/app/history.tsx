import {
  SafeAreaView, View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Alert, RefreshControl,
  TextInput
} from 'react-native';
import { useTwinStore } from '../store/useTwinStore';
import { supabase } from '../lib/supabase';
import { router, Href } from 'expo-router';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageCircle, Clock, Trash2, Search, X,
  ChevronRight, ChevronLeft, Smile, Brain
} from 'lucide-react-native';

interface Conversation {
  id: number;
  user_id: string;
  title: string;
  summary: string | null;
  dominant_emotion: string;
  memory_count: number;
  message_count: number;
  duration_minutes: number;
  created_at: string;
  updated_at: string;
}

const EMOTION_ICONS: Record<string, string> = {
  joy: '😊', sadness: '😔', anger: '😤', fear: '😨',
  love: '💕', surprise: '😮', neutral: '😐',
};

export default function History() {
  const { lang, theme, userId, chatHistory, addMessage } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = theme === 'dark';
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  // ─ـ جلب المحادثات من Supabase ──────────────────
  const fetchConversations = useCallback(async (showRefresh = false) => {
    if (!userId) { setLoading(false); return; }
    if (showRefresh) setRefreshing(true); else setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (cancelledRef.current) return;
      if (fetchError) throw fetchError;

      setConversations(data || []);
    } catch (e) {
      if (!cancelledRef.current) {
        setError(t('فشل تحميل المحادثات', 'Failed to load conversations'));
        console.error('History error:', e);
      }
    } finally {
      if (!cancelledRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [userId, isAr, t]);

  useEffect(() => {
    cancelledRef.current = false;
    fetchConversations();
    return () => { cancelledRef.current = true; };
  }, [fetchConversations]);

  const onRefresh = useCallback(() => fetchConversations(true), [fetchConversations]);

  // ─ـ حذف محادثة ────────────────────────────────
  const handleDelete = (convId: number) => {
    Alert.alert(t('حذف المحادثة', 'Delete Conversation'), t('هل أنت متأكد؟', 'Are you sure?'), [
      { text: t('إلغاء', 'Cancel'), style: 'cancel' },
      {
        text: t('حذف', 'Delete'), style: 'destructive',
        onPress: async () => {
          try {
            await supabase.from('conversations').delete().eq('id', convId);
            setConversations(prev => prev.filter(c => c.id !== convId));
          } catch (e) {
            console.error('Delete error:', e);
          }
        },
      },
    ]);
  };

  // ─ـ تحويل الوقت إلى نص نسبي ───────────────────
  const relativeTime = (iso: string) => {
    const now = new Date();
    const date = new Date(iso);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('الآن', 'Just now');
    if (diffMins < 60) return t(`قبل ${diffMins} د`, `${diffMins}m ago`);
    if (diffHours < 24) return t(`قبل ${diffHours} س`, `${diffHours}h ago`);
    if (diffDays === 1) return t('أمس', 'Yesterday');
    if (diffDays < 7) return t(`قبل ${diffDays} أيام`, `${diffDays}d ago`);
    return date.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
  };

  // ─ـ تصفية حسب البحث ───────────────────────────
  const filtered = searchQuery.trim()
    ? conversations.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations;

  // ─ـ فتح محادثة ────────────────────────────────
  const openConversation = async (conv: Conversation) => {
    try {
      const { data: messages } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true });

      if (messages) {
        // مسح المحادثة الحالية وإعادة بنائها
        useTwinStore.getState().clearHistory();
        messages.forEach((msg: any) => {
          addMessage(msg.role, msg.content);
        });
      }
      router.push('/chat' as Href);
    } catch (e) {
      console.error('Open conversation error:', e);
      router.push('/chat' as Href);
    }
  };

  const bg = isDark ? '#1A1A1A' : '#F8F6F2';
  const card = isDark ? '#2A2A2A' : '#FFF';
  const border = isDark ? '#444' : '#F0F0F0';
  const txt = isDark ? '#FFF' : '#1A1A1A';
  const sub = isDark ? '#888' : '#666';

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color="#6B21A8" style={s.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: bg }]}>
      <View style={[s.container, { backgroundColor: bg }]}>
        <Text style={[s.title, { color: txt }]}>{t('المحادثات 💬', 'Conversations 💬')}</Text>

        {/* شريط البحث */}
        <View style={[s.searchRow, { backgroundColor: card, borderColor: border }]}>
          <Search size={18} stroke={sub} />
          <TextInput
            style={[s.searchInput, { color: txt }]}
            placeholder={t('بحث في المحادثات...', 'Search conversations...')}
            placeholderTextColor={sub}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} stroke={sub} />
            </TouchableOpacity>
          )}
        </View>

        {error && <Text style={[s.error, { color: '#EF4444' }]}>{error}</Text>}

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6B21A8']} />
          }
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <MessageCircle size={48} stroke={sub} />
              <Text style={[s.emptyText, { color: sub }]}>
                {t('لا توجد محادثات بعد', 'No conversations yet')}
              </Text>
              <Text style={[s.emptySub, { color: sub }]}>
                {t('ابدأ أول محادثة مع توأمك', 'Start your first chat with your Twin')}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const emotionIcon = EMOTION_ICONS[item.dominant_emotion] || '😐';
            return (
              <TouchableOpacity
                style={[s.card, { backgroundColor: card, borderColor: border }]}
                onPress={() => openConversation(item)}
                onLongPress={() => handleDelete(item.id)}
                activeOpacity={0.8}
              >
                <View style={[s.cardRow, isAr && { flexDirection: 'row-reverse' }]}>
                  <View style={s.emotionBadge}>
                    <Text style={s.emotionIcon}>{emotionIcon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.cardTitle, { color: txt }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.summary && (
                      <Text style={[s.cardSummary, { color: sub }]} numberOfLines={2}>
                        {item.summary}
                      </Text>
                    )}
                    <View style={[s.metaRow, isAr && { flexDirection: 'row-reverse' }]}>
                      <View style={[s.metaItem, isAr && { flexDirection: 'row-reverse' }]}>
                        <Clock size={12} stroke={sub} />
                        <Text style={[s.metaText, { color: sub }]}>{relativeTime(item.updated_at)}</Text>
                      </View>
                      <View style={[s.metaItem, isAr && { flexDirection: 'row-reverse' }]}>
                        <Brain size={12} stroke={sub} />
                        <Text style={[s.metaText, { color: sub }]}>
                          {t(`${item.memory_count} ذكريات`, `${item.memory_count} memories`)}
                        </Text>
                      </View>
                      {item.message_count > 0 && (
                        <View style={[s.metaItem, isAr && { flexDirection: 'row-reverse' }]}>
                          <MessageCircle size={12} stroke={sub} />
                          <Text style={[s.metaText, { color: sub }]}>
                            {t(`${item.message_count} رسالة`, `${item.message_count} msgs`)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {isAr ? <ChevronLeft size={20} stroke={sub} /> : <ChevronRight size={20} stroke={sub} />}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 20 },
  loader: { flex: 1, marginTop: 80 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 16 },
  searchRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16, gap: 8 },
  searchInput: { flex: 1, fontSize: 15 },
  error: { fontSize: 14, marginBottom: 12, textAlign: 'center' },
  emptyWrap: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 17, fontWeight: '600', marginTop: 16 },
  emptySub: { fontSize: 14, marginTop: 6, textAlign: 'center' },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emotionBadge: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F3F0FF', justifyContent: 'center', alignItems: 'center' },
  emotionIcon: { fontSize: 20 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  cardSummary: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  metaRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12 },
});
