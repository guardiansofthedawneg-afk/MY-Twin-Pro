import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTwinStore } from '../store/useTwinStore';
import { router, Href } from 'expo-router';
import { Home, MessageCircle, History, User, BrainCircuit, Palette, Diamond, Settings, HelpCircle, LogOut, X, PlusCircle, Gift, Heart, BatteryFull, BatteryMedium, BatteryLow } from 'lucide-react-native';

export default function SideMenu({ onClose }: { onClose: () => void }) {
  const { lang, theme, clearHistory, energy, twinName } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = theme === 'dark';
  const t = (ar: string, en: string) => isAr ? ar : en;

  const startNewChat = () => {
    clearHistory();
    onClose();
    router.push('/chat');
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

  const getBatteryIcon = () => {
    if (energy >= 70) return <BatteryFull size={16} stroke="#10B981" />;
    if (energy >= 30) return <BatteryMedium size={16} stroke="#F59E0B" />;
    return <BatteryLow size={16} stroke="#EF4444" />;
  };

  return (
    <View style={[s.container, { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }]}>
      {/* زر الإغلاق */}
      <TouchableOpacity style={s.closeBtn} onPress={onClose}>
        <X size={24} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
      </TouchableOpacity>

      {/* عناصر القائمة */}
      {items.map((item, i) => {
        const Icon = item.icon;
        const onPress = item.onPress || (() => { router.push(item.route!); onClose(); });
        return (
          <TouchableOpacity key={i} style={s.item} onPress={onPress}>
            <Icon size={22} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
            <Text style={[s.label, { color: isDark ? '#FFF' : '#1A1A1A' }]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}

      {/* المساعدة */}
      <TouchableOpacity style={s.item} onPress={() => { router.push('/help' as Href); onClose(); }}>
        <HelpCircle size={22} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
        <Text style={[s.label, { color: isDark ? '#FFF' : '#1A1A1A' }]}>{t('مساعدة','Help')}</Text>
      </TouchableOpacity>

      {/* بطارية التوأم العاطفية */}
      <View style={[s.batterySection, isDark && { borderTopColor: '#444' }]}>
        <View style={s.batteryRow}>
          {getBatteryIcon()}
          <Text style={[s.batteryLabel, isDark && { color: '#CCC' }]}>
            {t('طاقة التوأم', 'Twin Energy')}
          </Text>
          <Text style={[s.batteryValue, isDark && { color: '#D8B4FE' }]}>
            {Math.round(energy)}%
          </Text>
        </View>
        <View style={s.batteryBar}>
          <View style={[s.batteryFill, { width: `${Math.min(energy, 100)}%`, backgroundColor: energy >= 70 ? '#10B981' : energy >= 30 ? '#F59E0B' : '#EF4444' }]} />
        </View>
        <Text style={[s.batteryName, isDark && { color: '#888' }]}>
          {twinName || (isAr ? 'توأمك' : 'Your Twin')}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 40 },
  closeBtn: { alignSelf: 'flex-end', marginBottom: 24 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 12, marginBottom: 2 },
  label: { fontSize: 16, fontWeight: '500' },
  batterySection: { marginTop: 'auto', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E0D9F5' },
  batteryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  batteryLabel: { fontSize: 13, color: '#666', flex: 1 },
  batteryValue: { fontSize: 15, fontWeight: '700', color: '#6B21A8' },
  batteryBar: { height: 6, backgroundColor: '#F0F0F0', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  batteryFill: { height: '100%', borderRadius: 3 },
  batteryName: { fontSize: 12, color: '#AAA', textAlign: 'center' },
});
