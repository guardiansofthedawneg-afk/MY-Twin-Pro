import {
  SafeAreaView, View, Text, StyleSheet,
  FlatList, ActivityIndicator, RefreshControl,
  Alert, TouchableOpacity
} from "react-native";
import { useTwinStore } from "../store/useTwinStore";
import { BrainCircuit, Heart, Star, Lightbulb, Trash2, Search } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { useState, useEffect, useCallback, useRef } from "react";
import type { LucideIcon } from 'lucide-react-native';

interface Memory {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  category?: string;
  importance_score?: number;
  emotional_tag?: string;
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  pref:    Heart,
  dream:   Star,
  fact:    Lightbulb,
  default: BrainCircuit,
};

const CATEGORY_COLORS: Record<string, string> = {
  pref:    "#EC4899",
  dream:   "#F59E0B",
  fact:    "#3B82F6",
  default: "#6B21A8",
};

export default function Memories() {
  const { lang, theme, userId } = useTwinStore();
  const isAr  = lang === "ar";
  const isDark = theme === "dark";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [memories,   setMemories]   = useState<Memory[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page,       setPage]       = useState(0);
  const [hasMore,    setHasMore]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const PAGE_SIZE = 15;

  const fetchMemories = useCallback(async (pageNum = 0, replace = true) => {
    if (!userId) { 
      setLoading(false); 
      return; 
    }
    
    if (replace) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const from = pageNum * PAGE_SIZE;
      const to   = from + PAGE_SIZE - 1;
      const { data, error: fetchError } = await supabase
        .from("memories")
        .select("id, user_id, content, created_at, category, importance_score, emotional_tag")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (cancelledRef.current) return;
      
      if (fetchError) throw fetchError;
      
      const result = (data || []) as Memory[];
      setMemories(prev => replace ? result : [...prev, ...result]);
      setHasMore(result.length === PAGE_SIZE);
      setPage(pageNum);
    } catch (e) {
      if (!cancelledRef.current) {
        setError(isAr ? 'فشل تحميل الذكريات' : 'Failed to load memories');
        console.error("Memories load error:", e);
      }
    } finally {
      if (!cancelledRef.current) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, [userId, isAr]);

  useEffect(() => {
    cancelledRef.current = false;
    fetchMemories(0, true);
    return () => { cancelledRef.current = true; };
  }, [fetchMemories]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMemories(0, true);
  }, [fetchMemories]);

  const onEndReached = useCallback(() => {
    if (!hasMore || loading || loadingMore) return;
    fetchMemories(page + 1, false);
  }, [hasMore, loading, loadingMore, page, fetchMemories]);

  const handleDelete = useCallback((memoryId: string, content: string) => {
    Alert.alert(
      t('حذف الذكرى', 'Delete Memory'),
      t('هل أنت متأكد من حذف هذه الذكرى؟', 'Are you sure you want to delete this memory?'),
      [
        { text: t('إلغاء', 'Cancel'), style: 'cancel' },
        { 
          text: t('حذف', 'Delete'), 
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.from('memories').delete().eq('id', memoryId);
              setMemories(prev => prev.filter(m => m.id !== memoryId));
            } catch (e) {
              console.error('Delete error:', e);
            }
          }
        },
      ]
    );
  }, [isAr, t]);

  const formatDate = (iso: string) => {
    try {
      const date = new Date(iso);
      const isToday = date.toDateString() === new Date().toDateString();
      if (isToday) {
        return date.toLocaleTimeString(isAr ? "ar-EG" : "en-US", { 
          hour: '2-digit', minute: '2-digit' 
        });
      }
      return date.toLocaleDateString(isAr ? "ar-EG" : "en-US", {
        year: "numeric", month: "short", day: "numeric",
      });
    } catch { return ""; }
  };

  const renderItem = useCallback(({ item }: { item: Memory }) => {
    const cat     = item.category || "default";
    const Icon    = CATEGORY_ICONS[cat]  || BrainCircuit;
    const color   = CATEGORY_COLORS[cat] || "#6B21A8";
    const isImportant = (item.importance_score ?? 0) > 0.7;
    const isDark = theme === 'dark';
    const card  = isDark ? "#2A2A2A" : "#FFF";
    const border = isDark ? "#444"   : "#F0F0F0";
    const txt   = isDark ? "#FFF"    : "#1A1A1A";
    const sub   = isDark ? "#888"    : "#666";

    return (
      <TouchableOpacity 
        onLongPress={() => handleDelete(item.id, item.content)}
        style={[s.row, { backgroundColor: card, borderColor: border }]}
      >
        <View style={[s.iconWrap, { backgroundColor: color + "20" }]}>
          <Icon size={16} color={color} />
        </View>
        <View style={s.rowContent}>
          <Text style={[s.text, { color: txt }]}>{item.content}</Text>
          <View style={s.metaRow}>
            <Text style={[s.date, { color: sub }]}>{formatDate(item.created_at)}</Text>
            {isImportant && <Text style={s.star}>⭐</Text>}
            {item.emotional_tag && (
              <Text style={[s.tag, { color }]}>{item.emotional_tag}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [theme, isDark, handleDelete, formatDate]);

  const bg    = isDark ? "#1A1A1A" : "#F8F6F2";
  const txt   = isDark ? "#FFF"    : "#1A1A1A";
  const sub   = isDark ? "#888"    : "#666";

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
          {t("ذكرياتي 🧠", "My Memories 🧠")}
        </Text>
        
        {error && (
          <Text style={[s.error, { color: '#EF4444' }]}>{error}</Text>
        )}
        
        <FlatList
          data={memories}
          keyExtractor={(item) => item.id || `memory-${item.created_at}-${Math.random().toString(36).substr(2, 5)}`}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#6B21A8"]}
              tintColor="#6B21A8"
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <Text style={[s.empty, { color: sub }]}>
              {t("لا توجد ذكريات بعد 💭", "No memories yet 💭")}
            </Text>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color="#6B21A8" style={{ marginVertical: 16 }} />
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1 },
  container:  { flex: 1, padding: 20 },
  loader:     { flex: 1, marginTop: 80 },
  title:      { fontSize: 24, fontWeight: "800", marginBottom: 20 },
  error:      { fontSize: 14, marginBottom: 12, textAlign: 'center' },
  row:        { flexDirection: "row", alignItems: "flex-start", padding: 14, borderRadius: 14, marginBottom: 10, borderWidth: 1 },
  iconWrap:   { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12, marginTop: 2 },
  rowContent: { flex: 1 },
  text:       { fontSize: 15, lineHeight: 22, marginBottom: 6 },
  metaRow:    { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  date:       { fontSize: 12 },
  star:       { fontSize: 12, marginLeft: 6 },
  tag:        { fontSize: 11, marginLeft: 8, fontWeight: "600" },
  empty:      { textAlign: "center", marginTop: 60, fontSize: 15 },
});
