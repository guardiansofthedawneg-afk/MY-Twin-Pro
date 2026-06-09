import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTwinStore } from '../store/useTwinStore';
import { router, Href, usePathname } from 'expo-router';
import { supabase } from '../lib/supabase';
import {
  Home, MessageCircle, History, User, BrainCircuit, Palette,
  Diamond, Settings, HelpCircle, LogOut, Gift, Sparkles
} from 'lucide-react-native';

export default function CustomDrawerContent({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  
  const {
    lang, theme, twinName, bondLevel, energy, tier,
    logout: storeLogout
  } = useTwinStore((s) => ({
    lang: s.lang,
    theme: s.theme,
    twinName: s.twinName,
    bondLevel: s.bondLevel,
    energy: s.energy,
    tier: s.tier,
    logout: s.logout,
  }));
  
  const isAr = lang === 'ar';
  const isDark = theme === 'dark';
  const t = (ar: string, en: string) => isAr ? ar : en;

  // ── عناصر القائمة ─────────────────────────────
  const items = [
    { icon: Home, label: t('الرئيسية','Home'), route: '/chat' as Href },
    { icon: MessageCircle, label: t('دردشة','Chat'), route: '/chat' as Href },
    { icon: History, label: t('المحادثات السابقة','History'), route: '/history' as Href },
    { icon: User, label: t('الملف الشخصي','Profile'), route: '/profile' as Href },
    { icon: BrainCircuit, label: t('ذكريات','Memories'), route: '/memories' as Href },
    { icon: Palette, label: t('تخصيص','Customize'), route: '/customize' as Href },
    { icon: Diamond, label: t('الاشتراكات','Subscription'), route: '/subscription' as Href },
    { icon: Gift, label: t('الإحالة','Referral'), route: '/referral' as Href },
    { icon: Settings, label: t('الإعدادات','Settings'), route: '/settings' as Href },
  ];

  // ── هل المسار نشط؟ ────────────────────────────
  const isActive = (route: string) => {
    if (route === '/chat' && (pathname === '/chat' || pathname === '/')) return true;
    return pathname === route;
  };

  // ── تسجيل الخروج ──────────────────────────────
  const handleLogout = async () => {
    Alert.alert(
      t('تسجيل الخروج', 'Logout'),
      t('هل أنت متأكد أنك تريد تسجيل الخروج؟', 'Are you sure you want to logout?'),
      [
        { text: t('إلغاء', 'Cancel'), style: 'cancel' },
        {
          text: t('تسجيل الخروج', 'Logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              storeLogout();
              onClose();
              router.replace('/login' as Href);
            } catch (e) {
              console.error('Logout error:', e);
            }
          },
        },
      ]
    );
  };

  // ── التنقل مع استبدال المسار ──────────────────
  const navigate = (route: Href) => {
    router.replace(route);
    onClose();
  };

  // ── تسمية الباقة ──────────────────────────────
  const tierLabel = {
    free: t('مجاني', 'Free'),
    plus: 'Plus',
    premium: 'Premium',
    pro: 'Pro',
    yearly: t('سنوي', 'Yearly'),
  }[tier] || tier;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }, isDark && { backgroundColor: '#1A1A1A' }]}>
      {/* ── بطاقة المستخدم ─────────────────────── */}
      <View style={[styles.userCard, isDark && { borderBottomColor: '#333' }]}>
        <View style={styles.avatar}>
          <Sparkles size={24} stroke="#A855F7" />
        </View>
        <View style={{ flex: 1, marginLeft: isAr ? 0 : 12, marginRight: isAr ? 12 : 0, alignItems: isAr ? 'flex-end' : 'flex-start' }}>
          <Text style={[styles.userName, isDark && { color: '#FFF' }]} numberOfLines={1}>
            {twinName || t('توأمك', 'Your Twin')}
          </Text>
          <View style={[styles.bondRow, isAr && { flexDirection: 'row-reverse' }]}>
            <Text style={[styles.bondText, isDark && { color: '#D8B4FE' }]}>
              {t('رابطة', 'Bond')} {Math.round(bondLevel)}%
            </Text>
            <Text style={[styles.energyText, isDark && { color: '#FBBF24' }]}>
              ⚡ {Math.round(energy)}%
            </Text>
          </View>
          <View style={[styles.tierBadge, isDark && { backgroundColor: '#A855F733' }]}>
            <Diamond size={12} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
            <Text style={[styles.tierText, isDark && { color: '#D8B4FE' }]}>{tierLabel}</Text>
          </View>
        </View>
      </View>

      {/* ── عناصر القائمة ──────────────────────── */}
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.route as string);
        return (
          <TouchableOpacity
            key={item.route as string}
            style={[
              styles.item,
              isAr && styles.itemRTL,
              active && [styles.activeItem, isDark && { backgroundColor: '#A855F722' }],
            ]}
            onPress={() => navigate(item.route)}
          >
            <Icon
              size={20}
              stroke={active ? '#A855F7' : isDark ? '#D8B4FE' : '#6B21A8'}
            />
            <Text
              style={[
                styles.label,
                isDark && { color: '#FFF' },
                active && { color: '#A855F7', fontWeight: '600' },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* ── مساعدة ─────────────────────────────── */}
      <TouchableOpacity
        style={[styles.item, isAr && styles.itemRTL]}
        onPress={() => navigate('/help' as Href)}
      >
        <HelpCircle size={20} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
        <Text style={[styles.label, isDark && { color: '#FFF' }]}>{t('مساعدة','Help')}</Text>
      </TouchableOpacity>

      {/* ── تسجيل الخروج ───────────────────────── */}
      <TouchableOpacity
        style={[styles.item, isAr && styles.itemRTL, { marginTop: 'auto' }]}
        onPress={handleLogout}
      >
        <LogOut size={20} stroke="#EF4444" />
        <Text style={[styles.label, { color: '#EF4444' }]}>{t('تسجيل الخروج','Logout')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 4,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E3',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  bondRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  bondText: {
    fontSize: 12,
    color: '#6B21A8',
    fontWeight: '500',
  },
  energyText: {
    fontSize: 12,
    color: '#B8860B',
    fontWeight: '500',
  },
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
  tierText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B21A8',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
  },
  itemRTL: {
    flexDirection: 'row-reverse',
  },
  activeItem: {
    backgroundColor: '#F3F0FF',
    borderLeftWidth: 3,
    borderLeftColor: '#A855F7',
  },
  label: {
    fontSize: 15,
    color: '#1A1A1A',
  },
});
