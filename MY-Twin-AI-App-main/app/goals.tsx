import {
  SafeAreaView, View, Text, StyleSheet, FlatList,
  TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, RefreshControl
} from 'react-native';
import { useTwinStore } from '../store/useTwinStore';
import { supabase } from '../lib/supabase';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Target, Plus, Trash2, X, Sparkles, Clock, Flag,
  Brain, Heart, DollarSign, Users, BookOpen, Dumbbell,
  Briefcase, Music, Palette, Globe
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

// ── واجهة الهدف ────────────────────────────────
interface Goal {
  id: string;
  user_id: string;
  title: string;
  category: string;
  progress: number;
  deadline: string | null;
  ai_comment: string | null;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
}

// ── الفئات ──────────────────────────────────────
const CATEGORIES: Record<string, { icon: LucideIcon; color: string; label_ar: string; label_en: string }> = {
  health:       { icon: Heart,      color: '#EF4444', label_ar: 'صحة',        label_en: 'Health' },
  learning:     { icon: BookOpen,   color: '#3B82F6', label_ar: 'تعلم',       label_en: 'Learning' },
  finance:      { icon: DollarSign, color: '#10B981', label_ar: 'مال',        label_en: 'Finance' },
  relationships:{ icon: Users,      color: '#EC4899', label_ar: 'علاقات',    label_en: 'Relationships' },
  personal:     { icon: Brain,      color: '#8B5CF6', label_ar: 'تطوير ذات', label_en: 'Personal Growth' },
  career:       { icon: Briefcase,  color: '#F59E0B', label_ar: 'عمل',        label_en: 'Career' },
  creative:     { icon: Palette,    color: '#6366F1', label_ar: 'إبداع',      label_en: 'Creative' },
  other:        { icon: Target,     color: '#6B21A8', label_ar: 'أخرى',       label_en: 'Other' },
};

export default function Goals() {
  const { lang, theme, userId, twinName } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = theme === 'dark';
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('other');
  const [saving, setSaving] = useState(false);
  const cancelledRef = useRef(false);

  // ─ـ جلب الأهداف من Supabase ────────────────────
  const fetchGoals = useCallback(async (showRefresh = false) => {
    if (!userId) { setLoading(false); return; }
    if (showRefresh) setRefreshing(true); else setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (cancelledRef.current) return;
      if (fetchError) throw fetchError;

      setGoals(data || []);
    } catch (e) {
      if (!cancelledRef.current) {
        setError(t('فشل تحميل الأهداف', 'Failed to load goals'));
        console.error('Goals error:', e);
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
    fetchGoals();
    return () => { cancelledRef.current = true; };
  }, [fetchGoals]);

  const onRefresh = useCallback(() => fetchGoals(true), [fetchGoals]);

  // ─ـ إضافة هدف جديد ─────────────────────────────
  const handleAddGoal = async () => {
    if (!newTitle.trim()) {
      Alert.alert(t('خطأ', 'Error'), t('أدخل عنوان الهدف', 'Enter goal title'));
      return;
    }
    setSaving(true);
    try {
      const { data, error: insertError } = await supabase
        .from('goals')
        .insert({
          user_id: userId,
          title: newTitle.trim(),
          category: newCategory,
          progress: 0,
          status: 'active',
        })
        .select()
        .single();

      if (insertError) throw insertError;
      if (data) {
        setGoals(prev => [data, ...prev]);
        setNewTitle('');
        setNewCategory('other');
        setShowAddModal(false);
      }
    } catch (e) {
      Alert.alert(t('خطأ', 'Error'), t('فشل إضافة الهدف', 'Failed to add goal'));
    } finally {
      setSaving(false);
    }
  };

  // ─ـ تحديث التقدم ───────────────────────────────
  const updateProgress = async (goalId: string, newProgress: number) => {
    const clamped = Math.max(0, Math.min(newProgress, 100));
    try {
      await supabase
        .from('goals')
        .update({ progress: clamped, status: clamped === 100 ? 'completed' : 'active' })
        .eq('id', goalId);

      setGoals(prev =>
        prev.map(g =>
          g.id === goalId ? { ...g, progress: clamped, status: clamped === 100 ? 'completed' : 'active' } : g
        )
      );
    } catch (e) {
      console.error('Update progress error:', e);
    }
  };

  // ─ـ حذف هدف ────────────────────────────────────
  const deleteGoal = (goalId: string) => {
    Alert.alert(t('حذف الهدف', 'Delete Goal'), t('هل أنت متأكد؟', 'Are you sure?'), [
      { text: t('إلغاء', 'Cancel'), style: 'cancel' },
      {
        text: t('حذف', 'Delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.from('goals').delete().eq('id', goalId);
            setGoals(prev => prev.filter(g => g.id !== goalId));
          } catch (e) {
            console.error('Delete error:', e);
          }
        },
      },
    ]);
  };

  // ─ـ مكون بطاقة الهدف ───────────────────────────
  const renderItem = useCallback(({ item }: { item: Goal }) => {
    const cat = CATEGORIES[item.category] || CATEGORIES.other;
    const Icon = cat.icon;
    const color = cat.color;
    const isDark = theme === 'dark';
    const card = isDark ? '#2A2A2A' : '#FFF';
    const border = isDark ? '#444' : '#F0F0F0';
    const txt = isDark ? '#FFF' : '#1A1A1A';
    const sub = isDark ? '#888' : '#666';
    const isCompleted = item.status === 'completed';

    return (
      <View style={[s.card, { backgroundColor: card, borderColor: border }]}>
        <View style={[s.cardHeader, isAr && { flexDirection: 'row-reverse' }]}>
          <View style={[s.iconWrap, { backgroundColor: color + '20' }]}>
            <Icon size={18} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.cardTitle, { color: txt }, isCompleted && s.completedText]}>
              {item.title}
            </Text>
            <Text style={[s.categoryLabel, { color }]}>
              {isAr ? cat.label_ar : cat.label_en}
            </Text>
          </View>
          <TouchableOpacity onPress={() => deleteGoal(item.id)}>
            <Trash2 size={16} stroke={sub} />
          </TouchableOpacity>
        </View>

        {/* شريط التقدم */}
        <View style={s.progressSection}>
          <View style={[s.progressBar, { backgroundColor: isDark ? '#444' : '#F0F0F0' }]}>
            <View style={[s.progressFill, { width: `${item.progress}%`, backgroundColor: color }]} />
          </View>
          <Text style={[s.progressText, { color: sub }]}>{item.progress}%</Text>
        </View>

        {/* أزرار تعديل التقدم */}
        <View style={[s.progressBtns, isAr && { flexDirection: 'row-reverse' }]}>
          <TouchableOpacity style={[s.progBtn, { backgroundColor: color + '20' }]} onPress={() => updateProgress(item.id, item.progress - 10)}>
            <Text style={[s.progBtnText, { color }]}>-10%</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.progBtn, { backgroundColor: color + '20' }]} onPress={() => updateProgress(item.id, item.progress + 10)}>
            <Text style={[s.progBtnText, { color }]}>+10%</Text>
          </TouchableOpacity>
        </View>

        {/* تعليق التوأم */}
        {item.ai_comment && (
          <View style={[s.aiComment, isDark && { backgroundColor: '#333' }]}>
            <Sparkles size={14} stroke={color} />
            <Text style={[s.aiCommentText, { color: sub }]}>{item.ai_comment}</Text>
          </View>
        )}

        {/* الموعد النهائي */}
        {item.deadline && (
          <View style={[s.deadlineRow, isAr && { flexDirection: 'row-reverse' }]}>
            <Clock size={14} stroke={sub} />
            <Text style={[s.deadlineText, { color: sub }]}>
              {new Date(item.deadline).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
            </Text>
          </View>
        )}
      </View>
    );
  }, [theme, isAr, isDark, updateProgress, deleteGoal]);

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
        <View style={[s.headerRow, isAr && { flexDirection: 'row-reverse' }]}>
          <Text style={[s.title, { color: txt }]}>
            {t('مركز النمو 🚀', 'Growth Center 🚀')}
          </Text>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowAddModal(true)}>
            <Plus size={20} stroke="#FFF" />
          </TouchableOpacity>
        </View>
        <Text style={[s.subtitle, { color: sub }]}>
          {t(`${twinName || 'توأمك'} يساعدك في تحقيق أهدافك`, `${twinName || 'your Twin'} helps you achieve your goals`)}
        </Text>

        {error && <Text style={[s.error, { color: '#EF4444' }]}>{error}</Text>}

        <FlatList
          data={goals}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6B21A8']} />
          }
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Target size={48} stroke={sub} />
              <Text style={[s.emptyText, { color: sub }]}>
                {t('لا توجد أهداف بعد', 'No goals yet')}
              </Text>
              <Text style={[s.emptySub, { color: sub }]}>
                {t('أضف هدفك الأول ودع توأمك يساعدك', 'Add your first goal and let your Twin help')}
              </Text>
            </View>
          }
        />
      </View>

      {/* مودال إضافة هدف */}
      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
          <View style={[s.modalContent, isDark && { backgroundColor: '#2A2A2A' }]}>
            <View style={[s.modalHeader, isAr && { flexDirection: 'row-reverse' }]}>
              <Text style={[s.modalTitle, { color: txt }]}>{t('هدف جديد', 'New Goal')}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={22} stroke={sub} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[s.input, { backgroundColor: isDark ? '#333' : '#F8F6F2', color: txt, borderColor: isDark ? '#444' : '#E0D9F5' }]}
              placeholder={t('ماذا تريد أن تحقق؟', 'What do you want to achieve?')}
              placeholderTextColor={sub}
              value={newTitle}
              onChangeText={setNewTitle}
              maxLength={100}
              autoFocus
            />

            <Text style={[s.label, { color: sub }]}>{t('الفئة', 'Category')}</Text>
            <View style={s.categoryGrid}>
              {Object.entries(CATEGORIES).map(([key, cat]) => {
                const CatIcon = cat.icon;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[s.catBtn, { borderColor: newCategory === key ? cat.color : isDark ? '#444' : '#F0F0F0', backgroundColor: newCategory === key ? cat.color + '20' : 'transparent' }]}
                    onPress={() => setNewCategory(key)}
                  >
                    <CatIcon size={16} color={cat.color} />
                    <Text style={[s.catText, { color: newCategory === key ? cat.color : sub }]}>
                      {isAr ? cat.label_ar : cat.label_en}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={[s.saveBtn, { opacity: saving ? 0.6 : 1 }]} onPress={handleAddGoal} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <Sparkles size={18} stroke="#FFF" />
                  <Text style={s.saveBtnText}>{t('إنشاء الهدف', 'Create Goal')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 20 },
  loader: { flex: 1, marginTop: 80 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { fontSize: 24, fontWeight: '800' },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6B21A8', justifyContent: 'center', alignItems: 'center' },
  subtitle: { fontSize: 14, marginBottom: 20 },
  error: { fontSize: 14, marginBottom: 12, textAlign: 'center' },
  emptyWrap: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 17, fontWeight: '600', marginTop: 16 },
  emptySub: { fontSize: 14, marginTop: 6, textAlign: 'center' },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '600', flex: 1 },
  completedText: { textDecorationLine: 'line-through', opacity: 0.6 },
  categoryLabel: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  progressSection: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  progressBar: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 13, fontWeight: '600', minWidth: 36, textAlign: 'right' },
  progressBtns: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  progBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  progBtnText: { fontSize: 13, fontWeight: '600' },
  aiComment: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, backgroundColor: '#F3F0FF', marginBottom: 8 },
  aiCommentText: { fontSize: 13, flex: 1 },
  deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deadlineText: { fontSize: 12 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '90%', backgroundColor: '#FFF', borderRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  input: { padding: 14, borderRadius: 12, borderWidth: 1, fontSize: 15, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  catBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  catText: { fontSize: 13, fontWeight: '500' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#6B21A8', padding: 14, borderRadius: 12 },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
