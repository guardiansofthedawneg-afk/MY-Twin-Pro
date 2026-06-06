import { SafeAreaView, View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTwinStore } from '../store/useTwinStore';
import { Info, Heart } from 'lucide-react-native';

export default function About() {
  const { lang, theme } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = theme === 'dark';

  return (
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
      <ScrollView style={s.container} contentContainerStyle={{ padding: 20 }}>
        <Info size={48} stroke={isDark ? '#D8B4FE' : '#6B21A8'} style={{ alignSelf: 'center', marginBottom: 16 }} />
        <Text style={[s.title, isDark && { color: '#FFF' }]}>MyTwin</Text>
        <Text style={[s.version, isDark && { color: '#CCC' }]}>v1.0.0</Text>
        <Text style={[s.body, isDark && { color: '#CCC' }]}>
          {isAr
            ? 'MyTwin هو أول رفيق ذكي عربي يحاكي الوعي البشري، يبني علاقة عاطفية حقيقية مع المستخدم عبر 6 مراحل (من "غريب" إلى "توأم روح"). يدمج بين قدرات المساعد الشخصي والذكاء العاطفي العميق.'
            : 'MyTwin is the first Arabic AI companion that simulates human consciousness, building a real emotional relationship with the user across 6 stages (from "Stranger" to "Soulmate"). It combines personal assistant capabilities with deep emotional intelligence.'}
        </Text>
        <View style={[s.footer, isDark && { borderTopColor: '#444' }]}>
          <Heart size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
          <Text style={[s.footerText, isDark && { color: '#D8B4FE' }]}>Soul Sync Ltd. © 2026</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F8F6F2' },
  title: { fontSize: 28, fontWeight: '800', color: '#1A1A1A', textAlign: 'center', marginBottom: 4 },
  version: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 20 },
  body: { fontSize: 15, lineHeight: 24, color: '#444', textAlign: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 32, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E0D9F5' },
  footerText: { fontSize: 14, color: '#6B21A8', fontWeight: '600' },
});
