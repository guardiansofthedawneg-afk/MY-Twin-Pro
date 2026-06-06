import { SafeAreaView, View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTwinStore } from '../store/useTwinStore';
import { HelpCircle, MessageCircle, Shield, Phone } from 'lucide-react-native';

export default function Help() {
  const { lang, theme } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = theme === 'dark';
  const t = (ar: string, en: string) => isAr ? ar : en;

  const faqs = [
    { q: t('كيف أغير اسم التوأم؟','How to change twin name?'), a: t('من الإعدادات > تخصيص التوأم','Settings > Customize Twin') },
    { q: t('كيف أشارك كود الإحالة؟','How to share referral?'), a: t('من القائمة > الإحالة','Menu > Referral') },
    { q: t('هل محادثاتي خاصة؟','Are my chats private?'), a: t('نعم، جميع المحادثات مشفرة.','Yes, all chats are encrypted.') },
    { q: t('كيف أستمع لرد التوأم؟','How to hear twin reply?'), a: t('اضغط على أيقونة الصوت في الأعلى.','Press the volume icon on top.') },
    { q: t('كيف أرفع صورة؟','How to upload an image?'), a: t('اضغط على + ثم اختر الكاميرا أو المعرض.','Press + then choose camera or gallery.') },
    { q: t('ما الباقات المتاحة؟','What plans are available?'), a: t('Free, Plus, Premium, Pro, Yearly','Free, Plus, Premium, Pro, Yearly') },
  ];

  return (
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
      <ScrollView style={[s.container, isDark && { backgroundColor: '#1A1A1A' }]} contentContainerStyle={{ padding: 20 }}>
        <Text style={[s.title, isDark && { color: '#FFF' }]}>{t('المساعدة','Help')}</Text>
        <HelpCircle size={40} stroke={isDark ? '#D8B4FE' : '#6B21A8'} style={{ alignSelf: 'center', marginBottom: 24 }} />

        <Text style={[s.sectionTitle, isDark && { color: '#FFF' }]}>{t('الأسئلة الشائعة','FAQ')}</Text>
        {faqs.map((faq, i) => (
          <View key={i} style={[s.faqCard, isDark && { backgroundColor: '#2A2A2A', borderColor: '#444' }]}>
            <MessageCircle size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
            <View style={{ flex: 1 }}>
              <Text style={[s.faqQ, isDark && { color: '#FFF' }]}>{faq.q}</Text>
              <Text style={[s.faqA, isDark && { color: '#CCC' }]}>{faq.a}</Text>
            </View>
          </View>
        ))}

        <Text style={[s.sectionTitle, isDark && { color: '#FFF' }]}>{t('اتصل بنا','Contact Us')}</Text>
        <View style={[s.contactCard, isDark && { backgroundColor: '#2A2A2A', borderColor: '#444' }]}>
          <Phone size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
          <Text style={[s.contactText, isDark && { color: '#CCC' }]}>support@mytwin.app</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F8F6F2' },
  title: { fontSize: 24, fontWeight: '800', color: '#1A1A1A', marginBottom: 20, textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 12, marginTop: 20 },
  faqCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, backgroundColor: '#FFF', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#F0F0F0' },
  faqQ: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 },
  faqA: { fontSize: 14, color: '#666' },
  contactCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#F0F0F0' },
  contactText: { fontSize: 15, color: '#1A1A1A' },
});
