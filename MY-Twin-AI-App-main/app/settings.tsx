import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert, Linking } from 'react-native';
import { router, Href } from 'expo-router';
import { useTwinStore } from '../store/useTwinStore';
import { supabase } from '../lib/supabase';
import { API } from '../lib/api';
import { 
  Moon, 
  Sun, 
  Globe, 
  Crown, 
  Target, 
  HeartPulse, 
  History, 
  Shield, 
  Download, 
  LogOut, 
  Trash2, 
  Phone, 
  BrainCircuit, 
  Database, 
  Cpu, 
  HardDrive, 
  Sparkles,
  Zap
} from 'lucide-react-native';

type AppRoute = Href & ('/subscription'|'/goals'|'/mood'|'/timeline'|'/privacy'|'/help');

const TEXTS = {
  ar: {
    title: 'الإعدادات', tier: 'الخطة الحالية', calm: 'وضع الهدوء', lang: 'اللغة', theme: 'المظهر', upgrade: 'ترقية الخطة',
    goals: 'أهدافي', emergency: 'دعم طوارئ نفسي', mood: 'لوحة المشاعر', timeline: 'خط الذكريات', privacy: 'سياسة الخصوصية',
    export: 'تصدير بياناتي', logout: 'تسجيل الخروج', delete: 'حذف الحساب', deleteTitle: 'حذف نهائي',
    deleteMsg: 'لا يمكن التراجع. سيتم حذف جميع ذكرياتك وبياناتك نهائياً.', cancel: 'إلغاء', confirmDelete: 'حذف', exportTitle: 'تصدير البيانات',
    company: 'Soul Sync Ltd.', companyDesc: 'MyTwin — شريكك الرقمي الذكي',
    aiStats: 'إحصائيات الذكاء الاصطناعي', modelsActive: 'نماذج نشطة', memoriesStored: 'ذكريات مخزنة',
    dailyRequests: 'طلبات اليوم', latency: 'متوسط السرعة',
  },
  en: {
    title: 'Settings', tier: 'Current Plan', calm: 'Calm Mode', lang: 'Language', theme: 'Theme', upgrade: 'Upgrade Plan',
    goals: 'My Goals', emergency: 'Emergency Support', mood: 'Mood Board', timeline: 'Memory Timeline', privacy: 'Privacy Policy',
    export: 'Export My Data', logout: 'Sign Out', delete: 'Delete Account', deleteTitle: 'Delete Account',
    deleteMsg: 'This is irreversible. All your memories and data will be permanently deleted.', cancel: 'Cancel', confirmDelete: 'Delete', exportTitle: 'Export Data',
    company: 'Soul Sync Ltd.', companyDesc: 'MyTwin — Your Intelligent Digital Companion',
    aiStats: 'AI Statistics', modelsActive: 'Active Models', memoriesStored: 'Memories Stored',
    dailyRequests: 'Daily Requests', latency: 'Avg Latency',
  },
};

export default function Settings() {
  const { tier, calmMode, toggleCalmMode, lang, toggleLang, theme, toggleTheme, bondLevel } = useTwinStore();
  const t = TEXTS[lang] || TEXTS['ar'];
  const isDark = theme === 'dark';

  const logout = async () => { await supabase.auth.signOut(); router.replace('/login'); };
  const deleteAccount = () => {
    Alert.alert(t.deleteTitle, t.deleteMsg, [
      { text:t.cancel, style:'cancel' },
      { text:t.confirmDelete, style:'destructive', onPress: async () => { await API.delete('/api/account'); await supabase.auth.signOut(); router.replace('/login'); } },
    ]);
  };
  const handleExport = async () => {
    try {
      const { data } = await API.get('/api/me/export');
      Alert.alert(t.exportTitle, JSON.stringify(data,null,2).slice(0,500)+'...');
    } catch { Alert.alert('خطأ', 'فشل تصدير البيانات'); }
  };

  const handleEmergency = () => {
    Linking.openURL('https://findahelpline.com');
  };

  // إحصائيات AI التجريبية (يمكن ربطها لاحقًا بنقطة نهاية حقيقية)
  const aiStats = {
    models: 8,
    memories: Math.floor(bondLevel * 10),
    daily: Math.floor(Math.random() * 150) + 50,
    latency: '560ms',
  };

  return (
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
      <ScrollView style={s.container}>
        <View style={s.content}>
          <Text style={[s.title, isDark && { color: '#FFF' }]}>{t.title}</Text>

          {/* الباقة الحالية */}
          <View style={[s.tierBadge, isDark && { backgroundColor: '#2A2A2A', borderColor: '#444' }]}>
            <Crown size={14} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
            <Text style={[s.tierText, isDark && { color: '#D8B4FE' }]}> {t.tier}: {tier}</Text>
          </View>

          {/* المظهر */}
          <View style={[s.row, isDark && { backgroundColor: '#2A2A2A', borderColor: '#444' }]}>
            <View style={s.rowLeft}>
              {theme === 'dark' ? <Moon size={18} stroke="#D8B4FE" /> : <Sun size={18} stroke="#6B21A8" />}
              <Text style={[s.label, isDark && { color: '#FFF' }]}>{t.theme}</Text>
            </View>
            <Switch value={theme === 'dark'} onValueChange={toggleTheme} trackColor={{false:'#DDD', true:'#6B21A8'}} thumbColor={theme === 'dark' ? '#FFF' : '#F4F4F4'} />
          </View>

          {/* وضع الهدوء */}
          <View style={[s.row, isDark && { backgroundColor: '#2A2A2A', borderColor: '#444' }]}>
            <View style={s.rowLeft}>
              <HeartPulse size={18} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
              <Text style={[s.label, isDark && { color: '#FFF' }]}>{t.calm}</Text>
            </View>
            <Switch value={calmMode} onValueChange={toggleCalmMode} trackColor={{false:'#DDD', true:'#6B21A8'}} thumbColor={calmMode ? '#FFF' : '#F4F4F4'} />
          </View>

          {/* اللغة */}
          <View style={[s.row, isDark && { backgroundColor: '#2A2A2A', borderColor: '#444' }]}>
            <View style={s.rowLeft}>
              <Globe size={18} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
              <Text style={[s.label, isDark && { color: '#FFF' }]}>{t.lang}</Text>
            </View>
            <TouchableOpacity onPress={toggleLang} style={s.langBtn}>
              <Text style={s.langText}>{lang === 'ar' ? 'AR' : 'EN'}</Text>
            </TouchableOpacity>
          </View>

          {/* أزرار التنقل */}
          {[
            { icon:Crown, label:t.upgrade, route:'/subscription' as AppRoute },
            { icon:Target, label:t.goals, route:'/goals' as AppRoute },
            { icon:HeartPulse, label:t.mood, route:'/mood' as AppRoute },
            { icon:History, label:t.timeline, route:'/timeline' as AppRoute },
            { icon:Shield, label:t.privacy, route:'/privacy' as AppRoute },
          ].map(({ icon:Icon, label, route }) => (
            <TouchableOpacity key={route} style={[s.btn, isDark && { backgroundColor: '#D8B4FE' }]} onPress={()=>router.push(route)}>
              <Icon size={16} stroke={isDark ? '#1A1A1A' : '#FFF'} />
              <Text style={[s.btnText, isDark && { color: '#1A1A1A' }]}>{label}</Text>
            </TouchableOpacity>
          ))}

          {/* تصدير البيانات */}
          <TouchableOpacity style={[s.btn, isDark && { backgroundColor: '#D8B4FE' }]} onPress={handleExport}>
            <Download size={16} stroke={isDark ? '#1A1A1A' : '#FFF'} />
            <Text style={[s.btnText, isDark && { color: '#1A1A1A' }]}>{t.export}</Text>
          </TouchableOpacity>

          {/* قسم إحصائيات AI (تجريبي) */}
          <View style={[s.aiSection, isDark && { backgroundColor: '#2A2A2A', borderColor: '#444' }]}>
            <View style={s.sectionHeader}>
              <BrainCircuit size={18} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
              <Text style={[s.sectionTitle, isDark && { color: '#FFF' }]}>{t.aiStats}</Text>
              <Sparkles size={14} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
            </View>
            <View style={s.statsGrid}>
              <View style={[s.statCard, isDark && { backgroundColor: '#333' }]}>
                <Cpu size={18} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
                <Text style={[s.statValue, isDark && { color: '#FFF' }]}>{aiStats.models}</Text>
                <Text style={[s.statLabel, isDark && { color: '#CCC' }]}>{t.modelsActive}</Text>
              </View>
              <View style={[s.statCard, isDark && { backgroundColor: '#333' }]}>
                <Database size={18} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
                <Text style={[s.statValue, isDark && { color: '#FFF' }]}>{aiStats.memories}</Text>
                <Text style={[s.statLabel, isDark && { color: '#CCC' }]}>{t.memoriesStored}</Text>
              </View>
              <View style={[s.statCard, isDark && { backgroundColor: '#333' }]}>
                <HardDrive size={18} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
                <Text style={[s.statValue, isDark && { color: '#FFF' }]}>{aiStats.daily}</Text>
                <Text style={[s.statLabel, isDark && { color: '#CCC' }]}>{t.dailyRequests}</Text>
              </View>
              <View style={[s.statCard, isDark && { backgroundColor: '#333' }]}>
                <Zap size={18} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
                <Text style={[s.statValue, isDark && { color: '#FFF' }]}>{aiStats.latency}</Text>
                <Text style={[s.statLabel, isDark && { color: '#CCC' }]}>{t.latency}</Text>
              </View>
            </View>
          </View>

          {/* طوارئ نفسي */}
          <TouchableOpacity style={[s.btn, { backgroundColor: '#FFF3F3', borderColor: '#FFCDD2', borderWidth: 1 }]} onPress={handleEmergency}>
            <Phone size={16} stroke="#EF4444" />
            <Text style={[s.btnText, { color: '#EF4444' }]}>{t.emergency}</Text>
          </TouchableOpacity>

          {/* تسجيل الخروج */}
          <TouchableOpacity style={[s.btn, s.outlineBtn, isDark && { backgroundColor: '#2A2A2A' }]} onPress={logout}>
            <LogOut size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
            <Text style={[s.btnText, { color: isDark ? '#D8B4FE' : '#6B21A8' }]}>{t.logout}</Text>
          </TouchableOpacity>

          {/* حذف الحساب */}
          <TouchableOpacity style={[s.btn, s.dangerBtn]} onPress={deleteAccount}>
            <Trash2 size={16} stroke="#EF4444" />
            <Text style={[s.btnText, { color: '#EF4444' }]}>{t.delete}</Text>
          </TouchableOpacity>

          {/* العلامة التجارية */}
          <View style={[s.branding, isDark && { borderTopColor: '#444' }]}>
            <Text style={[s.brandingTitle, isDark && { color: '#D8B4FE' }]}>{t.company}</Text>
            <Text style={s.brandingSub}>{t.companyDesc}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  container:{ flex:1, backgroundColor:'#F8F6F2' },
  content:{ padding:20, gap:10 },
  title:{ fontSize:24, fontWeight:'800', color:'#1A1A1A', marginBottom:8 },
  tierBadge:{ flexDirection:'row', alignItems:'center', backgroundColor:'#F3F0FF', paddingHorizontal:14, paddingVertical:8, borderRadius:10, alignSelf:'flex-start', marginBottom:4, borderWidth:1, borderColor:'#E0D9F5' },
  tierText:{ color:'#6B21A8', fontWeight:'600', fontSize:14 },
  row:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', backgroundColor:'#FFFFFF', padding:14, borderRadius:12, borderWidth:1, borderColor:'#F0F0F0' },
  rowLeft:{ flexDirection:'row', alignItems:'center', gap:8 },
  label:{ color:'#1A1A1A', fontSize:15, fontWeight:'500' },
  langBtn:{ backgroundColor:'#6B21A8', paddingHorizontal:16, paddingVertical:8, borderRadius:20 },
  langText:{ color:'#FFF', fontWeight:'600', fontSize:14 },
  btn:{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, backgroundColor:'#6B21A8', padding:14, borderRadius:12 },
  btnText:{ color:'#FFF', fontWeight:'600', fontSize:15 },
  outlineBtn:{ backgroundColor:'#FFFFFF', borderWidth:1.5, borderColor:'#6B21A8' },
  dangerBtn:{ backgroundColor:'#FFF5F5', borderWidth:1.5, borderColor:'#FFCDD2' },
  aiSection: { backgroundColor:'#FFFFFF', padding:16, borderRadius:16, borderWidth:1, borderColor:'#F0F0F0', marginVertical:4 },
  sectionHeader: { flexDirection:'row', alignItems:'center', gap:8, marginBottom:12 },
  sectionTitle: { color:'#1A1A1A', fontSize:15, fontWeight:'700', flex:1 },
  statsGrid: { flexDirection:'row', flexWrap:'wrap', gap:8 },
  statCard: { flex:1, minWidth:'45%', backgroundColor:'#F8F6F2', padding:12, borderRadius:12, alignItems:'center', gap:4 },
  statValue: { fontSize:20, fontWeight:'800', color:'#1A1A1A' },
  statLabel: { fontSize:11, color:'#888', textAlign:'center' },
  branding:{ alignItems:'center', paddingVertical:20, marginTop:8, borderTopWidth:1, borderTopColor:'#E0D9F5' },
  brandingTitle:{ color:'#6B21A8', fontWeight:'700', fontSize:15 },
  brandingSub:{ color:'#A09BB5', fontSize:12, marginTop:2 },
});
