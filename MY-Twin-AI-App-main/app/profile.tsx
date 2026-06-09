import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useTwinStore } from '../store/useTwinStore';
import { router, Href } from 'expo-router';
import {
  User,
  Mail,
  Phone,
  Crown,
  Zap,
  MessageSquare,
  Edit,
  LogOut,
  Trash2,
  Sparkles,
  BrainCircuit,
} from 'lucide-react-native';

// ========== نصوص متعددة اللغات ====================
const TEXTS = {
  ar: {
    title: 'الملف الشخصي',
    name: 'الاسم',
    email: 'البريد الإلكتروني',
    phone: 'رقم الهاتف',
    tier: 'الباقة الحالية',
    messagesLeft: 'الرسائل المتبقية اليوم',
    totalMessages: 'إجمالي المحادثات',
    editProfile: 'تعديل',
    upgrade: 'ترقية',
    logout: 'تسجيل الخروج',
    deleteAccount: 'حذف الحساب',
    save: 'حفظ',
    cancel: 'إلغاء',
    contactInfo: 'معلومات الاتصال',
    usageInfo: 'الاستخدام',
    knowledge: 'ماذا يعرف عنك توأمك؟',
    noKnowledge: 'تحدث مع توأمك أكثر ليكتشف أسرارك 💜',
    loadError: 'تعذر تحميل الملف الشخصي',
    saveOk: 'تم حفظ التغييرات',
    saveFail: 'فشل الحفظ',
    deleteConfirm: 'هذا الإجراء لا يمكن التراجع عنه.',
    deleteFail: 'فشل الحذف. حاول مرة أخرى.',
  },
  en: {
    title: 'Profile',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    tier: 'Current Plan',
    messagesLeft: 'Messages left today',
    totalMessages: 'Total conversations',
    editProfile: 'Edit',
    upgrade: 'Upgrade',
    logout: 'Logout',
    deleteAccount: 'Delete Account',
    save: 'Save',
    cancel: 'Cancel',
    contactInfo: 'Contact Info',
    usageInfo: 'Usage',
    knowledge: 'What your Twin knows about you',
    noKnowledge: 'Chat more with your Twin to unlock secrets 💜',
    loadError: 'Failed to load profile',
    saveOk: 'Changes saved',
    saveFail: 'Save failed',
    deleteConfirm: 'This cannot be undone.',
    deleteFail: 'Delete failed. Please try again.',
  },
};

export default function Profile() {
  const { userId, tier, lang, theme, logout: storeLogout } = useTwinStore();
  const [profile, setProfile] = useState<Record<string, any>>({});
  const [usage, setUsage] = useState<{ messages: number }>({ messages: 0 });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [knowledge, setKnowledge] = useState<string[]>([]);
  const [loadingKnowledge, setLoadingKnowledge] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const t = TEXTS[lang] || TEXTS['ar'];
  const isDark = theme === 'dark';
  const isRTL = lang === 'ar';

  // ── تحميل بيانات الملف الشخصي ──────────────────
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (cancelled) return;
        if (error) {
          Alert.alert('❌', t.loadError);
          return;
        }

        const p = data || {};
        setProfile(p);
        setName(p.full_name || '');
        setPhone(p.phone || '');
      } catch {
        if (!cancelled) Alert.alert('❌', t.loadError);
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    };

    const loadUsage = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
          .from('daily_usage')
          .select('*')
          .eq('user_id', userId)
          .eq('date', today)
          .single();
        if (!cancelled && data) setUsage(data);
      } catch { /* silent */ }
    };

    loadProfile();
    loadUsage();
    return () => { cancelled = true; };
  }, [userId]);

  // ── جلب معرفة التوأم عن المستخدم ──────────────
  const fetchKnowledge = useCallback(async () => {
    if (!userId) return;
    setLoadingKnowledge(true);
    try {
      const [prefs, people] = await Promise.all([
        supabase
          .from('knowledge_entities')
          .select('entity_name, entity_type')
          .eq('user_id', userId)
          .in('entity_type', ['preference', 'person'])
          .limit(5),
        supabase
          .from('memories')
          .select('content')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(3),
      ]);

      const items: string[] = [];
      prefs.data?.forEach((p: any) => {
        const icon = p.entity_type === 'person' ? '👤' : '❤️';
        items.push(`${icon} ${p.entity_name}`);
      });
      people.data?.forEach((m: any) => {
        if (m.content && m.content.length < 60) items.push(`💬 ${m.content}`);
      });
      setKnowledge(items.slice(0, 5));
    } catch (e) {
      console.log('Knowledge fetch error:', e);
    } finally {
      setLoadingKnowledge(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchKnowledge();
  }, [fetchKnowledge]);

  // ── حفظ التغييرات ──────────────────────────────
  const handleSave = async () => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: name.trim(), phone: phone.trim() })
        .eq('id', userId);

      if (error) throw error;

      setProfile((p) => ({ ...p, full_name: name.trim(), phone: phone.trim() }));
      setEditing(false);
      Alert.alert('✅', t.saveOk);
    } catch {
      Alert.alert('❌', t.saveFail);
    }
  };

  // ── تسجيل الخروج ──────────────────────────────
  const handleLogout = async () => {
    await supabase.auth.signOut();
    storeLogout();  // ✅ مسح حالة الـ Zustand
    router.replace('/login');
  };

  // ── حذف الحساب ─────────────────────────────────
  const handleDelete = () => {
    Alert.alert(t.deleteAccount, t.deleteConfirm, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.deleteAccount,
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.rpc('delete_user', { user_id: userId });
            if (error) throw error;
            storeLogout();
            router.replace('/login');
          } catch {
            Alert.alert('❌', t.deleteFail);
          }
        },
      },
    ]);
  };

  // ─ـ مكون معلومات المعرفة ──────────────────────
  const KnowledgeSection = useMemo(() => {
    if (loadingKnowledge) {
      return <ActivityIndicator size="small" color="#6B21A8" style={{ marginVertical: 12 }} />;
    }
    if (knowledge.length === 0) {
      return <Text style={[s.emptyText, isDark && { color: '#888' }]}>{t.noKnowledge}</Text>;
    }
    return (
      <>
        {knowledge.map((item, i) => (
          <View key={i} style={[s.knowledgeItem, isDark && { borderBottomColor: '#444' }]}>
            <Sparkles size={14} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
            <Text style={[s.knowledgeText, isDark && { color: '#E0E0E0' }]}>{item}</Text>
          </View>
        ))}
      </>
    );
  }, [loadingKnowledge, knowledge, isDark, t.noKnowledge]);

  if (loadingProfile) {
    return (
      <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#6B21A8" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
      <ScrollView
        style={s.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* العنوان */}
        <Text style={[s.title, isDark && { color: '#FFF' }]}>{t.title}</Text>

        {/* بطاقة المستخدم */}
        <View style={[s.card, isDark && { backgroundColor: '#2A2A2A', borderColor: '#333' }]}>
          <View style={s.avatar}>
            <User size={44} stroke="#FFF" />
          </View>
          <Text style={[s.name, isDark && { color: '#FFF' }]}>
            {profile.full_name || '—'}
          </Text>
          <Text style={[s.email, isDark && { color: '#CCC' }]}>
            {profile.email || '—'}
          </Text>
        </View>

        {/* المعرفة */}
        <View style={[s.section, isDark && { backgroundColor: '#2A2A2A', borderColor: '#333' }]}>
          <View style={[s.sectionHeader, isRTL && { flexDirection: 'row-reverse' }]}>
            <BrainCircuit size={18} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
            <Text style={[s.sectionTitle, isDark && { color: '#FFF' }]}>{t.knowledge}</Text>
          </View>
          {KnowledgeSection}
        </View>

        {/* معلومات الاتصال */}
        <View style={[s.section, isDark && { backgroundColor: '#2A2A2A', borderColor: '#333' }]}>
          <View style={[s.sectionHeader, isRTL && { flexDirection: 'row-reverse' }]}>
            <User size={18} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
            <Text style={[s.sectionTitle, isDark && { color: '#FFF' }]}>{t.contactInfo}</Text>
          </View>

          {editing ? (
            <>
              <View style={[s.row, isRTL && { flexDirection: 'row-reverse' }, isDark && { borderBottomColor: '#444' }]}>
                <User size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
                <TextInput
                  style={[s.input, isDark && { backgroundColor: '#333', color: '#FFF' }]}
                  placeholder={t.name}
                  placeholderTextColor={isDark ? '#888' : '#AAA'}
                  value={name}
                  onChangeText={setName}
                />
              </View>
              <View style={[s.row, isRTL && { flexDirection: 'row-reverse' }, isDark && { borderBottomColor: '#444' }]}>
                <Phone size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
                <TextInput
                  style={[s.input, isDark && { backgroundColor: '#333', color: '#FFF' }]}
                  placeholder={t.phone}
                  placeholderTextColor={isDark ? '#888' : '#AAA'}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={s.btnRow}>
                <TouchableOpacity style={[s.smallBtn, { backgroundColor: '#6B21A8' }]} onPress={handleSave}>
                  <Text style={s.smallBtnText}>{t.save}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.smallBtn, { backgroundColor: '#F0F0F0' }]} onPress={() => setEditing(false)}>
                  <Text style={[s.smallBtnText, { color: '#666' }]}>{t.cancel}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={[s.row, isRTL && { flexDirection: 'row-reverse' }, isDark && { borderBottomColor: '#444' }]}>
                <User size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
                <Text style={[s.value, isDark && { color: '#FFF' }]}>{profile.full_name || '—'}</Text>
              </View>
              <View style={[s.row, isRTL && { flexDirection: 'row-reverse' }, isDark && { borderBottomColor: '#444' }]}>
                <Mail size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
                <Text style={[s.value, isDark && { color: '#FFF' }]}>{profile.email || '—'}</Text>
              </View>
              <View style={[s.row, isRTL && { flexDirection: 'row-reverse' }, isDark && { borderBottomColor: '#444' }]}>
                <Phone size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
                <Text style={[s.value, isDark && { color: '#FFF' }]}>{profile.phone || '—'}</Text>
              </View>
            </>
          )}
        </View>

        {/* الاستخدام */}
        <View style={[s.section, isDark && { backgroundColor: '#2A2A2A', borderColor: '#333' }]}>
          <View style={[s.sectionHeader, isRTL && { flexDirection: 'row-reverse' }]}>
            <Zap size={18} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
            <Text style={[s.sectionTitle, isDark && { color: '#FFF' }]}>{t.usageInfo}</Text>
          </View>
          <View style={[s.row, isRTL && { flexDirection: 'row-reverse' }, isDark && { borderBottomColor: '#444' }]}>
            <Crown size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
            <Text style={s.label}>{t.tier}</Text>
            <Text style={[s.value, isDark && { color: '#FFF' }]}>{tier}</Text>
          </View>
          <View style={[s.row, isRTL && { flexDirection: 'row-reverse' }, isDark && { borderBottomColor: '#444' }]}>
            <Zap size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
            <Text style={s.label}>{t.messagesLeft}</Text>
            <Text style={[s.value, isDark && { color: '#FFF' }]}>{usage.messages || 0}</Text>
          </View>
          <View style={[s.row, isRTL && { flexDirection: 'row-reverse' }, isDark && { borderBottomColor: '#444' }]}>
            <MessageSquare size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
            <Text style={s.label}>{t.totalMessages}</Text>
            <Text style={[s.value, isDark && { color: '#FFF' }]}>{profile.total_messages || 0}</Text>
          </View>
        </View>

        {/* أزرار الإجراءات */}
        <TouchableOpacity style={s.btn} onPress={() => router.push('/subscription' as Href)}>
          <Crown size={16} stroke="#FFF" />
          <Text style={s.btnText}>{t.upgrade}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.btn, s.outlineBtn]} onPress={handleLogout}>
          <LogOut size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
          <Text style={[s.btnText, { color: isDark ? '#D8B4FE' : '#6B21A8' }]}>{t.logout}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.btn, s.dangerBtn]} onPress={handleDelete}>
          <Trash2 size={16} stroke="#EF4444" />
          <Text style={[s.btnText, { color: '#EF4444' }]}>{t.deleteAccount}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F8F6F2', padding: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#1A1A1A', marginBottom: 16 },
  card: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0D9F5',
    shadowColor: '#6B21A8',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#6B21A8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  name: { color: '#1A1A1A', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  email: { color: '#888', fontSize: 14 },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    // بدلاً من gap
    columnGap: 8,
  },
  sectionTitle: { color: '#1A1A1A', fontSize: 15, fontWeight: '700' },
  knowledgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  knowledgeText: { color: '#444', fontSize: 14, flex: 1 },
  emptyText: { color: '#AAA', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  label: { color: '#888', fontSize: 13, flex: 1 },
  value: { color: '#1A1A1A', fontSize: 14, fontWeight: '500', flex: 2 },
  input: {
    flex: 1,
    backgroundColor: '#F8F6F2',
    color: '#1A1A1A',
    padding: 10,
    borderRadius: 8,
    fontSize: 14,
  },
  btnRow: { flexDirection: 'row', columnGap: 10, marginTop: 10 },
  smallBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
  smallBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    backgroundColor: '#6B21A8',
    padding: 14,
    borderRadius: 12,
    marginTop: 10,
    shadowColor: '#6B21A8',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  outlineBtn: { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#6B21A8' },
  dangerBtn: { backgroundColor: '#FFF5F5', borderWidth: 1.5, borderColor: '#FFCDD2' },
});
