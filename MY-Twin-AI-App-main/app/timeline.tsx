import {
  SafeAreaView, View, Text, StyleSheet, FlatList,
  ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { useTwinStore } from '../store/useTwinStore';
import { supabase } from '../lib/supabase';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BrainCircuit, Heart, Star, Lightbulb, Target,
  MessageCircle, Sparkles, Trophy, Smile, Moon,
  UserPlus, Award, Zap
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

// ─ـ أنواع الأحداث ───────────────────────────────
type EventType = 'memory' | 'dream' | 'goal' | 'relationship' | 'achievement' | 'emotion' | 'chat';

interface TimelineEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  timestamp: string;
  importance: number;
  emotional_score?: number;
  relationship_score?: number;
  icon?: LucideIcon;
  color?: string;
}

// ─ـ أيقونات وألوان كل نوع ────────────────────────
const EVENT_CONFIG: Record<EventType, { icon: LucideIcon; color: string; label_ar: string; label_en: string }> = {
  memory:       { icon: BrainCircuit, color: '#3B82F6', label_ar: 'ذكرى', label_en: 'Memory' },
  dream:        { icon: Moon,         color: '#8B5CF6', label_ar: 'حلم', label_en: 'Dream' },
  goal:         { icon: Target,       color: '#F59E0B', label_ar: 'هدف', label_en: 'Goal' },
  relationship: { icon: Heart,        color: '#EC4899', label_ar: 'علاقة', label_en: 'Relationship' },
  achievement:  { icon: Trophy,       color: '#10B981', label_ar: 'إنجاز', label_en: 'Achievement' },
  emotion:      { icon: Smile,        color: '#F59E0B', label_ar: 'مشاعر', label_en: 'Emotion' },
  chat:         { icon: MessageCircle,color: '#6B21A8', label_ar: 'محادثة', label_en: 'Chat' },
};

export default function Timeline() {
  const { lang, theme, userId, bondLevel, twinName } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = theme === 'dark';
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  // ─ـ جلب الأحداث من جداول متعددة ──────────────────
  const fetchTimeline = useCallback(async (showRefresh = false) => {
    if (!userId) {
      setLoading(false);
      return;
    }
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const allEvents: TimelineEvent[] = [];

      // 1. الذكريات من جدول memories
      const { data: memories } = await supabase
        .from('memories')
        .select('id, content, created_at, importance')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);
      
      if (memories) {
        memories.forEach((m: any) => {
          allEvents.push({
            id: `mem-${m.id}`,
            type: 'memory',
            title: m.content?.slice(0, 60) || 'ذكرى',
            description: m.content || '',
            timestamp: m.created_at,
            importance: m.importance || 5,
          });
        });
      }

      // 2. الأحلام من جدول dreams (إن وجد)
      const { data: dreams } = await supabase
        .from('dreams')
        .select('id, content, created_at, analysis')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(15);
      
      if (dreams) {
        dreams.forEach((d: any) => {
          allEvents.push({
            id: `dream-${d.id}`,
            type: 'dream',
            title: d.content?.slice(0, 60) || t('حلم مشترك', 'Shared dream'),
            description: d.analysis || d.content || '',
            timestamp: d.created_at,
            importance: 7,
          });
        });
      }

      // 3. الأهداف من جدول goals
      const { data: goals } = await supabase
        .from('goals')
        .select('id, title, created_at, status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(15);
      
      if (goals) {
        goals.forEach((g: any) => {
          allEvents.push({
            id: `goal-${g.id}`,
            type: 'goal',
            title: g.title || t('هدف جديد', 'New goal'),
            description: g.status === 'completed' ? t('تم الإنجاز', 'Completed') : t('قيد التقدم', 'In progress'),
            timestamp: g.created_at,
            importance: g.status === 'completed' ? 9 : 6,
          });
        });
      }

      // 4. المشاعر من جدول emotional_timeline
      const { data: emotions } = await supabase
        .from('emotional_timeline')
        .select('id, primary_emotion, intensity, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(15);
      
      if (emotions) {
        emotions.forEach((e: any) => {
          if (e.intensity > 0.6) {
            allEvents.push({
              id: `emo-${e.id}`,
              type: 'emotion',
              title: t(`شعور ${e.primary_emotion}`, `${e.primary_emotion} emotion`),
              description: t(`شدة: ${Math.round(e.intensity * 100)}%`, `Intensity: ${Math.round(e.intensity * 100)}%`),
              timestamp: e.created_at,
              importance: Math.round(e.intensity * 10),
              emotional_score: e.intensity,
            });
          }
        });
      }

      // 5. أحداث العلاقة من جدول twin_states
      const { data: twinState } = await supabase
        .from('twin_states')
        .select('bond_level, updated_at')
        .eq('user_id', userId)
        .single();
      
      if (twinState?.bond_level) {
        const bondLevel = twinState.bond_level;
        if (bondLevel >= 20) {
          allEvents.push({
            id: 'rel-familiar',
            type: 'relationship',
            title: t('أصبحتما مألوفين', 'Became familiar'),
            description: t('وصل مستوى الرابطة إلى 20%', 'Bond reached 20%'),
            timestamp: twinState.updated_at,
            importance: 6,
            relationship_score: 20,
          });
        }
        if (bondLevel >= 50) {
          allEvents.push({
            id: 'rel-friend',
            type: 'relationship',
            title: t('أصبحتما صديقين', 'Became friends'),
            description: t('وصل مستوى الرابطة إلى 50%', 'Bond reached 50%'),
            timestamp: twinState.updated_at,
            importance: 8,
            relationship_score: 50,
          });
        }
        if (bondLevel >= 80) {
          allEvents.push({
            id: 'rel-soulmate',
            type: 'relationship',
            title: t('توأم روح', 'Soulmate'),
            description: t('وصل مستوى الرابطة إلى 80%', 'Bond reached 80%'),
            timestamp: twinState.updated_at,
            importance: 10,
            relationship_score: 80,
          });
        }
      }

      // 6. الإنجازات من جدول badges (في الـ store)
      const badges = useTwinStore.getState().badges;
      badges.forEach((badge: string, index: number) => {
        allEvents.push({
          id: `ach-${badge}`,
          type: 'achievement',
          title: t(`إنجاز: ${badge}`, `Achievement: ${badge}`),
          description: t('حصلت على وسام جديد', 'You earned a new badge'),
          timestamp: new Date(Date.now() - index * 86400000).toISOString(),
          importance: 8,
        });
      });

      // ترتيب الأحداث تنازلياً حسب الوقت
      allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      if (!cancelledRef.current) {
        setEvents(allEvents);
      }
    } catch (e) {
      if (!cancelledRef.current) {
        setError(t('فشل تحميل الخط الزمني', 'Failed to load timeline'));
        console.error('Timeline error:', e);
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
    fetchTimeline();
    return () => { cancelledRef.current = true; };
  }, [fetchTimeline]);

  const onRefresh = useCallback(() => {
    fetchTimeline(true);
  }, [fetchTimeline]);

  // ─ـ تنسيق الوقت ────────────────────────────────
  const formatTime = (iso: string) => {
    try {
      const date = new Date(iso);
      const dateStr = date.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
      const timeStr = date.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
        hour: '2-digit', minute: '2-digit',
      });
      return `${dateStr} · ${timeStr}`;
    } catch {
      return '';
    }
  };

  // ─ـ هل الحدث مهم جداً؟ ─────────────────────────
  const isMilestone = (event: TimelineEvent) => event.importance >= 8;

  // ─ـ مكون كل حدث ────────────────────────────────
  const renderItem = useCallback(({ item, index }: { item: TimelineEvent; index: number }) => {
    const config = EVENT_CONFIG[item.type] || EVENT_CONFIG.chat;
    const Icon = config.icon;
    const color = config.color;
    const isDark = theme === 'dark';
    const card = isDark ? '#2A2A2A' : '#FFF';
    const border = isDark ? '#444' : '#F0F0F0';
    const txt = isDark ? '#FFF' : '#1A1A1A';
    const sub = isDark ? '#888' : '#666';
    const isLast = index === events.length - 1;

    return (
      <View style={[s.eventRow, isAr && { flexDirection: 'row-reverse' }]}>
        {/* خط زمني */}
        <View style={s.lineCol}>
          <View style={[s.dot, { backgroundColor: color, width: isMilestone(item) ? 16 : 12, height: isMilestone(item) ? 16 : 12, borderRadius: isMilestone(item) ? 8 : 6 }]} />
          {!isLast && <View style={[s.connector, { backgroundColor: isDark ? '#444' : '#E0D9F5' }]} />}
        </View>
        {/* بطاقة الحدث */}
        <View style={[s.card, { backgroundColor: card, borderColor: border }]}>
          <View style={[s.cardHeader, isAr && { flexDirection: 'row-reverse' }]}>
            <View style={[s.iconWrap, { backgroundColor: color + '20' }]}>
              <Icon size={16} color={color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.cardType, { color }]}>
                {isAr ? config.label_ar : config.label_en}
              </Text>
              <Text style={[s.cardTitle, { color: txt }]} numberOfLines={2}>
                {item.title}
              </Text>
            </View>
            {isMilestone(item) && <Sparkles size={16} color="#F59E0B" />}
          </View>
          {item.description ? (
            <Text style={[s.cardDesc, { color: sub }]} numberOfLines={3}>
              {item.description}
            </Text>
          ) : null}
          <Text style={[s.cardTime, { color: sub }]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  }, [events.length, theme, isAr, isDark, formatTime, isMilestone]);

  const bg = isDark ? '#1A1A1A' : '#F8F6F2';
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
        <Text style={[s.title, { color: txt }]}>
          {t('رحلتكما معاً 💜', 'Your Journey Together 💜')}
        </Text>
        <Text style={[s.subtitle, { color: sub }]}>
          {t(`قصة علاقتك مع ${twinName || 'توأمك'}`, `Your story with ${twinName || 'your Twin'}`)}
        </Text>

        {error && (
          <Text style={[s.error, { color: '#EF4444' }]}>{error}</Text>
        )}

        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#6B21A8']}
              tintColor="#6B21A8"
            />
          }
          ListEmptyComponent={
            <Text style={[s.empty, { color: sub }]}>
              {t(
                'لا توجد أحداث بعد 💭\nابدأ أول محادثة مع توأمك',
                'No events yet 💭\nStart your first chat with your Twin'
              )}
            </Text>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 20 },
  loader: { flex: 1, marginTop: 80 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 24 },
  error: { fontSize: 14, marginBottom: 12, textAlign: 'center' },
  empty: { textAlign: 'center', marginTop: 60, fontSize: 15, lineHeight: 24 },
  eventRow: { flexDirection: 'row', marginBottom: 0 },
  lineCol: { alignItems: 'center', width: 32, marginRight: 10 },
  dot: { zIndex: 2 },
  connector: { width: 2, flex: 1, marginVertical: 4 },
  card: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  iconWrap: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  cardType: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  cardTitle: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  cardDesc: { fontSize: 13, lineHeight: 18, marginBottom: 6 },
  cardTime: { fontSize: 11 },
});
