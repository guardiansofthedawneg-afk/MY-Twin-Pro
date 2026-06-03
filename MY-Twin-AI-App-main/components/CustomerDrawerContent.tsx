import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTwinStore } from '../store/useTwinStore';
import { router, Href } from 'expo-router';
import { Home, MessageCircle, History, User, BrainCircuit, Palette, Diamond, Settings, HelpCircle, Info, LogOut } from 'lucide-react-native';

export default function CustomDrawerContent({ onClose }: { onClose: () => void }) {
  const { lang, tier } = useTwinStore();
  const isAr = lang === 'ar';
  const t = (ar: string, en: string) => isAr ? ar : en;

  const items = [
    { icon: Home, label: t('الرئيسية','Home'), route: '/' },
    { icon: MessageCircle, label: t('دردشة','Chat'), route: '/chat' },
    { icon: History, label: t('المحادثات السابقة','History'), route: '/history' },
    { icon: User, label: t('الملف الشخصي','Profile'), route: '/profile' },
    { icon: BrainCircuit, label: t('ذكريات','Memories'), route: '/memories' },
    { icon: Palette, label: t('تخصيص','Customize'), route: '/customize' },
    { icon: Diamond, label: t('الاشتراكات','Subscription'), route: '/subscription' },
    { icon: Settings, label: t('الإعدادات','Settings'), route: '/settings' },
  ];

  return (
    <View style={styles.container}>
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <TouchableOpacity key={i} style={styles.item} onPress={() => { router.push(item.route as Href); onClose(); }}>
            <Icon size={20} stroke="#6B21A8" />
            <Text style={styles.label}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity style={styles.item} onPress={() => { router.push('/logout' as Href); onClose(); }}>
        <LogOut size={20} stroke="#EF4444" />
        <Text style={[styles.label, { color: '#EF4444' }]}>{t('تسجيل الخروج','Logout')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  label: { fontSize: 15, color: '#1A1A1A' },
});
