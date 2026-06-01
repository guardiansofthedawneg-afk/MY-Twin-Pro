import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTwinStore } from '../store/useTwinStore';
import { COLORS, FONTS } from '../utils/theme';
import { router } from 'expo-router';

const TEXTS = {
  ar: {
    title: '👤 الملف الشخصي',
    name: 'الاسم',
    email: 'البريد الإلكتروني',
    phone: 'رقم الهاتف',
    tier: 'الباقة الحالية',
    usage: 'الاستخدام',
    messagesLeft: 'الرسائل المتبقية اليوم',
    totalMessages: 'إجمالي المحادثات',
    avgTime: 'متوسط وقت المحادثة',
    activeDay: 'أكثر الأيام نشاطاً',
    bondLevel: 'مستوى الارتباط',
    bondTip: 'تحدث مع توأمك يومياً لزيادة الارتباط',
    editProfile: 'تعديل الملف',
    upgrade: 'ترقية',
    logout: 'تسجيل الخروج',
    deleteAccount: 'حذف الحساب',
  },
  en: {
    title: '👤 Profile',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    tier: 'Current Plan',
    usage: 'Usage',
    messagesLeft: 'Messages left today',
    totalMessages: 'Total conversations',
    avgTime: 'Average chat time',
    activeDay: 'Most active day',
    bondLevel: 'Bond Level',
    bondTip: 'Chat daily with your Twin to grow your bond',
    editProfile: 'Edit Profile',
    upgrade: 'Upgrade',
    logout: 'Logout',
    deleteAccount: 'Delete Account',
  },
};

export default function Profile() {
  
  const [profile, setProfile] = useState<Record<string, string | number | undefined>>({});
  const [usage, setUsage] = useState({ messages: 0, tokens: 0 });
  const { userId, tier, twinName, bondLevel, lang } = useTwinStore();
  const t = TEXTS[lang] || TEXTS['ar'];
  const stage = bondLevel >= 95 ? 'توأم روح' : bondLevel >= 80 ? 'ارتباط' : bondLevel >= 60 ? 'ثقة' : bondLevel >= 40 ? 'مقربين' : bondLevel >= 20 ? 'أصدقاء' : 'غرباء';

  useEffect(() => {
    if (!userId) return;
    // جلب الملف الشخصي
    supabase.from('profiles').select('*').eq('user_id', userId).single().then(({ data }) => setProfile(data || {}));
    // جلب الاستخدام اليومي
    const today = new Date().toISOString().split('T')[0];
    supabase.from('daily_usage').select('*').eq('user_id', userId).eq('date', today).single().then(({ data }) => setUsage(data || {}));
  }, [userId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      lang === 'ar' ? 'حذف الحساب' : 'Delete Account',
      lang === 'ar' ? 'هل أنت متأكد؟ هذا الإجراء لا يمكن التراجع عنه.' : 'Are you sure? This cannot be undone.',
      [
        { text: lang === 'ar' ? 'إلغاء' : 'Cancel', style: 'cancel' },
        { text: lang === 'ar' ? 'حذف' : 'Delete', style: 'destructive', onPress: async () => { await supabase.rpc('delete_user'); router.replace('/login'); } },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>{t.title}</Text>

      {/* بطاقة المعلومات الأساسية */}
      <View style={styles.card}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{twinName?.charAt(0)?.toUpperCase() || '?'}</Text></View>
        <Text style={styles.twinName}>{twinName}</Text>
        <Text style={styles.stage}>{stage} • {bondLevel.toFixed(0)}%</Text>
        <View style={styles.bondBar}><View style={[styles.bondFill, { width: `${Math.min(bondLevel, 100)}%` as any }]} /></View>
        <Text style={styles.bondTip}>{t.bondTip}</Text>
      </View>

      {/* معلومات الاتصال */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>معلومات الاتصال</Text>
        <View style={styles.row}><Text style={styles.label}>{t.name}</Text><Text style={styles.value}>{profile.full_name || '—'}</Text></View>
        <View style={styles.row}><Text style={styles.label}>{t.email}</Text><Text style={styles.value}>{profile.email || '—'}</Text></View>
        <View style={styles.row}><Text style={styles.label}>{t.phone}</Text><Text style={styles.value}>{profile.phone || '—'}</Text></View>
      </View>

      {/* الباقة والاستخدام */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.tier}</Text>
        <View style={styles.row}><Text style={styles.label}>{t.tier}</Text><Text style={[styles.value, { color: COLORS.primary, fontWeight: '700' }]}>{tier}</Text></View>
        <View style={styles.row}><Text style={styles.label}>{t.messagesLeft}</Text><Text style={styles.value}>{usage.messages || 0}</Text></View>
        <View style={styles.row}><Text style={styles.label}>{t.totalMessages}</Text><Text style={styles.value}>{profile.total_messages || 0}</Text></View>
      </View>

      {/* أزرار الإجراءات */}
      <TouchableOpacity style={styles.button} onPress={() => router.push('/subscription')}><Text style={styles.buttonText}>{t.upgrade}</Text></TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.logoutBtn]} onPress={handleLogout}><Text style={[styles.buttonText, { color: COLORS.primary }]}>{t.logout}</Text></TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.dangerBtn]} onPress={handleDeleteAccount}><Text style={[styles.buttonText, { color: '#EF4444' }]}>{t.deleteAccount}</Text></TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  title: { fontSize: FONTS.title, fontWeight: '800', color: COLORS.text, marginBottom: 20 },
  card: { alignItems: 'center', backgroundColor: COLORS.card, padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: COLORS.white, fontSize: 32, fontWeight: '700' },
  twinName: { color: COLORS.text, fontSize: FONTS.subtitle, fontWeight: '700' },
  stage: { color: COLORS.textSecondary, fontSize: FONTS.small, marginTop: 4 },
  bondBar: { width: '80%', height: 8, backgroundColor: COLORS.border, borderRadius: 4, marginTop: 12, overflow: 'hidden' },
  bondFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  bondTip: { color: COLORS.textSecondary, fontSize: FONTS.tiny, marginTop: 8, textAlign: 'center' },
  section: { backgroundColor: COLORS.card, padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle: { color: COLORS.text, fontSize: FONTS.subtitle, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  label: { color: COLORS.textSecondary, fontSize: FONTS.body },
  value: { color: COLORS.text, fontSize: FONTS.body },
  button: { backgroundColor: COLORS.primary, padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  buttonText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.body },
  logoutBtn: { backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.primary },
  dangerBtn: { backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: '#EF4444' },
});
