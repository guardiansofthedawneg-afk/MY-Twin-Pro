import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Modal, Animated, Alert, StatusBar, ListRenderItemInfo, InteractionManager, Image as RNImage } from 'react-native';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Localization from 'expo-localization';
import { useTwinStore } from '../store/useTwinStore';
import { API } from '../lib/api';
import SideMenu from '../components/SideMenu';
import { Mic, MicOff, Paperclip, Crown, Smile, Target, Brain, PenTool, Menu, Volume2, VolumeX, Image, FileText, Search, Dumbbell, MoonStar, Send, Camera, X, Sparkles, Heart, Zap } from 'lucide-react-native';

function TwinAvatar({ gender, size = 40 }: { gender: string; size?: number }) {
  const isFemale = gender === 'female';
  const bg = isFemale ? '#E9D5FF' : '#DDD6FE';
  return (
    <View style={[avs.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={{ fontSize: size * 0.55 }}>{isFemale ? '🌸' : '⚡'}</Text>
    </View>
  );
}
const avs = StyleSheet.create({ wrap: { justifyContent: 'center', alignItems: 'center', shadowColor: '#6B21A8', shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 } });

function AnimBtn({ onPress, style, children }: { onPress?: () => void; style?: any; children: React.ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, speed: 50 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }),
    ]).start();
    onPress?.();
  }, [onPress]);
  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={1}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </TouchableOpacity>
  );
}

function getWelcome(lang: 'ar' | 'en') {
  const h = new Date().getHours();
  if (lang === 'ar') {
    if (h >= 6 && h < 12) return { emoji: '🌅', text: 'صباح الخير! كيف حالك اليوم؟' };
    if (h >= 12 && h < 18) return { emoji: '🌞', text: 'مرحباً! كيف يومك؟' };
    if (h >= 18 && h < 24) return { emoji: '🌙', text: 'مساء الخير! كيف كان يومك؟' };
    return { emoji: '🌃', text: 'سهرة سعيدة! لنكن معاً؟' };
  }
  if (h >= 6 && h < 12) return { emoji: '🌅', text: 'Good morning! How are you today?' };
  if (h >= 12 && h < 18) return { emoji: '🌞', text: 'Hello! How is your day?' };
  if (h >= 18 && h < 24) return { emoji: '🌙', text: 'Good evening! How was your day?' };
  return { emoji: '🌃', text: 'Happy late night! Shall we talk?' };
}

function getSuggestions(lang: 'ar' | 'en') {
  if (lang === 'ar') return [
    { icon: Smile, label: 'دردشة', prompt: 'لنتحدث عن أي شيء' },
    { icon: Target, label: 'مهمة', prompt: 'أريد مساعدتك في مهمة' },
    { icon: Brain, label: 'مشاعر', prompt: 'أريد أن أفهم مشاعري' },
    { icon: PenTool, label: 'إبداع', prompt: 'لنكتب شيئاً معاً' },
  ];
  return [
    { icon: Smile, label: 'Chat', prompt: "Let's talk" },
    { icon: Target, label: 'Task', prompt: 'I need help' },
    { icon: Brain, label: 'Feelings', prompt: 'Help me understand my feelings' },
    { icon: PenTool, label: 'Creative', prompt: "Let's create together" },
  ];
}

type ChatMessage = { role: 'user' | 'twin'; content: string; image?: string };

export default function Chat() {
  const insets = useSafeAreaInsets();
  const { twinName, twinGender, tier, bondLevel, energy, relationshipDims, chatHistory, addMessage, updateBond, updateRelationshipDims, calmMode, triggerHaptic, lang, theme } = useTwinStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [featureModal, setFeatureModal] = useState<{ visible: boolean; type: string }>({ visible: false, type: '' });
  const [featureInput, setFeatureInput] = useState('');
  const flatRef = useRef<FlatList<ChatMessage>>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const waveAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const attachAnim = useRef(new Animated.Value(0)).current;
  const bondGlow = useRef(new Animated.Value(1)).current;
  const energyPulse = useRef(new Animated.Value(1)).current;
  const isRTL = lang === 'ar';
  const welcome = getWelcome(lang);
  const suggestions = getSuggestions(lang);
  const isFree = tier === 'free';
  const isDark = theme === 'dark';

  // --- مؤشرات متحركة (طاقة وترابط) ---
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(bondGlow, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
      Animated.timing(bondGlow, { toValue: 1, duration: 2000, useNativeDriver: true }),
    ])).start();
  }, []);

  useEffect(() => {
    if (energy < 0.3) {
      Animated.loop(Animated.sequence([
        Animated.timing(energyPulse, { toValue: 1.2, duration: 500, useNativeDriver: true }),
        Animated.timing(energyPulse, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])).start();
    } else {
      energyPulse.setValue(1);
    }
  }, [energy]);

  // --- التمرير التلقائي الذكي ---
  useEffect(() => {
    const timer = setTimeout(() => {
      flatRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [chatHistory]);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(Animated.sequence([
        Animated.timing(waveAnim, { toValue: 1.3, duration: 300, useNativeDriver: true }),
        Animated.timing(waveAnim, { toValue: 0.8, duration: 300, useNativeDriver: true }),
      ])).start();
    } else { waveAnim.setValue(1); }
  }, [isRecording]);

  useEffect(() => {
    Animated.spring(attachAnim, { toValue: showAttach ? 1 : 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  }, [showAttach]);

  const openMenu = useCallback(() => { setMenuVisible(true); Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(); }, [slideAnim]);
  const closeMenu = useCallback(() => { Animated.timing(slideAnim, { toValue: -300, duration: 200, useNativeDriver: true }).start(() => setMenuVisible(false)); }, [slideAnim]);

  const countryCode = (Localization.region || 'SA').toUpperCase();

  // --- دالة الإرسال المركزية (محسنة مع TTS مباشر) ---
  const send = useCallback(async (msg?: string, imageBase64?: string) => {
    const message = (msg || input).trim();
    if (!message && !imageBase64) return;
    if (loading) return;
    triggerHaptic();
    addMessage('user', message || '📷 صورة', imageBase64);
    setInput('');
    setLoading(true);
    try {
      const res = await API.post('/api/chat', {
        message: message || 'صورة مرفقة',
        twin_name: twinName,
        bond_level: bondLevel,
        relationship_dims: relationshipDims,
        calm_mode: calmMode,
        lang,
        image: imageBase64 || undefined,
      }, {
        headers: {
          'X-Calm-Mode': String(calmMode),
          'X-Country-Code': countryCode,
          'X-Twin-Gender': twinGender,
        },
      });
      addMessage('twin', res.data.reply);
      updateBond(res.data.new_bond ?? bondLevel);
      if (res.data.dims_update) updateRelationshipDims(res.data.dims_update);
      if (res.data?.importance > 0.7) Alert.alert('✨', lang === 'ar' ? 'تم حفظ ذكرى' : 'Memory saved');

      // ✅ TTS مباشر (بدون انتظار حقل tts)
      if (soundEnabled) {
        try {
          const { speakResponse } = require('../utils/voice_engine');
          await speakResponse(res.data.reply, {
            tier: tier,
            country_code: countryCode,
            gender: twinGender,
            emotion: res.data?.emotion?.primary || 'neutral',
          });
        } catch (e) {
          console.log('TTS playback failed:', e);
        }
      }
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401) addMessage('twin', lang === 'ar' ? 'انتهت جلستك 🔒' : 'Session expired 🔒');
      else addMessage('twin', lang === 'ar' ? 'تعذر الاتصال 😔' : 'Connection failed 😔');
    } finally { setLoading(false); }
  }, [input, loading, twinName, bondLevel, relationshipDims, calmMode, lang, addMessage, updateBond, updateRelationshipDims, triggerHaptic, soundEnabled, twinGender, tier, countryCode]);

  // --- الكاميرا ---
  const handleCamera = useCallback(async () => {
    setShowAttach(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert(lang === 'ar' ? 'صلاحية' : 'Permission', lang === 'ar' ? 'مطلوب إذن الكاميرا' : 'Camera permission needed'); return; }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 });
    if (!result.canceled && result.assets?.[0]?.base64) {
      send('', result.assets[0].base64);
    }
  }, [send, lang]);

  // --- الميكروفون ---
  const handleVoice = useCallback(async () => {
    if (isFree) { Alert.alert(lang === 'ar' ? 'ترقية' : 'Upgrade', lang === 'ar' ? 'الميزة حصرية للباقات المدفوعة' : 'Feature exclusive to paid plans'); return; }
    try {
      const { startRecordingVoice, stopRecordingVoice } = require('../utils/voice_engine');
      if (isRecording) { setIsRecording(false); const text = await stopRecordingVoice(); if (text) send(text); }
      else { const started = await startRecordingVoice(); if (started) setIsRecording(true); else Alert.alert('خطأ', lang === 'ar' ? 'تعذر الميكروفون' : 'Mic denied'); }
    } catch (e) { Alert.alert('🎤', lang === 'ar' ? 'الصوت غير متاح' : 'Voice unavailable'); }
  }, [isRecording, lang, send, isFree]);

  // --- إجراءات المرفقات ---
  const handleAttachAction = useCallback(async (action: string) => {
    setShowAttach(false);
    if (action === 'camera') { handleCamera(); return; }
    if (action === 'image') {
      const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!p.granted) { Alert.alert('صلاحية', lang === 'ar' ? 'مطلوب إذن الصور' : 'Permission needed'); return; }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true });
      if (!r.canceled && r.assets?.[0]?.base64) send('', r.assets[0].base64);
    } else if (action === 'file') {
      try {
        const res = await DocumentPicker.getDocumentAsync({ type: '*/*' });
        if (!res.canceled && res.assets?.[0]) send('📄 ملف مرفق');
      } catch (e) { Alert.alert('خطأ', lang === 'ar' ? 'فشل اختيار الملف' : 'File selection failed'); }
    } else if (action === 'coach' || action === 'dream') {
      if (isFree) { Alert.alert(lang === 'ar' ? 'ترقية' : 'Upgrade', lang === 'ar' ? 'الميزة حصرية للباقات المدفوعة' : 'Feature exclusive to paid plans'); return; }
      setFeatureModal({ visible: true, type: action });
      setFeatureInput('');
    } else if (action === 'search') {
      setFeatureModal({ visible: true, type: 'search' });
      setFeatureInput('');
    } else {
      Alert.alert(lang === 'ar' ? 'ميزة' : 'Feature', lang === 'ar' ? 'قيد التطوير' : 'Coming soon');
    }
  }, [send, lang, handleCamera, isFree]);

  const handleFeatureSend = () => {
    const prompts: Record<string, string> = {
      search: '/search ',
      coach: lang === 'ar' ? 'أريد جلسة تدريب: ' : 'Coaching session: ',
      dream: lang === 'ar' ? 'أريد تحليل حلمي: ' : 'Dream analysis: ',
    };
    const prefix = prompts[featureModal.type] || '';
    send(prefix + featureInput);
    setFeatureModal({ visible: false, type: '' });
    setFeatureInput('');
  };

  const renderMsg = useCallback(({ item, index }: ListRenderItemInfo<ChatMessage>) => {
    const isUser = item.role === 'user';
    return (
      <Animated.View style={[s.msgRow, isUser ? s.userRow : s.twinRow, index === chatHistory.length - 1 && { opacity: fadeAnim }]}>
        {!isUser && <TwinAvatar gender={twinGender} size={28} />}
        <View style={[s.bubble, isUser ? s.userBubble : s.twinBubble, !isUser && { marginLeft: 8 }, isDark && !isUser && { backgroundColor: '#2A2A2A', borderColor: '#444' }]}>
          {item.image ? <RNImage source={{ uri: `data:image/jpeg;base64,${item.image}` }} style={{ width: 200, height: 200, borderRadius: 12, marginBottom: 4 }} /> : null}
          <Text style={isUser ? s.userText : [s.twinText, isDark && { color: '#E0E0E0' }]}>{item.content}</Text>
        </View>
      </Animated.View>
    );
  }, [chatHistory.length, twinGender, fadeAnim, isDark]);

  const ListEmpty = useCallback(() => (
    <View style={s.welcomeWrap}>
      <Text style={s.welcomeEmoji}>{welcome.emoji}</Text>
      <Text style={[s.welcomeText, isDark && { color: '#CCC' }]}>{welcome.text}</Text>
      <View style={s.suggestRow}>
        {suggestions.map((item, i) => {
          const Icon = item.icon;
          return (
            <AnimBtn key={i} onPress={() => send(item.prompt)} style={[s.suggestBtn, isDark && { backgroundColor: '#2A2A2A', borderColor: '#444' }]}>
              <Icon size={16} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
              <Text style={[s.suggestText, isDark && { color: '#D8B4FE' }]}>{item.label}</Text>
            </AnimBtn>
          );
        })}
      </View>
    </View>
  ), [welcome, suggestions, send, isDark]);

  const attachItems = [
    { icon: Camera, label: lang === 'ar' ? 'كاميرا' : 'Camera', action: 'camera' },
    { icon: Image, label: lang === 'ar' ? 'معرض' : 'Gallery', action: 'image' },
    { icon: FileText, label: lang === 'ar' ? 'ملف' : 'File', action: 'file' },
    { icon: Search, label: lang === 'ar' ? 'بحث' : 'Search', action: 'search' },
    { icon: Dumbbell, label: lang === 'ar' ? 'تدريب' : 'Coaching', action: 'coach' },
    { icon: MoonStar, label: lang === 'ar' ? 'تفسير أحلام' : 'Dreams', action: 'dream' },
  ];

  const attachTranslateY = attachAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] });
  const attachOpacity = attachAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.5, 1] });

  return (
    <View style={[s.root, { paddingTop: insets.top, backgroundColor: isDark ? '#1A1A1A' : '#F8F6F2' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#1A1A1A' : '#F8F6F2'} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* الهيدر المُصمم */}
        <View style={[s.header, isDark && { backgroundColor: '#1A1A1A', borderBottomColor: '#333' }]}>
          <View style={s.headerLeft}>
            <AnimBtn onPress={openMenu} style={s.menuBtn}><Menu size={22} stroke={isDark ? '#FFF' : '#1A1A1A'} /></AnimBtn>
            <TwinAvatar gender={twinGender} size={36} />
            <View>
              <Text style={[s.headerName, isDark && { color: '#FFF' }]}>{twinName || (lang === 'ar' ? 'توأمك' : 'Your Twin')}</Text>
              <View style={s.onlineRow}><View style={s.onlineDot} /><Text style={s.onlineText}>{lang === 'ar' ? 'متصل' : 'Online'}</Text></View>
            </View>
          </View>
          <View style={s.headerRight}>
            {/* مؤشر الترابط مع أنيميشن */}
            <Animated.View style={[s.statusBadge, isDark && { backgroundColor: '#2A2A2A' }, { transform: [{ scale: bondGlow }] }]}>
              <Heart size={14} stroke={isDark ? '#D8B4FE' : '#6B21A8'} fill={isDark ? '#D8B4FE' : '#6B21A8'} />
              <Text style={[s.statusText, isDark && { color: '#D8B4FE' }]}>{Math.round(bondLevel)}%</Text>
            </Animated.View>
            {/* مؤشر الطاقة مع أنيميشن نبضي */}
            <Animated.View style={[s.statusBadge, isDark && { backgroundColor: '#2A2A2A' }, { transform: [{ scale: energyPulse }] }]}>
              <Zap size={14} stroke={isDark ? '#F59E0B' : '#F59E0B'} fill={isDark ? '#F59E0B' : '#F59E0B'} />
              <Text style={[s.statusText, isDark && { color: '#F59E0B' }]}>{Math.round(energy)}%</Text>
            </Animated.View>
            <AnimBtn onPress={() => setSoundEnabled(prev => !prev)} style={s.iconBtn}>
              {soundEnabled ? <Volume2 size={20} stroke={isDark ? '#D8B4FE' : '#6B21A8'} /> : <VolumeX size={20} stroke="#999" />}
            </AnimBtn>
            <AnimBtn onPress={() => router.push('/subscription' as Href)} style={s.crownBtn}>
              <Crown size={20} stroke={isFree ? '#F59E0B' : (isDark ? '#D8B4FE' : '#6B21A8')} />
            </AnimBtn>
          </View>
        </View>

        {/* قائمة المحادثة */}
        <FlatList ref={flatRef} data={chatHistory} keyExtractor={(_, i) => i.toString()} renderItem={renderMsg} ListEmptyComponent={ListEmpty} contentContainerStyle={s.listContent} onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })} removeClippedSubviews initialNumToRender={15} />

        {/* مؤشر الكتابة */}
        {loading && (
          <View style={s.typingRow}>
            <TwinAvatar gender={twinGender} size={22} />
            <View style={[s.typingBubble, { marginLeft: 8 }, isDark && { backgroundColor: '#333', borderColor: '#555' }]}>
              <Text style={s.typingDots}>• • •</Text>
            </View>
          </View>
        )}

        {/* شريط الإدخال */}
        <View style={[s.inputBar, { paddingBottom: insets.bottom + 8 }, isDark && { backgroundColor: '#1A1A1A', borderTopColor: '#333' }]}>
          <AnimBtn onPress={() => setShowAttach(true)} style={s.iconBtn}><Paperclip size={20} stroke={isDark ? '#D8B4FE' : '#999'} /></AnimBtn>
          {!isFree && (
            <AnimBtn onPress={handleVoice} style={s.iconBtn}>
              <Animated.View style={{ transform: [{ scale: waveAnim }] }}>
                {isRecording ? <MicOff size={22} stroke="#EF4444" /> : <Mic size={22} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />}
              </Animated.View>
            </AnimBtn>
          )}
          <TextInput
            style={[s.textInput, isRTL && { textAlign: 'right' }, isDark && { backgroundColor: '#333', color: '#FFF', borderColor: '#555' }]}
            value={input}
            onChangeText={setInput}
            placeholder={lang === 'ar' ? 'أنا هنا لأجلك... 💜' : "I'm here for you... 💜"}
            placeholderTextColor="#C4B5D4"
            multiline
            maxLength={2000}
            onSubmitEditing={() => send()}
          />
          {input.trim().length > 0 ? (
            <AnimBtn onPress={() => send()} style={s.sendBtn}><Send size={18} stroke="#FFF" /></AnimBtn>
          ) : <View style={{ width: 42 }} />}
        </View>

        {/* القائمة الجانبية */}
        <Modal visible={menuVisible} transparent animationType="none" onRequestClose={closeMenu}>
          <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={closeMenu}>
            <Animated.View style={[s.sidebar, { transform: [{ translateX: slideAnim }] }, isDark && { backgroundColor: '#1A1A1A' }]}>
              <SideMenu onClose={closeMenu} />
            </Animated.View>
          </TouchableOpacity>
        </Modal>

        {/* قائمة المرفقات */}
        <Modal visible={showAttach} transparent animationType="none" onRequestClose={() => setShowAttach(false)}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowAttach(false)}>
            <Animated.View style={[s.attachMenu, { transform: [{ translateY: attachTranslateY }], opacity: attachOpacity }, isDark && { backgroundColor: '#2A2A2A' }]}>
              {attachItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <AnimBtn key={idx} style={s.attachItem} onPress={() => handleAttachAction(item.action)}>
                    <Icon size={24} stroke={isDark ? '#D8B4FE' : '#6B21A8'} />
                    <Text style={[s.attachLabel, isDark && { color: '#CCC' }]}>{item.label}</Text>
                  </AnimBtn>
                );
              })}
              <AnimBtn style={s.attachItem} onPress={() => setShowAttach(false)}>
                <Text style={{ fontSize: 24, color: '#EF4444' }}>✕</Text>
                <Text style={[s.attachLabel, { color: '#EF4444' }]}>{lang === 'ar' ? 'إغلاق' : 'Close'}</Text>
              </AnimBtn>
            </Animated.View>
          </TouchableOpacity>
        </Modal>

        {/* نافذة الميزات المنبثقة */}
        <Modal visible={featureModal.visible} transparent animationType="fade" onRequestClose={() => setFeatureModal({ visible: false, type: '' })}>
          <View style={s.featureOverlay}>
            <View style={[s.featureContainer, isDark && { backgroundColor: '#2A2A2A' }]}>
              <View style={s.featureHeader}>
                <Text style={[s.featureTitle, isDark && { color: '#FFF' }]}>
                  {featureModal.type === 'search' ? (lang === 'ar' ? 'بحث' : 'Search') :
                   featureModal.type === 'coach' ? (lang === 'ar' ? 'تدريب' : 'Coaching') :
                   (lang === 'ar' ? 'تفسير أحلام' : 'Dream Analysis')}
                </Text>
                <TouchableOpacity onPress={() => setFeatureModal({ visible: false, type: '' })}>
                  <X size={22} stroke={isDark ? '#CCC' : '#666'} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={[s.featureInput, isDark && { backgroundColor: '#333', color: '#FFF', borderColor: '#555' }]}
                placeholder={lang === 'ar' ? 'اكتب طلبك هنا...' : 'Type your request...'}
                placeholderTextColor="#999"
                value={featureInput}
                onChangeText={setFeatureInput}
                multiline
                autoFocus
              />
              <TouchableOpacity style={s.featureSendBtn} onPress={handleFeatureSend}>
                <Text style={s.featureSendText}>{lang === 'ar' ? 'إرسال' : 'Send'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuBtn: { padding: 4 },
  headerName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  onlineText: { fontSize: 11, color: '#10B981', fontWeight: '500' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F0FF', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 10, shadowColor: '#6B21A8', shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
  statusText: { fontSize: 11, fontWeight: '600', color: '#6B21A8', marginLeft: 4 },
  iconBtn: { padding: 8 },
  crownBtn: { padding: 6 },
  listContent: { paddingHorizontal: 14, paddingVertical: 12, flexGrow: 1 },
  welcomeWrap: { alignItems: 'center', paddingTop: 40 },
  welcomeEmoji: { fontSize: 44, marginBottom: 10 },
  welcomeText: { fontSize: 16, color: '#1A1A1A', fontWeight: '600', textAlign: 'center', marginBottom: 24, paddingHorizontal: 20 },
  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  suggestBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F3F0FF', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#E0D9F5', shadowColor: '#6B21A8', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  suggestText: { fontSize: 13, color: '#6B21A8', fontWeight: '600' },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 },
  userRow: { justifyContent: 'flex-end' },
  twinRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  userBubble: { backgroundColor: '#6B21A8', borderBottomRightRadius: 4 },
  twinBubble: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#EFEFEF' },
  userText: { color: '#FFF', fontSize: 15, lineHeight: 22 },
  twinText: { color: '#1A1A1A', fontSize: 15, lineHeight: 22 },
  typingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 8 },
  typingBubble: { backgroundColor: '#FFF', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: '#EEE' },
  typingDots: { color: '#6B21A8', fontSize: 16, letterSpacing: 3 },
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F0F0F0', gap: 6 },
  textInput: { flex: 1, backgroundColor: '#F8F8F8', color: '#1A1A1A', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, fontSize: 15, maxHeight: 100, minHeight: 44, borderWidth: 1, borderColor: '#EFEFEF' },
  sendBtn: { backgroundColor: '#6B21A8', width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', shadowColor: '#6B21A8', shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sidebar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 300 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  attachMenu: { flexDirection: 'row', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, justifyContent: 'space-around', flexWrap: 'wrap', backgroundColor: '#FFF' },
  attachItem: { alignItems: 'center', gap: 6 },
  attachLabel: { fontSize: 12, color: '#666' },
  featureOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  featureContainer: { width: '85%', backgroundColor: '#FFF', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, elevation: 8 },
  featureHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  featureTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  featureInput: { backgroundColor: '#F8F8F8', borderRadius: 12, padding: 14, fontSize: 15, minHeight: 80, textAlignVertical: 'top', marginBottom: 12, borderWidth: 1, borderColor: '#EFEFEF' },
  featureSendBtn: { backgroundColor: '#6B21A8', padding: 14, borderRadius: 12, alignItems: 'center' },
  featureSendText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
