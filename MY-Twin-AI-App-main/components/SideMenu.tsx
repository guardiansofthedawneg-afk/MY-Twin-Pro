import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTwinStore } from '../store/useTwinStore';
import { router, Href } from 'expo-router';
import { Home, MessageCircle, History, User, BrainCircuit, Palette, Diamond, Settings, HelpCircle, LogOut, X, PlusCircle } from 'lucide-react-native';

export default function SideMenu({ onClose }: { onClose: () => void }) {
  const { lang, theme, clearHistory } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = theme === 'dark';
  const t = (ar: string, en: string) => isAr ? ar : en;

  const startNewChat = () => {
    clearHistory(); // مسح المحادثة الحالية
    onClose();
    router.push('/chat'); // الانتقال إلى شاشة الدردشة
  };

  const items = [
    { icon: Home, label: t('الرئيسية','Home'), route: '/chat' as Href },
    { icon: PlusCircle, label: t('دردشة جديدة','New Chat'), onPress: startNewChat }, // زر جديد
    { icon: MessageCircle, label: t('دردشة','Chat'), route: '/chat' as Href },
    { icon: History, label: t('سجل المحادثات','History'), route: '/history' as Href },
    { icon: User, label: t('الملف الشخصي','Profile'), route: '/profile' as Href },
    { icon: BrainCircuit, label: t('ذكريات','Memories'), route: '/memories' as Href },
    { icon: Palette, label: t('تخصيص','Customize'), route: '/customize' as Href },
    { icon: Diamond, label: t('الاشتراكات','Subscription'), route: '/subscription' as Href },
    { icon: Settings, label: t('الإعدادات','Settings'), route: '/settings' as Href },
  ];

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }]}>
      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <X size={24} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
      </TouchableOpacity>
      {items.map((item, i) => {
        const Icon = item.icon;
        const onPress = item.onPress || (() => { router.push(item.route!); onClose(); });
        return (
          <TouchableOpacity key={i} style={styles.item} onPress={onPress}>
            <Icon size={20} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
            <Text style={[styles.label, { color: isDark ? '#FFF' : '#1A1A1A' }]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity style={styles.item} onPress={() => { router.push('/help' as Href); onClose(); }}>
        <HelpCircle size={20} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
        <Text style={[styles.label, { color: isDark ? '#FFF' : '#1A1A1A' }]}>{t('مساعدة','Help')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 40 },
  closeBtn: { alignSelf: 'flex-end', marginBottom: 20 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  label: { fontSize: 15 },
});
