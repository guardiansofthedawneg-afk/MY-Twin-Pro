import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, TextInput, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTwinStore } from '../store/useTwinStore';
import { router, Href } from 'expo-router';
import { User, Mail, Phone, Crown, Zap, MessageSquare, Edit, LogOut, Trash2, Sparkles, BrainCircuit } from 'lucide-react-native';

type AppRoute = Href & '/subscription';

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
  },
};

export default function Profile() {
  const { userId, tier, lang, theme, logout } = useTwinStore();
  const [profile, setProfile] = useState<Record<string, any>>({});
  const [usage, setUsage] = useState({ messages: 0 });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [knowledge, setKnowledge] = useState<string[]>([]);
  const [loadingKnowledge, setLoadingKnowledge] = useState(true);
  const t = TEXTS[lang] || TEXTS['ar'];
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!userId) return;
    supabase.from('profiles').select('*').eq('id', userId).single().then(({ data }) => {
      const p = data || {};
      setProfile(p);
      setName(p.full_name || '');
      setPhone(p.phone || '');
    });
    const today = new Date().toISOString().split('T')[0];
    supabase.from('daily_usage').select('*').eq('user_id', userId).eq('date', today).single().then(({ data }) => setUsage(data || { messages: 0 }));
    fetchKnowledge();
  }, [userId]);

  const fetchKnowledge = async () => {
    try {
      const [prefs, people] = await Promise.all([
        supabase.from('knowledge_preferences').select('content').eq('user_id', userId).limit(3),
        supabase.from('knowledge_people').select('content').eq('user_id', userId).limit(2),
      ]);
      const items: string[] = [];
      prefs.data?.forEach((p: any) => items.push(`❤️ ${p.content}`));
      people.data?.forEach((p: any) => items.push(`👤 ${p.content}`));
      setKnowledge(items);
    } catch (e) {
      console.log('Knowledge fetch failed:', e);
    } finally {
      setLoadingKnowledge(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    await supabase.from('profiles').update({ full_name: name, phone }).eq('id', userId);
    setProfile((p: any) => ({ ...p, full_name: name, phone }));
    setEditing(false);
    Alert.alert('✅', lang === 'ar' ? 'تم حفظ التغييرات' : 'Changes saved');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const handleDelete = () => {
    Alert.alert(t.deleteAccount, lang === 'ar' ? 'هذا الإجراء لا يمكن التراجع عنه.' : 'This cannot be undone.', [
      { text: t.cancel, style: 'cancel' },
      { text: t.deleteAccount, style: 'destructive', onPress: async () => { await supabase.rpc('delete_user'); router.replace('/login'); } },
    ]);
  };

  return (
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* عنوان الصفحة */}
        <Text style={[s.title, isDark && { color: '#FFF' }]}>{t.title}</Text>

        {/* بطاقة المستخدم (بدون بيانات التوأم) */}
        <View style={[s.card, isDark && { backgroundColor: '#2A2A2A', borderColor: '#333' }]}>
          <View style={s.avatar}>
            <User size={44} stroke="#FFF" />
          </View>
          <Text style={[s.name, isDark && { color: '#FFF' }]}>{profile.full_name || '—'}</Text>
          <Text style={[s.email, isDark && { color: '#CCC' }]}>{profile.email || '—'}</Text>
        </View>

        {/* المعرفة الشخصية */}
        <View style={[s.section, isDark && { backgroundColor: '#2A2A2A', borderColor: '#333' }]}>
          <View style={s.sectionHeader}>
            <BrainCircuit size={18} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
            <Text style={[s.sectionTitle, isDark && { color: '#FFF' }]}>{t.knowledge}</Text>
          </View>
          {loadingKnowledge ? (
            <ActivityIndicator size="small" color="#6B21A8" style={{ marginVertical: 12 }} />
          ) : knowledge.length > 0 ? (
            knowledge.map((item, i) => (
              <View key={i} style={[s.knowledgeItem, isDark && { borderBottomColor: '#444' }]}>
                <Sparkles size={14} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
                <Text style={[s.knowledgeText, isDark && { color: '#E0E0E0' }]}>{item}</Text>
              </View>
            ))
          ) : (
            <Text style={[s.emptyText, isDark && { color: '#888' }]}>{t.noKnowledge}</Text>
          )}
        </View>

        {/* معلومات الاتصال */}
        <View style={[s.section, isDark && { backgroundColor: '#2A2A2A', borderColor: '#333' }]}>
          <View style={s.sectionHeader}>
            <User size={18} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
            <Text style={[s.sectionTitle, isDark && { color: '#FFF' }]}>{t.contactInfo}</Text>
          </View>
          {editing ? (
            <>
              <View style={[s.row, isDark && { borderBottomColor: '#444' }]}>
                <User size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
                <TextInput style={[s.input, isDark && { backgroundColor: '#333', color: '#FFF' }]} placeholder={t.name} value={name} onChangeText={setName} />
              </View>
              <View style={[s.row, isDark && { borderBottomColor: '#444' }]}>
                <Phone size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
                <TextInput style={[s.input, isDark && { backgroundColor: '#333', color: '#FFF' }]} placeholder={t.phone} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
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
              <View style={[s.row, isDark && { borderBottomColor: '#444' }]}>
                <User size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
                <Text style={[s.value, isDark && { color: '#FFF' }]}>{profile.full_name || '—'}</Text>
              </View>
              <View style={[s.row, isDark && { borderBottomColor: '#444' }]}>
                <Mail size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
                <Text style={[s.value, isDark && { color: '#FFF' }]}>{profile.email || '—'}</Text>
              </View>
              <View style={[s.row, isDark && { borderBottomColor: '#444' }]}>
                <Phone size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
                <Text style={[s.value, isDark && { color: '#FFF' }]}>{profile.phone || '—'}</Text>
              </View>
            </>
          )}
        </View>

        {/* الاستخدام */}
        <View style={[s.section, isDark && { backgroundColor: '#2A2A2A', borderColor: '#333' }]}>
          <View style={s.sectionHeader}>
            <Zap size={18} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
            <Text style={[s.sectionTitle, isDark && { color: '#FFF' }]}>{t.usageInfo}</Text>
          </View>
          <View style={[s.row, isDark && { borderBottomColor: '#444' }]}>
            <Crown size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
            <Text style={s.label}>{t.tier}</Text>
            <Text style={[s.value, isDark && { color: '#FFF' }]}>{tier}</Text>
          </View>
          <View style={[s.row, isDark && { borderBottomColor: '#444' }]}>
            <Zap size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
            <Text style={s.label}>{t.messagesLeft}</Text>
            <Text style={[s.value, isDark && { color: '#FFF' }]}>{usage.messages || 0}</Text>
          </View>
          <View style={[s.row, isDark && { borderBottomColor: '#444' }]}>
            <MessageSquare size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
            <Text style={s.label}>{t.totalMessages}</Text>
            <Text style={[s.value, isDark && { color: '#FFF' }]}>{profile.total_messages || 0}</Text>
          </View>
        </View>

        {/* أزرار الإجراءات */}
        <TouchableOpacity style={s.btn} onPress={() => router.push('/subscription' as AppRoute)}>
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
  card: { alignItems: 'center', backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: '#E0D9F5', shadowColor: '#6B21A8', shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#6B21A8', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  name: { color: '#1A1A1A', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  email: { color: '#888', fontSize: 14 },
  section: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 14, borderWidth: 1, borderColor: '#F0F0F0', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { color: '#1A1A1A', fontSize: 15, fontWeight: '700' },
  knowledgeItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  knowledgeText: { color: '#444', fontSize: 14, flex: 1 },
  emptyText: { color: '#AAA', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F8F8F8' },
  label: { color: '#888', fontSize: 13, flex: 1 },
  value: { color: '#1A1A1A', fontSize: 14, fontWeight: '500', flex: 2 },
  input: { flex: 1, backgroundColor: '#F8F6F2', color: '#1A1A1A', padding: 10, borderRadius: 8, fontSize: 14 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  smallBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
  smallBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#6B21A8', padding: 14, borderRadius: 12, marginTop: 10, shadowColor: '#6B21A8', shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  outlineBtn: { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#6B21A8' },
  dangerBtn: { backgroundColor: '#FFF5F5', borderWidth: 1.5, borderColor: '#FFCDD2' },
});
