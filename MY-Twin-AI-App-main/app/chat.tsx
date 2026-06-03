import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, Modal, Animated, Alert, StatusBar, ListRenderItemInfo } from 'react-native';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTwinStore } from '../store/useTwinStore';
import { API } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Mic, ArrowUp, Paperclip, Crown, Smile, Target, Brain, PenTool, X, Menu } from 'lucide-react-native';

type TierFeature = { icon: string; label: string; action: 'chat'|'voice'|'image'|'dream'|'coach'|'smart_home'|'email'; };

function TwinAvatar({ gender, size = 40 }: { gender: string; size?: number }) {
  const isFemale = gender === 'female';
  const bg = isFemale ? '#E9D5FF' : '#DDD6FE';
  const emoji = isFemale ? '🌸' : '⚡';
  return (
    <View style={[avs.wrap, { width: size, height: size, borderRadius: size/2, backgroundColor: bg }]}>
      <Text style={{ fontSize: size * 0.48 }}>{emoji}</Text>
    </View>
  );
}
const avs = StyleSheet.create({ wrap: { justifyContent:'center', alignItems:'center', shadowColor:'#6B21A8', shadowOpacity:0.2, shadowRadius:6, elevation:3 } });

function AnimBtn({ onPress, style, children }: { onPress?: ()=>void; style?: any; children: React.ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([ Animated.spring(scale, { toValue:0.88, useNativeDriver:true, speed:50 }), Animated.spring(scale, { toValue:1, useNativeDriver:true, speed:30 }) ]).start();
    onPress?.();
  }, [onPress]);
  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={1}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </TouchableOpacity>
  );
}

function getWelcome(lang: 'ar'|'en') {
  const h = new Date().getHours();
  if (lang==='ar') {
    if (h>=6&&h<12) return { emoji:'🌅', text:'صباح الخير! كيف حالك اليوم؟' };
    if (h>=12&&h<18) return { emoji:'🌞', text:'مرحباً! كيف يومك؟' };
    if (h>=18&&h<24) return { emoji:'🌙', text:'مساء الخير! كيف كان يومك؟' };
    return { emoji:'🌃', text:'سهرة سعيدة! لنكن معاً؟' };
  }
  if (h>=6&&h<12) return { emoji:'🌅', text:'Good morning! How are you today?' };
  if (h>=12&&h<18) return { emoji:'🌞', text:'Hello! How is your day?' };
  if (h>=18&&h<24) return { emoji:'🌙', text:'Good evening! How was your day?' };
  return { emoji:'🌃', text:'Happy late night! Shall we talk?' };
}

function getSuggestions(lang: 'ar'|'en') {
  if (lang==='ar') return [
    { icon:Smile, label:'دردشة', prompt:'لنتحدث عن أي شيء' },
    { icon:Target, label:'مهمة', prompt:'أريد مساعدتك في مهمة' },
    { icon:Brain, label:'مشاعر', prompt:'أريد أن أفهم مشاعري' },
    { icon:PenTool, label:'إبداع', prompt:'لنكتب شيئاً معاً' },
  ];
  return [
    { icon:Smile, label:'Chat', prompt:"Let's talk" },
    { icon:Target, label:'Task', prompt:'I need help' },
    { icon:Brain, label:'Feelings', prompt:'Help me understand my feelings' },
    { icon:PenTool, label:'Creative', prompt:"Let's create together" },
  ];
}

type ChatMessage = { role:'user'|'twin'; content:string };

export default function Chat() {
  const insets = useSafeAreaInsets();
  const { twinName, twinGender, tier, bondLevel, energy, relationshipDims, chatHistory, addMessage, updateBond, updateRelationshipDims, calmMode, triggerHaptic, lang } = useTwinStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [limitModal, setLimitModal] = useState<{ visible:boolean; type:'daily_limit'|'bond_ceiling'; hours:number }>({ visible:false, type:'daily_limit', hours:0 });
  const flatRef = useRef<FlatList<ChatMessage>>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const waveAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const isRTL = lang === 'ar';
  const welcome = getWelcome(lang);
  const suggestions = getSuggestions(lang);
  const isFree = tier === 'free';

  useEffect(() => {
    flatRef.current?.scrollToEnd({ animated:true });
    Animated.timing(fadeAnim, { toValue:1, duration:300, useNativeDriver:true }).start();
  }, [chatHistory]);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(Animated.sequence([ Animated.timing(waveAnim, { toValue:1.3, duration:300, useNativeDriver:true }), Animated.timing(waveAnim, { toValue:0.8, duration:300, useNativeDriver:true }) ])).start();
    } else { waveAnim.setValue(1); }
  }, [isRecording]);

  const openMenu = useCallback(() => { setMenuVisible(true); Animated.timing(slideAnim, { toValue:0, duration:250, useNativeDriver:true }).start(); }, [slideAnim]);
  const closeMenu = useCallback(() => { Animated.timing(slideAnim, { toValue:-300, duration:200, useNativeDriver:true }).start(()=>setMenuVisible(false)); }, [slideAnim]);

  const send = useCallback(async (msg?: string) => {
    const message = (msg || input).trim();
    if (!message || loading) return;
    triggerHaptic();
    addMessage('user', message);
    setInput('');
    setLoading(true);
    try {
      const res = await API.post('/api/chat', { message, twin_name:twinName, bond_level:bondLevel, relationship_dims:relationshipDims, calm_mode:calmMode, lang });
      addMessage('twin', res.data.reply);
      updateBond(res.data.new_bond ?? bondLevel);
      if (res.data.dims_update) updateRelationshipDims(res.data.dims_update);
      if (res.data?.importance > 0.7) Alert.alert('✨', lang==='ar'?'تم حفظ ذكرى':'Memory saved');
      if (res.data.tts) {
        try { const { speakResponse } = require('../utils/voice_engine'); speakResponse(res.data.reply, res.data.tts); } catch(e){}
      }
    } catch (error: any) {
      const status = error?.response?.status;
      const errData = error?.response?.data;
      if (errData?.error === 'daily_limit_reached') setLimitModal({ visible:true, type:'daily_limit', hours:errData.hours_until_reset||0 });
      else if (status===401) addMessage('twin', lang==='ar'?'انتهت جلستك، سجّل دخول مجدداً 🔒':'Session expired, please login again 🔒');
      else addMessage('twin', lang==='ar'?'تعذر الاتصال بالخادم 😔':'Connection failed 😔');
    } finally { setLoading(false); }
  }, [input, loading, twinName, bondLevel, relationshipDims, calmMode, lang, addMessage, updateBond, updateRelationshipDims, triggerHaptic]);

  const handleVoice = useCallback(async () => {
    try {
      const { startRecordingVoice, stopRecordingVoice } = require('../utils/voice_engine');
      if (isRecording) { setIsRecording(false); const text = await stopRecordingVoice(); if (text) send(text); }
      else { const started = await startRecordingVoice(); if (started) setIsRecording(true); else Alert.alert(lang==='ar'?'خطأ':'Error', lang==='ar'?'تعذر الوصول للميكروفون':'Mic denied'); }
    } catch (e) { Alert.alert('🎤', lang==='ar'?'ميزة الصوت غير متاحة حالياً':'Voice feature not available'); }
  }, [isRecording, lang, send]);

  const getTierFeatures = useCallback((): TierFeature[] => {
    const f: TierFeature[] = [];
    if (tier==='free') f.push({ icon:'💬', label:lang==='ar'?'محادثة':'Chat', action:'chat' });
    else if (tier==='plus') { f.push({ icon:'🎙️', label:lang==='ar'?'صوت':'Voice', action:'voice' }, { icon:'📷', label:lang==='ar'?'صورة':'Image', action:'image' }); }
    else if (tier==='premium') { f.push({ icon:'🎙️', label:lang==='ar'?'صوت':'Voice', action:'voice' }, { icon:'📷', label:lang==='ar'?'صورة':'Image', action:'image' }, { icon:'🎯', label:lang==='ar'?'تحليل أحلام':'Dreams', action:'dream' }, { icon:'🔮', label:lang==='ar'?'تدريب':'Coaching', action:'coach' }); }
    else if (tier==='pro'||tier==='yearly') { f.push({ icon:'🎙️', label:lang==='ar'?'صوت':'Voice', action:'voice' }, { icon:'📷', label:lang==='ar'?'صورة':'Image', action:'image' }, { icon:'🎯', label:lang==='ar'?'تحليل أحلام':'Dreams', action:'dream' }, { icon:'🔮', label:lang==='ar'?'تدريب':'Coaching', action:'coach' }, { icon:'🏠', label:lang==='ar'?'منزل ذكي':'Smart Home', action:'smart_home' }, { icon:'📧', label:lang==='ar'?'بريد':'Email', action:'email' }); }
    return f;
  }, [tier, lang]);

  const handleFeaturePress = useCallback((action: TierFeature['action']) => {
    setShowAttach(false);
    switch(action) {
      case 'voice': handleVoice(); break;
      case 'image': Alert.alert('📷', lang==='ar'?'ميزة الصورة قيد التطوير':'Image feature coming soon'); break;
      case 'dream': send(lang==='ar'?'أريد تحليل حلمي':'I want to analyze my dream'); break;
      case 'coach': send(lang==='ar'?'أريد جلسة تدريب حياتي':'I want a life coaching session'); break;
      default: Alert.alert(lang==='ar'?'ميزة قادمة':'Coming soon', lang==='ar'?'سيتم تفعيلها قريباً':'Will be available soon');
    }
  }, [handleVoice, send, lang]);

  const renderMsg = useCallback(({ item, index }: ListRenderItemInfo<ChatMessage>) => {
    const isUser = item.role === 'user';
    const isLast = index === chatHistory.length-1;
    return (
      <Animated.View style={[s.msgRow, isUser?s.userRow:s.twinRow, isLast&&{ opacity:fadeAnim }]}>
        {!isUser && <TwinAvatar gender={twinGender} size={28} />}
        <View style={[s.bubble, isUser?s.userBubble:s.twinBubble, !isUser&&{ marginLeft:8 }]}>
          <Text style={isUser?s.userText:s.twinText}>{item.content}</Text>
        </View>
      </Animated.View>
    );
  }, [chatHistory.length, twinGender, fadeAnim]);

  const ListEmpty = useCallback(() => (
    <View style={s.welcomeWrap}>
      <Text style={s.welcomeEmoji}>{welcome.emoji}</Text>
      <Text style={s.welcomeText}>{welcome.text}</Text>
      <View style={s.suggestRow}>
        {suggestions.map((item,i) => { const Icon = item.icon; return (
          <AnimBtn key={i} onPress={()=>send(item.prompt)} style={s.suggestBtn}>
            <Icon size={16} stroke="#6B21A8" />
            <Text style={s.suggestText}>{item.label}</Text>
          </AnimBtn>
        );})}
      </View>
    </View>
  ), [welcome, suggestions, send]);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={s.header}>
          <View style={s.headerLeft}>
            <AnimBtn onPress={openMenu} style={s.menuBtn}><Menu size={22} stroke="#1A1A1A" /></AnimBtn>
            <TwinAvatar gender={twinGender} size={36} />
            <View>
              <Text style={s.headerName}>{twinName || (lang==='ar'?'توأمك':'Your Twin')}</Text>
              <View style={s.onlineRow}><View style={s.onlineDot} /><Text style={s.onlineText}>{lang==='ar'?'متصل':'Online'}</Text></View>
            </View>
          </View>
          <View style={s.headerRight}>
            <AnimBtn onPress={()=>router.push('/timeline' as Href)} style={s.statusBadge}><Text style={s.statusIcon}>💜</Text><Text style={s.statusText}>{Math.round(bondLevel)}%</Text></AnimBtn>
            <AnimBtn style={s.statusBadge}><Text style={s.statusIcon}>⚡</Text><Text style={s.statusText}>{Math.round(energy)}%</Text></AnimBtn>
            <AnimBtn onPress={()=>router.push('/subscription' as Href)} style={s.crownBtn}><Crown size={20} stroke={isFree?'#F59E0B':'#6B21A8'} /></AnimBtn>
          </View>
        </View>
        <FlatList ref={flatRef} data={chatHistory} keyExtractor={(_,i)=>i.toString()} renderItem={renderMsg} ListEmptyComponent={ListEmpty} contentContainerStyle={s.listContent} onContentSizeChange={()=>flatRef.current?.scrollToEnd({ animated:false })} removeClippedSubviews initialNumToRender={15} />
        {loading && <View style={s.typingRow}><TwinAvatar gender={twinGender} size={22} /><View style={[s.typingBubble, { marginLeft:8 }]}><Text style={s.typingDots}>• • •</Text></View></View>}
        <View style={[s.inputBar, { paddingBottom: insets.bottom+8 }]}>
          <AnimBtn onPress={handleVoice} style={s.iconBtn}><Animated.View style={{ transform:[{ scale: waveAnim }] }}><Mic size={22} stroke={isRecording?'#EF4444':'#999'} /></Animated.View></AnimBtn>
          <AnimBtn onPress={()=>setShowAttach(true)} style={s.iconBtn}><Paperclip size={20} stroke="#999" /></AnimBtn>
          <TextInput style={[s.textInput, isRTL&&{ textAlign:'right' }]} value={input} onChangeText={setInput} placeholder={lang==='ar'?'أنا هنا لأجلك... 💜':"I'm here for you... 💜"} placeholderTextColor="#C4B5D4" multiline maxLength={2000} onSubmitEditing={()=>send()} />
          {input.trim().length>0 ? <AnimBtn onPress={()=>send()} style={s.sendBtn}><ArrowUp size={18} stroke="#FFF" /></AnimBtn> : <View style={{ width:42 }} />}
        </View>
        <Modal visible={menuVisible} transparent animationType="none" onRequestClose={closeMenu}>
          <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={closeMenu}>
            <Animated.View style={[s.sidebar, { transform:[{ translateX: slideAnim }] }]}>
              <View style={{ padding:20 }}><Text style={{ fontSize:20, fontWeight:'700' }}>{lang==='ar'?'القائمة':'Menu'}</Text><TouchableOpacity onPress={closeMenu} style={{ marginTop:20 }}><X size={24} stroke="#000" /></TouchableOpacity></View>
            </Animated.View>
          </TouchableOpacity>
        </Modal>
        <Modal visible={showAttach} transparent animationType="fade">
          <TouchableOpacity style={s.modalOverlay} onPress={()=>setShowAttach(false)}>
            <View style={s.attachMenu}>
              {getTierFeatures().map((feat, index) => (
                <AnimBtn key={index} style={s.attachItem} onPress={()=>handleFeaturePress(feat.action)}>
                  <Text style={{ fontSize:24 }}>{feat.icon}</Text><Text style={s.attachLabel}>{feat.label}</Text>
                </AnimBtn>
              ))}
              <AnimBtn style={s.attachItem} onPress={()=>setShowAttach(false)}><X size={26} stroke="#EF4444" /><Text style={s.attachLabel}>{lang==='ar'?'إغلاق':'Close'}</Text></AnimBtn>
            </View>
          </TouchableOpacity>
        </Modal>
        <Modal visible={limitModal.visible} transparent animationType="fade">
          <View style={s.modalOverlay}>
            <View style={s.limitModal}>
              <Text style={{ fontSize:16, fontWeight:'700', marginBottom:8 }}>{lang==='ar'?'حد الاستخدام':'Limit Reached'}</Text>
              <Text style={{ fontSize:14, color:'#666' }}>{limitModal.type==='daily_limit'?(lang==='ar'?`جرب مجدداً بعد ${limitModal.hours} ساعة`:`Try again in ${limitModal.hours} hours`):(lang==='ar'?'تحتاج ترقية باقتك':'Upgrade your plan')}</Text>
              <TouchableOpacity style={{ backgroundColor:'#6B21A8', padding:10, borderRadius:8, marginTop:16 }} onPress={()=>setLimitModal(p=>({...p, visible:false}))}><Text style={{ color:'#FFF', textAlign:'center' }}>OK</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root:{ flex:1, backgroundColor:'#FFFFFF' },
  header:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:12, paddingVertical:8, backgroundColor:'#FFFFFF', borderBottomWidth:1, borderBottomColor:'#F0F0F0' },
  headerLeft:{ flexDirection:'row', alignItems:'center', gap:10 },
  menuBtn:{ padding:4 },
  headerName:{ fontSize:15, fontWeight:'700', color:'#1A1A1A' },
  onlineRow:{ flexDirection:'row', alignItems:'center', gap:4, marginTop:1 },
  onlineDot:{ width:6, height:6, borderRadius:3, backgroundColor:'#10B981' },
  onlineText:{ fontSize:11, color:'#10B981', fontWeight:'500' },
  headerRight:{ flexDirection:'row', alignItems:'center', gap:6 },
  statusBadge:{ flexDirection:'row', alignItems:'center', backgroundColor:'#F3F0FF', paddingHorizontal:6, paddingVertical:4, borderRadius:10 },
  statusIcon:{ fontSize:12, marginRight:2 },
  statusText:{ fontSize:11, fontWeight:'600', color:'#6B21A8' },
  crownBtn:{ padding:6 },
  listContent:{ paddingHorizontal:14, paddingVertical:12, flexGrow:1 },
  welcomeWrap:{ alignItems:'center', paddingTop:40 },
  welcomeEmoji:{ fontSize:44, marginBottom:10 },
  welcomeText:{ fontSize:16, color:'#1A1A1A', fontWeight:'600', textAlign:'center', marginBottom:24, paddingHorizontal:20 },
  suggestRow:{ flexDirection:'row', flexWrap:'wrap', justifyContent:'center', gap:10 },
  suggestBtn:{ flexDirection:'row', alignItems:'center', gap:6, backgroundColor:'#F3F0FF', borderRadius:20, paddingHorizontal:14, paddingVertical:10, borderWidth:1, borderColor:'#E0D9F5' },
  suggestText:{ fontSize:13, color:'#6B21A8', fontWeight:'600' },
  msgRow:{ flexDirection:'row', alignItems:'flex-end', marginBottom:10 },
  userRow:{ justifyContent:'flex-end' },
  twinRow:{ justifyContent:'flex-start' },
  bubble:{ maxWidth:'75%', paddingHorizontal:14, paddingVertical:10, borderRadius:18 },
  userBubble:{ backgroundColor:'#6B21A8', borderBottomRightRadius:4 },
  twinBubble:{ backgroundColor:'#FFFFFF', borderBottomLeftRadius:4, borderWidth:1, borderColor:'#EFEFEF' },
  userText:{ color:'#FFF', fontSize:15, lineHeight:22 },
  twinText:{ color:'#1A1A1A', fontSize:15, lineHeight:22 },
  typingRow:{ flexDirection:'row', alignItems:'center', paddingHorizontal:14, paddingBottom:8 },
  typingBubble:{ backgroundColor:'#FFF', paddingHorizontal:14, paddingVertical:10, borderRadius:16, borderWidth:1, borderColor:'#EEE' },
  typingDots:{ color:'#6B21A8', fontSize:16, letterSpacing:3 },
  inputBar:{ flexDirection:'row', alignItems:'center', paddingHorizontal:10, paddingTop:8, backgroundColor:'#FFFFFF', borderTopWidth:1, borderTopColor:'#F0F0F0', gap:6 },
  iconBtn:{ padding:8 },
  textInput:{ flex:1, backgroundColor:'#F8F8F8', color:'#1A1A1A', paddingHorizontal:14, paddingVertical:10, borderRadius:22, fontSize:15, maxHeight:100, minHeight:44, borderWidth:1, borderColor:'#EFEFEF' },
  sendBtn:{ backgroundColor:'#6B21A8', width:42, height:42, borderRadius:21, justifyContent:'center', alignItems:'center' },
  overlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.4)' },
  sidebar:{ position:'absolute', left:0, top:0, bottom:0, width:300, backgroundColor:'#FFFFFF' },
  modalOverlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.3)', justifyContent:'flex-end' },
  attachMenu:{ flexDirection:'row', backgroundColor:'#FFF', borderTopLeftRadius:20, borderTopRightRadius:20, padding:24, justifyContent:'space-around', flexWrap:'wrap' },
  attachItem:{ alignItems:'center', gap:6 },
  attachLabel:{ fontSize:12, color:'#666' },
  limitModal:{ backgroundColor:'#FFF', margin:40, padding:24, borderRadius:16, alignItems:'center' },
});
