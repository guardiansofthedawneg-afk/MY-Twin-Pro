import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTwinStore } from '../store/useTwinStore';
import { router, Href, usePathname } from 'expo-router';
import { supabase } from '../lib/supabase';
import {
  Home, MessageCircle, History, User, BrainCircuit, Palette,
  Diamond, Settings, HelpCircle, LogOut, X, PlusCircle, Gift,
  Sparkles, BatteryFull, BatteryMedium, BatteryLow, Heart
} from 'lucide-react-native';

export default function SideMenu({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const { lang, theme, twinName, bondLevel, energy, tier, clearHistory } = useTwinStore((s) => ({
    lang: s.lang, theme: s.theme, twinName: s.twinName,
    bondLevel: s.bondLevel, energy: s.energy, tier: s.tier, clearHistory: s.clearHistory,
  }));

  const isAr = lang === 'ar';
  const isDark = theme === 'dark';
  const t = (ar: string, en: string) => isAr ? ar : en;

  const navigate = (route: Href) => { router.replace(route); onClose(); };
  const startNewChat = () => { clearHistory(); onClose(); navigate('/chat'); };

  const handleLogout = () => {
    Alert.alert(t('تسجيل الخروج', 'Logout'), t('هل أنت متأكد؟', 'Are you sure?'), [
      { text: t('إلغاء', 'Cancel'), style: 'cancel' },
      { text: t('خروج', 'Logout'), style: 'destructive', onPress: async () => { await supabase.auth.signOut(); router.replace('/login'); } },
    ]);
  };

  const isActive = (route: string) => {
    if (route === '/chat' && (pathname === '/chat' || pathname === '/')) return true;
    return pathname === route;
  };

  const items = [
    { icon: Home, label: t('الرئيسية','Home'), route: '/chat' as Href },
    { icon: PlusCircle, label: t('دردشة جديدة','New Chat'), onPress: startNewChat },
    { icon: History, label: t('سجل المحادثات','History'), route: '/history' as Href },
    { icon: User, label: t('الملف الشخصي','Profile'), route: '/profile' as Href },
    { icon: BrainCircuit, label: t('ذكريات','Memories'), route: '/memories' as Href },
    { icon: Palette, label: t('تخصيص','Customize'), route: '/customize' as Href },
    { icon: Diamond, label: t('الاشتراكات','Subscription'), route: '/subscription' as Href },
    { icon: Gift, label: t('الإحالة','Referral'), route: '/referral' as Href },
    { icon: Settings, label: t('الإعدادات','Settings'), route: '/settings' as Href },
  ];

  const getEnergyIcon = () => {
    if (energy >= 70) return <BatteryFull size={18} stroke="#10B981" />;
    if (energy >= 30) return <BatteryMedium size={18} stroke="#F59E0B" />;
    return <BatteryLow size={18} stroke="#EF4444" />;
  };

  const tierLabel: Record<string, string> = {
    free: t('مجاني', 'Free'),
    free_trial_14d: t('تجربة مجانية', 'Free Trial'),
    premium_trial: t('تجربة مميزة', 'Premium Trial'),
    plus: 'Plus',
    premium: 'Premium',
    pro: 'Pro',
    yearly: t('سنوي', 'Yearly'),
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top + 20, backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }]} contentContainerStyle={{ paddingBottom: 40 }}>
      <TouchableOpacity style={styles.closeBtn} onPress={onClose}><X size={24} stroke={isDark ? '#D8B4FE' : '#6B21A8'} /></TouchableOpacity>

      <View style={styles.userCard}>
        <View style={styles.avatar}><Sparkles size={28} stroke="#A855F7" /></View>
        <View style={{ flex: 1, marginLeft: isAr ? 0 : 12, marginRight: isAr ? 12 : 0 }}>
          <Text style={[styles.userName, isDark && { color: '#FFF' }]}>{twinName || t('توأمك', 'Your Twin')}</Text>
          <View style={styles.bondRow}>
            <Heart size={14} stroke="#EC4899" fill="#EC4899" />
            <Text style={[styles.bondValue, isDark && { color: '#F472B6' }]}>{t('رابطة', 'Bond')} {Math.round(bondLevel)}%</Text>
          </View>
          <Text style={[styles.tierText, isDark && { color: '#D8B4FE' }]}>{tierLabel[tier] || tier}</Text>
        </View>
      </View>

      <View style={[styles.vitalSection, isDark && { borderColor: '#333' }]}>
        <View style={styles.vitalRow}>{getEnergyIcon()}<Text style={[styles.vitalLabel, isDark && { color: '#CCC' }]}>{t('طاقة التوأم', 'Twin Energy')}</Text><Text style={[styles.vitalValue, isDark && { color: '#D8B4FE' }]}>{Math.round(energy)}%</Text></View>
        <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${Math.min(energy, 100)}%`, backgroundColor: energy >= 70 ? '#10B981' : energy >= 30 ? '#F59E0B' : '#EF4444' }]} /></View>
      </View>

      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.route as string);
        const onPress = item.onPress || (() => navigate(item.route!));
        return (
          <TouchableOpacity key={item.route ? item.route as string : item.label} style={[styles.item, isAr && styles.itemRTL, active && styles.activeItem]} onPress={onPress}>
            <Icon size={20} stroke={active ? '#A855F7' : isDark ? '#D8B4FE' : '#6B21A8'} />
            <Text style={[styles.itemLabel, isDark && { color: '#FFF' }, active && { color: '#A855F7', fontWeight: '600' }]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity style={[styles.item, isAr && styles.itemRTL]} onPress={() => navigate('/help' as Href)}>
        <HelpCircle size={20} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
        <Text style={[styles.itemLabel, isDark && { color: '#FFF' }]}>{t('مساعدة','Help')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.item, isAr && styles.itemRTL, { marginTop: 20 }]} onPress={handleLogout}>
        <LogOut size={20} stroke="#EF4444" />
        <Text style={[styles.itemLabel, { color: '#EF4444' }]}>{t('تسجيل الخروج','Logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  closeBtn: { alignSelf: 'flex-end', marginBottom: 24 },
  userCard: { flexDirection: 'row', alignItems: 'center', paddingBottom: 16, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E8E8E3' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F0FF', justifyContent: 'center', alignItems: 'center' },
  userName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  bondRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  bondValue: { fontSize: 12, color: '#6B21A8', fontWeight: '500' },
  tierText: { fontSize: 12, color: '#6B21A8', fontWeight: '500', marginTop: 2 },
  vitalSection: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E8E8E3', paddingVertical: 16, marginBottom: 16 },
  vitalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  vitalLabel: { fontSize: 13, color: '#666', flex: 1 },
  vitalValue: { fontSize: 14, fontWeight: '700', color: '#6B21A8' },
  progressBar: { height: 6, backgroundColor: '#F0F0F0', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 12, marginBottom: 2 },
  itemRTL: { flexDirection: 'row-reverse' },
  activeItem: { backgroundColor: '#F3F0FF', borderLeftWidth: 3, borderLeftColor: '#A855F7' },
  itemLabel: { fontSize: 15, color: '#1A1A1A', fontWeight: '500' },
});
