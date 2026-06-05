import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTwinStore } from '../store/useTwinStore';
import { router, Href } from 'expo-router';
import { User, Mail, Phone, Crown, Zap, MessageSquare, Edit, LogOut, Trash2 } from 'lucide-react-native';

type AppRoute = Href & '/subscription';

const TEXTS = {
  ar: {
    title: 'الملف الشخصي', name: 'الاسم', email: 'البريد الإلكتروني', phone: 'رقم الهاتف',
    tier: 'الباقة الحالية', messagesLeft: 'الرسائل المتبقية اليوم', totalMessages: 'إجمالي المحادثات',
    bondTip: 'تحدث مع توأمك يومياً لزيادة الارتباط', editProfile: 'تعديل', upgrade: 'ترقية', logout: 'تسجيل الخروج',
    deleteAccount: 'حذف الحساب', save: 'حفظ', cancel: 'إلغاء', contactInfo: 'معلومات الاتصال', usageInfo: 'الاستخدام',
  },
  en: {
    title: 'Profile', name: 'Name', email: 'Email', phone: 'Phone', tier: 'Current Plan',
    messagesLeft: 'Messages left today', totalMessages: 'Total conversations', bondTip: 'Chat daily with your Twin to grow your bond',
    editProfile: 'Edit', upgrade: 'Upgrade', logout: 'Logout', deleteAccount: 'Delete Account', save: 'Save', cancel: 'Cancel',
    contactInfo: 'Contact Info', usageInfo: 'Usage',
  },
};

export default function Profile() {
  const { userId, tier, twinName, bondLevel, lang, setTwinName, theme } = useTwinStore();
  const [profile, setProfile] = useState<Record<string, any>>({});
  const [usage, setUsage] = useState({ messages:0 });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const t = TEXTS[lang] || TEXTS['ar'];
  const isDark = theme === 'dark';

  const stage = bondLevel >= 95 ? (lang==='ar'?'توأم روح':'Soulmate') : bondLevel >= 80 ? (lang==='ar'?'ارتباط':'Bonded') : bondLevel >= 60 ? (lang==='ar'?'ثقة':'Trusted') : bondLevel >= 40 ? (lang==='ar'?'مقربين':'Close') : bondLevel >= 20 ? (lang==='ar'?'أصدقاء':'Friends') : (lang==='ar'?'غرباء':'Strangers');

  useEffect(() => {
    if (!userId) return;
    supabase.from('profiles').select('*').eq('id', userId).single().then(({ data }) => { setProfile(data||{}); setName(data?.full_name||''); setPhone(data?.phone||''); });
    const today = new Date().toISOString().split('T')[0];
    supabase.from('daily_usage').select('*').eq('user_id', userId).eq('date', today).single().then(({ data }) => setUsage(data||{ messages:0 }));
  }, [userId]);

  const handleSave = async () => {
    if (!userId) return;
    await supabase.from('profiles').update({ full_name:name, phone }).eq('id', userId);
    setProfile(p=>({...p, full_name:name, phone}));
    if (name) setTwinName(name);
    setEditing(false);
    Alert.alert('✅', lang==='ar'?'تم حفظ التغييرات':'Changes saved');
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.replace('/login'); };
  const handleDelete = () => {
    Alert.alert(t.deleteAccount, lang==='ar'?'هذا الإجراء لا يمكن التراجع عنه.':'This cannot be undone.', [
      { text:t.cancel, style:'cancel' },
      { text:t.deleteAccount, style:'destructive', onPress: async () => { await supabase.rpc('delete_user'); router.replace('/login'); } },
    ]);
  };

  return (
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
    <ScrollView style={[s.container, isDark && { backgroundColor: '#1A1A1A' }]} contentContainerStyle={{ paddingBottom:40 }}>
      <Text style={[s.title, isDark && { color: '#FFF' }]}>{t.title}</Text>
      <View style={[s.card, isDark && { backgroundColor: '#2A2A2A', borderColor: '#333' }]}>
        <View style={s.avatar}><User size={40} stroke="#FFF" /></View>
        <Text style={[s.twinName, isDark && { color: '#FFF' }]}>{twinName}</Text>
        <Text style={s.stage}>{stage} • {bondLevel.toFixed(0)}%</Text>
        <View style={s.bondBar}><View style={[s.bondFill, { width:`${Math.min(bondLevel,100)}%` }]} /></View>
        <Text style={s.bondTip}>{t.bondTip}</Text>
      </View>
      <View style={[s.section, isDark && { backgroundColor: '#2A2A2A', borderColor: '#333' }]}>
        <Text style={[s.sectionTitle, isDark && { color: '#FFF' }]}>{t.contactInfo}</Text>
        {editing ? (
          <>
            <View style={[s.row, isDark && { borderBottomColor: '#444' }]}><User size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} /><TextInput style={[s.input, isDark && { backgroundColor: '#333', color: '#FFF' }]} placeholder={t.name} value={name} onChangeText={setName} /></View>
            <View style={[s.row, isDark && { borderBottomColor: '#444' }]}><Phone size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} /><TextInput style={[s.input, isDark && { backgroundColor: '#333', color: '#FFF' }]} placeholder={t.phone} value={phone} onChangeText={setPhone} keyboardType="phone-pad" /></View>
            <View style={s.btnRow}>
              <TouchableOpacity style={[s.smallBtn,{backgroundColor:'#6B21A8'}]} onPress={handleSave}><Text style={s.smallBtnText}>{t.save}</Text></TouchableOpacity>
              <TouchableOpacity style={[s.smallBtn,{backgroundColor:'#F0F0F0'}]} onPress={()=>setEditing(false)}><Text style={[s.smallBtnText,{color:'#666'}]}>{t.cancel}</Text></TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={[s.row, isDark && { borderBottomColor: '#444' }]}><User size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} /><Text style={[s.value, isDark && { color: '#FFF' }]}>{profile.full_name||'—'}</Text></View>
            <View style={[s.row, isDark && { borderBottomColor: '#444' }]}><Mail size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} /><Text style={[s.value, isDark && { color: '#FFF' }]}>{profile.email||'—'}</Text></View>
            <View style={[s.row, isDark && { borderBottomColor: '#444' }]}><Phone size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} /><Text style={[s.value, isDark && { color: '#FFF' }]}>{profile.phone||'—'}</Text></View>
            <TouchableOpacity style={s.editBtn} onPress={()=>setEditing(true)}><Edit size={14} stroke="#FFF" /><Text style={s.editBtnText}>{t.editProfile}</Text></TouchableOpacity>
          </>
        )}
      </View>
      <View style={[s.section, isDark && { backgroundColor: '#2A2A2A', borderColor: '#333' }]}>
        <Text style={[s.sectionTitle, isDark && { color: '#FFF' }]}>{t.usageInfo}</Text>
        <View style={[s.row, isDark && { borderBottomColor: '#444' }]}><Crown size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} /><Text style={s.label}>{t.tier}</Text><Text style={[s.value, isDark && { color: '#FFF' }]}>{tier}</Text></View>
        <View style={[s.row, isDark && { borderBottomColor: '#444' }]}><Zap size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} /><Text style={s.label}>{t.messagesLeft}</Text><Text style={[s.value, isDark && { color: '#FFF' }]}>{usage.messages||0}</Text></View>
        <View style={[s.row, isDark && { borderBottomColor: '#444' }]}><MessageSquare size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} /><Text style={s.label}>{t.totalMessages}</Text><Text style={[s.value, isDark && { color: '#FFF' }]}>{profile.total_messages||0}</Text></View>
      </View>
      <TouchableOpacity style={s.btn} onPress={()=>router.push('/subscription' as AppRoute)}><Crown size={16} stroke="#FFF" /><Text style={s.btnText}>{t.upgrade}</Text></TouchableOpacity>
      <TouchableOpacity style={[s.btn, s.outlineBtn]} onPress={handleLogout}><LogOut size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} /><Text style={[s.btnText,{color: isDark ? '#D8B4FE' : '#6B21A8'}]}>{t.logout}</Text></TouchableOpacity>
      <TouchableOpacity style={[s.btn, s.dangerBtn]} onPress={handleDelete}><Trash2 size={16} stroke="#EF4444" /><Text style={[s.btnText,{color:'#EF4444'}]}>{t.deleteAccount}</Text></TouchableOpacity>
    </ScrollView>
    </SafeAreaView>
    </SafeAreaView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  container:{ flex:1, backgroundColor:'#F8F6F2', padding:16 },
  title:{ fontSize:24, fontWeight:'800', color:'#1A1A1A', marginBottom:20, marginTop:10 },
  card:{ alignItems:'center', backgroundColor:'#FFFFFF', padding:20, borderRadius:16, marginBottom:16, borderWidth:1, borderColor:'#E0D9F5' },
  avatar:{ width:76, height:76, borderRadius:38, backgroundColor:'#6B21A8', justifyContent:'center', alignItems:'center', marginBottom:10 },
  twinName:{ color:'#1A1A1A', fontSize:18, fontWeight:'700' },
  stage:{ color:'#888', fontSize:13, marginTop:4 },
  bondBar:{ width:'80%', height:8, backgroundColor:'#F0F0F0', borderRadius:4, marginTop:10, overflow:'hidden' },
  bondFill:{ height:'100%', backgroundColor:'#6B21A8', borderRadius:4 },
  bondTip:{ color:'#AAA', fontSize:11, marginTop:8, textAlign:'center' },
  section:{ backgroundColor:'#FFFFFF', padding:16, borderRadius:12, marginBottom:14, borderWidth:1, borderColor:'#F0F0F0' },
  sectionTitle:{ color:'#1A1A1A', fontSize:15, fontWeight:'700', marginBottom:10 },
  row:{ flexDirection:'row', alignItems:'center', gap:10, paddingVertical:8, borderBottomWidth:1, borderBottomColor:'#F8F8F8' },
  label:{ color:'#888', fontSize:13, flex:1 },
  value:{ color:'#1A1A1A', fontSize:14, fontWeight:'500', flex:2 },
  input:{ flex:1, backgroundColor:'#F8F6F2', color:'#1A1A1A', padding:10, borderRadius:8, fontSize:14 },
  btnRow:{ flexDirection:'row', gap:10, marginTop:10 },
  smallBtn:{ flex:1, padding:10, borderRadius:8, alignItems:'center' },
  smallBtnText:{ color:'#FFF', fontWeight:'700', fontSize:14 },
  editBtn:{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, backgroundColor:'#6B21A8', padding:10, borderRadius:8, marginTop:10 },
  editBtnText:{ color:'#FFF', fontWeight:'700', fontSize:13 },
  btn:{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, backgroundColor:'#6B21A8', padding:14, borderRadius:12, marginTop:10 },
  btnText:{ color:'#FFF', fontWeight:'700', fontSize:15 },
  outlineBtn:{ backgroundColor:'#FFFFFF', borderWidth:1.5, borderColor:'#6B21A8' },
  dangerBtn:{ backgroundColor:'#FFF5F5', borderWidth:1.5, borderColor:'#FFCDD2' },
});
