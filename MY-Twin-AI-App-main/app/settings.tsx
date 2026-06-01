import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert, Linking } from 'react-native';
import { router } from 'expo-router';
import { useTwinStore } from '../store/useTwinStore';
import { supabase } from '../lib/supabase';
import { API } from '../lib/api';
import { COLORS, FONTS } from '../utils/theme';

const TEXTS = {
  ar: {
    title: 'الإعدادات',
    tier: 'الخطة الحالية',
    calm: '🕊️ وضع الهدوء',
    lang: '🌐 اللغة',
    upgrade: '💎 ترقية الخطة',
    goals: '🎯 أهدافي',
    emergency: '🆘 دعم طوارئ نفسي',
    mood: '📊 لوحة المشاعر',
    timeline: '📅 خط الذكريات',
    privacy: '📜 سياسة الخصوصية',
    export: '📤 تصدير بياناتي',
    logout: 'تسجيل الخروج',
    delete: '🗑️ حذف الحساب نهائياً',
    deleteTitle: 'حذف نهائي',
    deleteMsg: 'لا يمكن التراجع. سيتم حذف جميع ذكرياتك وبياناتك نهائياً.',
    cancel: 'إلغاء',
    confirmDelete: 'حذف',
    exportTitle: 'تصدير البيانات',
    company: 'Soul Sync Ltd.',
    companyDesc: 'MyTwin — شريكك الرقمي الذكي',
  },
  en: {
    title: 'Settings',
    tier: 'Current Plan',
    calm: '🕊️ Calm Mode',
    lang: '🌐 Language',
    upgrade: '💎 Upgrade Plan',
    goals: '🎯 My Goals',
    emergency: '🆘 Emergency Support',
    mood: '📊 Mood Board',
    timeline: '📅 Memory Timeline',
    privacy: '📜 Privacy Policy',
    export: '📤 Export My Data',
    logout: 'Sign Out',
    delete: '🗑️ Delete Account',
    deleteTitle: 'Delete Account',
    deleteMsg: 'This is irreversible. All your memories and data will be permanently deleted.',
    cancel: 'Cancel',
    confirmDelete: 'Delete',
    exportTitle: 'Export Data',
    company: 'Soul Sync Ltd.',
    companyDesc: 'MyTwin — Your Intelligent Digital Companion',
  },
};

export default function Settings() {
  const { tier, calmMode, toggleCalmMode, lang, toggleLang, theme, toggleTheme } = useTwinStore();
  const t = TEXTS[lang];

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  const deleteAccount = () => {
    Alert.alert(t.deleteTitle, t.deleteMsg, [
      { text: t.cancel },
      {
        text: t.confirmDelete,
        style: 'destructive',
        onPress: async () => {
          await API.delete('/api/account');
          await supabase.auth.signOut();
          router.replace('/');
        },
      },
    ]);
  };

  const handleExport = async () => {
    try {
      const { data } = await API.get('/api/export');
      Alert.alert(t.exportTitle, JSON.stringify(data, null, 2));
    } catch {
      Alert.alert('خطأ', 'فشل تصدير البيانات');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{t.title}</Text>
        <View style={styles.tierBadge}>
          <Text style={styles.tierText}>{t.tier}: {tier}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>{t.calm}</Text>
          <Switch value={calmMode} onValueChange={toggleCalmMode} trackColor={{ false: '#DDD', true: COLORS.primary }} thumbColor={calmMode ? '#FFF' : '#F4F4F4'} accessibilityLabel={t.calm} />
        </View>

        {/* زر تغيير اللغة */}
        <View style={styles.row}>
          <Text style={styles.label}>{t.lang}</Text>
          <TouchableOpacity onPress={toggleLang} style={styles.langBtn}>
            <Text style={styles.langText}>{lang === 'ar' ? 'AR 🇸🇦' : 'EN 🇬🇧'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={() => router.push('/subscription')} accessibilityLabel={t.upgrade}>
          <Text style={styles.buttonText}>{t.upgrade}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => router.push('/goals')} accessibilityLabel={t.goals}>
          <Text style={styles.buttonText}>{t.goals}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => router.push('/mood')} accessibilityLabel={t.mood}>
          <Text style={styles.buttonText}>{t.mood}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => router.push('/timeline')} accessibilityLabel={t.timeline}>
          <Text style={styles.buttonText}>{t.timeline}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => router.push('/privacy')} accessibilityLabel={t.privacy}>
          <Text style={styles.buttonText}>{t.privacy}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleExport} accessibilityLabel={t.export}>
          <Text style={styles.buttonText}>{t.export}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => Linking.openURL('https://findahelpline.com')} accessibilityLabel={t.emergency}>
          <Text style={[styles.buttonText, { color: '#E57373' }]}>{t.emergency}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.logoutBtn]} onPress={logout} accessibilityLabel={t.logout}>
          <Text style={[styles.buttonText, { color: COLORS.primary }]}>{t.logout}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.dangerBtn]} onPress={deleteAccount} accessibilityLabel={t.delete}>
          <Text style={[styles.buttonText, { color: '#FF5252' }]}>{t.delete}</Text>
        </TouchableOpacity>

        <View style={styles.branding}>
          <Text style={styles.brandingText}>{t.company}</Text>
          <Text style={styles.brandingSub}>{t.companyDesc}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  card: { padding: 20, gap: 12 },
  title: { fontSize: FONTS.title, fontWeight: '800', color: COLORS.text, marginBottom: 10 },
  tierBadge: { backgroundColor: '#F3F0FF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 8, borderWidth: 1, borderColor: '#E0D9F5' },
  tierText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8F6F2', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E0D9F5' },
  label: { color: COLORS.text, fontSize: 15, fontWeight: '500' },
  langBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  langText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  button: { backgroundColor: '#F8F6F2', padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E0D9F5' },
  buttonText: { color: COLORS.text, fontWeight: '600', fontSize: 15 },
  logoutBtn: { borderColor: COLORS.primary, borderWidth: 1.5 },
  dangerBtn: { borderColor: '#FFCDD2', backgroundColor: '#FFF5F5' },
  branding: { alignItems: 'center', paddingVertical: 20, marginTop: 10, borderTopWidth: 1, borderTopColor: '#E0D9F5' },
  brandingText: { color: COLORS.primary, fontWeight: '700', fontSize: 15 },
  brandingSub: { color: '#A09BB5', fontSize: 12, marginTop: 2 },
});
