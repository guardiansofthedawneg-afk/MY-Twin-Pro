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

  const {
    lang, theme, twinName, bondLevel, energy, tier,
    logout: storeLogout, clearHistory
  } = useTwinStore((s) => ({
    lang: s.lang,
    theme: s.theme,
    twinName: s.twinName,
    bondLevel: s.bondLevel,
    energy: s.energy,
    tier: s.tier,
    logout: s.logout,
    clearHistory: s.clearHistory,
  }));

  const isAr = lang === 'ar';
  const isDark = theme === 'dark';
  const t = (ar: string, en: string) => isAr ? ar : en;

  // ── التنقل مع استبدال المسار ──────────────────
  const navigate = (route: Href) => {
    router.replace(route);
    onClose();
  };

  const startNewChat = () => {
    clearHistory();
    onClose();
    navigate('/chat');
  };

  // ── تسجيل الخروج ──────────────────────────────
  const handleLogout = () => {
    Alert.alert(
      t('تسجيل الخروج', 'Logout'),
      t('هل أنت متأكد؟', 'Are you sure?'),
      [
        { text: t('إلغاء', 'Cancel'), style: 'cancel' },
        {
          text: t('خروج', 'Logout'),
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            storeLogout();
            onClose();
            router.replace('/login');
          },
        },
      ]
    );
  };

  // ─ـ تحديد المسار النشط ────────────────────────
  const isActive = (route: string) => {
    if (route === '/chat' && (pathname === '/chat' || pathname === '/')) return true;
    return pathname === route;
  };

  // ─ـ عناصر القائمة ─────────────────────────────
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

  // ─ـ مؤشرات الطاقة ─────────────────────────────
  const getEnergyIcon = () => {
    if (energy >= 70) return <BatteryFull size={18} stroke="#10B981" />;
    if (energy >= 30) return <BatteryMedium size={18} stroke="#F59E0B" />;
    return <BatteryLow size={18} stroke="#EF4444" />;
  };

  // ─ـ تسمية الباقة ──────────────────────────────
  const tierLabel = {
    free: t('مجاني', 'Free'),
    plus: 'Plus',
    premium: 'Premium',
    pro: 'Pro',
    yearly: t('سنوي', 'Yearly'),
  }[tier] || tier;

  return (
    <ScrollView
      style={[
        styles.container,
        { paddingTop: insets.top + 20, backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' },
      ]}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* زر الإغلاق */}
      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <X size={24} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
      </TouchableOpacity>

      {/* بطاقة التوأم */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Sparkles size={28} stroke="#A855F7" />
        </View>
        <View style={{ flex: 1, marginLeft: isAr ? 0 : 12, marginRight: isAr ? 12 : 0, alignItems: isAr ? 'flex-end' : 'flex-start' }}>
          <Text style={[styles.userName, isDark && { color: '#FFF' }]} numberOfLines={1}>
            {twinName || t('توأمك', 'Your Twin')}
          </Text>
          <View style={[styles.bondRow, isAr && { flexDirection: 'row-reverse' }]}>
            <Heart size={14} stroke="#EC4899" fill="#EC4899" />
            <Text style={[styles.bondValue, isDark && { color: '#F472B6' }]}>
              {t('رابطة', 'Bond')} {Math.round(bondLevel)}%
            </Text>
          </View>
          <View style={[styles.tierBadge, isDark && { backgroundColor: '#A855F733' }]}>
            <Diamond size={12} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
            <Text style={[styles.tierText, isDark && { color: '#D8B4FE' }]}>{tierLabel}</Text>
          </View>
        </View>
      </View>

      {/* مؤشرات حيوية */}
      <View style={[styles.vitalSection, isDark && { borderColor: '#333' }]}>
        <View style={styles.vitalRow}>
          {getEnergyIcon()}
          <Text style={[styles.vitalLabel, isDark && { color: '#CCC' }]}>
            {t('طاقة التوأم', 'Twin Energy')}
          </Text>
          <Text style={[styles.vitalValue, isDark && { color: '#D8B4FE' }]}>
            {Math.round(energy)}%
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(energy, 100)}%`,
                backgroundColor: energy >= 70 ? '#10B981' : energy >= 30 ? '#F59E0B' : '#EF4444',
              },
            ]}
          />
        </View>
        <View style={styles.vitalRow}>
          <Heart size={14} stroke="#EC4899" fill="#EC4899" />
          <Text style={[styles.vitalLabel, isDark && { color: '#CCC' }]}>
            {t('مستوى الرابطة', 'Bond Level')}
          </Text>
          <Text style={[styles.vitalValue, isDark && { color: '#F472B6' }]}>
            {Math.round(bondLevel)}%
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(bondLevel, 100)}%`,
                backgroundColor: bondLevel >= 80 ? '#EC4899' : bondLevel >= 40 ? '#A855F7' : '#60A5FA',
              },
            ]}
          />
        </View>
      </View>

      {/* عناصر القائمة */}
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.route as string);
        const onPress = item.onPress || (() => navigate(item.route!));
        return (
          <TouchableOpacity
            key={item.route ? item.route as string : item.label}
            style={[
              styles.item,
              isAr && styles.itemRTL,
              active && [styles.activeItem, isDark && { backgroundColor: '#A855F722' }],
            ]}
            onPress={onPress}
          >
            <Icon size={20} stroke={active ? '#A855F7' : isDark ? '#D8B4FE' : '#6B21A8'} />
            <Text style={[styles.itemLabel, isDark && { color: '#FFF' }, active && { color: '#A855F7', fontWeight: '600' }]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* مساعدة وخروج */}
      <TouchableOpacity
        style={[styles.item, isAr && styles.itemRTL]}
        onPress={() => navigate('/help' as Href)}
      >
        <HelpCircle size={20} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
        <Text style={[styles.itemLabel, isDark && { color: '#FFF' }]}>{t('مساعدة','Help')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.item, isAr && styles.itemRTL, { marginTop: 20 }]}
        onPress={handleLogout}
      >
        <LogOut size={20} stroke="#EF4444" />
        <Text style={[styles.itemLabel, { color: '#EF4444' }]}>{t('تسجيل الخروج','Logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  closeBtn: { alignSelf: 'flex-end', marginBottom: 24 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E3',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  bondRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  bondValue: { fontSize: 12, color: '#6B21A8', fontWeight: '500' },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: '#F3F0FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  tierText: { fontSize: 11, fontWeight: '600', color: '#6B21A8' },
  vitalSection: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E8E8E3',
    paddingVertical: 16,
    marginBottom: 16,
  },
  vitalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  vitalLabel: { fontSize: 13, color: '#666', flex: 1 },
  vitalValue: { fontSize: 14, fontWeight: '700', color: '#6B21A8' },
  progressBar: {
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: { height: '100%', borderRadius: 3 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 12,
    marginBottom: 2,
  },
  itemRTL: { flexDirection: 'row-reverse' },
  activeItem: {
    backgroundColor: '#F3F0FF',
    borderLeftWidth: 3,
    borderLeftColor: '#A855F7',
  },
  itemLabel: { fontSize: 15, color: '#1A1A1A', fontWeight: '500' },
});
