import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Modal, Animated, Alert, StatusBar, Image } from 'react-native';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Localization from 'expo-localization';
import { supabase } from '../lib/supabase';
import { useTwinStore } from '../store/useTwinStore';
import { API } from '../lib/api';
import SideMenu from '../components/SideMenu';
import { Menu, Send, Plus, X } from 'lucide-react-native';
import { speakResponse } from '../utils/voice_engine';

const TWIN_ICON = require('../assets/icon.png');

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
    { prompt: 'لنتحدث عن أي شيء' },
    { prompt: 'أريد مساعدتك في مهمة' },
    { prompt: 'أريد أن أفهم مشاعري' },
    { prompt: 'لنكتب شيئاً معاً' },
  ];
  return [
    { prompt: "Let's talk" },
    { prompt: 'I need help' },
    { prompt: 'Help me understand my feelings' },
    { prompt: "Let's create together" },
  ];
}

type ChatMessage = { role: 'user' | 'twin'; content: string; image?: string };

export default function Chat() {
  const insets = useSafeAreaInsets();
  const { userId, twinName, twinGender, tier, chatHistory, addMessage, updateBond, updateRelationshipDims, calmMode, triggerHaptic, lang, theme, setTwinName, setTwinGender } = useTwinStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [featureModal, setFeatureModal] = useState<{ visible: boolean; type: string }>({ visible: false, type: '' });
  const [featureInput, setFeatureInput] = useState('');
  const flatRef = useRef<FlatList<ChatMessage>>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const attachAnim = useRef(new Animated.Value(0)).current;
  const isRTL = lang === 'ar';
  const welcome = getWelcome(lang);
  const suggestions = getSuggestions(lang);
  const isFree = tier === 'free';
  const isDark = theme === 'dark';
  const isDarkMode = theme === 'dark';

  // --- نبض الأيقونة بعد كل رد ---
  useEffect(() => {
    if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'twin') {
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 150, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [chatHistory]);

  // --- قراءة بيانات التوأم من Supabase ---
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('twin_name, twin_gender')
          .eq('id', userId)
          .single();
        if (profile) {
          if (profile.twin_name) setTwinName(profile.twin_name);
          if (profile.twin_gender) setTwinGender(profile.twin_gender);
        }
      } catch (e) {
        console.warn('Failed to fetch profile data:', e);
      }
    };
    fetchProfile();
  }, [userId]);

  // --- التمرير التلقائي ---
  useEffect(() => {
    const timer = setTimeout(() => {
      flatRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [chatHistory]);

  // --- أنيميشن المرفقات ---
  useEffect(() => {
    Animated.spring(attachAnim, { toValue: showAttach ? 1 : 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  }, [showAttach]);

  const openMenu = useCallback(() => { setMenuVisible(true); Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(); }, [slideAnim]);
  const closeMenu = useCallback(() => { Animated.timing(slideAnim, { toValue: -300, duration: 200, useNativeDriver: true }).start(() => setMenuVisible(false)); }, [slideAnim]);

  const countryCode = (Localization.region || 'SA').toUpperCase();

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
        bond_level: 0,
        relationship_dims: {},
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
      updateBond(res.data.new_bond ?? 0);
      if (res.data.dims_update) updateRelationshipDims(res.data.dims_update);
      if (soundEnabled) {
        try {
          await speakResponse(res.data.reply, { pitch: 1.0, rate: 1.0 });
        } catch (e) {
          console.log('TTS playback failed:', e);
        }
      }
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401) addMessage('twin', lang === 'ar' ? 'انتهت جلستك 🔒' : 'Session expired 🔒');
      else addMessage('twin', lang === 'ar' ? 'تعذر الاتصال 😔' : 'Connection failed 😔');
    } finally { setLoading(false); }
  }, [input, loading, twinName, calmMode, lang, addMessage, updateBond, updateRelationshipDims, triggerHaptic, soundEnabled, twinGender, countryCode]);

  const handleCamera = useCallback(async () => {
    setShowAttach(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert(lang === 'ar' ? 'صلاحية' : 'Permission', lang === 'ar' ? 'مطلوب إذن الكاميرا' : 'Camera permission needed'); return; }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 });
    if (!result.canceled && result.assets?.[0]?.base64) send('', result.assets[0].base64);
  }, [send, lang]);

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
    }
  }, [send, lang, handleCamera, isFree]);

  const handleFeatureSend = () => {
    const prompts: Record<string, string> = {
      search: '/search ',
      coach: lang === 'ar' ? 'أريد جلسة تدريب: ' : 'Coaching session: ',
      dream: lang === 'ar' ? 'أريد تحليل حلمي: ' : 'Dream analysis: ',
    };
    send(prompts[featureModal.type] + featureInput);
    setFeatureModal({ visible: false, type: '' });
    setFeatureInput('');
  };

  const attachItems = [
    { icon: '📷', label: lang === 'ar' ? 'كاميرا' : 'Camera', action: 'camera' },
    { icon: '🖼️', label: lang === 'ar' ? 'معرض' : 'Gallery', action: 'image' },
    { icon: '📄', label: lang === 'ar' ? 'ملف' : 'File', action: 'file' },
    { icon: '🔍', label: lang === 'ar' ? 'بحث' : 'Search', action: 'search' },
    { icon: '💪', label: lang === 'ar' ? 'تدريب' : 'Coaching', action: 'coach' },
    { icon: '🌙', label: lang === 'ar' ? 'تفسير أحلام' : 'Dreams', action: 'dream' },
  ];

  const renderMsg = useCallback(({ item, index }: { item: ChatMessage; index: number }) => {
    const isUser = item.role === 'user';
    const isDark = theme === 'dark';
    return (
      <View style={[s.msgRow, isUser ? s.userRow : s.twinRow, isDark && { backgroundColor: 'transparent' }]}>
        {!isUser && (
          <Animated.View style={{ transform: [{ scale: index === chatHistory.length - 1 ? pulseAnim : 1 }] }}>
            <Image source={TWIN_ICON} style={{ width: 28, height: 28, borderRadius: 14 }} resizeMode="contain" />
          </Animated.View>
        )}
        <View style={[s.bubble, isUser ? s.userBubble : s.twinBubble]}>
          <Text style={isUser ? s.userText : s.twinText}>{item.content}</Text>
        </View>
      </View>
    );
  }, [chatHistory.length, theme, pulseAnim]);

  const ListEmpty = useCallback(() => (
    <View style={s.welcomeWrap}>
      <Text style={s.welcomeEmoji}>{welcome.emoji}</Text>
      <Text style={s.welcomeText}>{welcome.text}</Text>
      <View style={s.suggestRow}>
        {suggestions.map((item, i) => (
          <TouchableOpacity key={i} style={s.suggestBtn} onPress={() => send(item.prompt)}>
            <Text style={s.suggestText}>{item.prompt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  ), [welcome, suggestions, send]);

  return (
    <View style={[s.root, { paddingTop: insets.top }, isDark && { backgroundColor: '#1A1A1A' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#1A1A1A' : '#FFFFFF'} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[s.header, isDark && { backgroundColor: '#1A1A1A', borderBottomColor: '#333' }]}>
          <TouchableOpacity onPress={openMenu} style={s.menuBtn}>
            <Menu size={22} stroke={isDark ? '#FFF' : '#1A1A1A'} />
          </TouchableOpacity>
          <Text style={[s.headerName, isDark && { color: '#FFF' }]}>{twinName || (lang === 'ar' ? 'توأمك' : 'Your Twin')}</Text>
          <View style={{ width: 22 }} />
        </View>

        <FlatList
          ref={flatRef}
          data={chatHistory}
          keyExtractor={(_, i) => i.toString()}
          renderItem={renderMsg}
          ListEmptyComponent={ListEmpty}
          contentContainerStyle={s.listContent}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          removeClippedSubviews
          initialNumToRender={15}
        />

        <View style={[s.inputBar, isDark && { backgroundColor: '#1A1A1A', borderTopColor: '#333' }]}>
          <TouchableOpacity onPress={() => setShowAttach(true)} style={s.addBtn}>
            <Text style={s.addBtnText}>+</Text>
          </TouchableOpacity>
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
          <TouchableOpacity
            onPress={() => send()}
            style={[s.sendBtn, { backgroundColor: input.trim().length > 0 ? '#6B21A8' : '#E0D9F5' }]}
          >
            <Send size={18} stroke={input.trim().length > 0 ? '#FFF' : '#C4B5D4'} />
          </TouchableOpacity>
        </View>

        <Modal visible={menuVisible} transparent animationType="none" onRequestClose={closeMenu}>
          <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={closeMenu}>
            <Animated.View style={[s.sidebar, { transform: [{ translateX: slideAnim }] }, isDark && { backgroundColor: '#1A1A1A' }]}>
              <SideMenu onClose={closeMenu} />
            </Animated.View>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showAttach} transparent animationType="none" onRequestClose={() => setShowAttach(false)}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowAttach(false)}>
            <Animated.View style={[s.attachMenu, { transform: [{ translateY: attachAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] }) }], opacity: attachAnim }, isDark && { backgroundColor: '#2A2A2A' }]}>
              {attachItems.map((item, idx) => (
                <TouchableOpacity key={idx} style={s.attachItem} onPress={() => handleAttachAction(item.action)}>
                  <Text style={{ fontSize: 24 }}>{item.icon}</Text>
                  <Text style={[s.attachLabel, isDark && { color: '#CCC' }]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={s.attachItem} onPress={() => setShowAttach(false)}>
                <X size={24} stroke="#EF4444" />
                <Text style={[s.attachLabel, { color: '#EF4444' }]}>{lang === 'ar' ? 'إغلاق' : 'Close'}</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </Modal>

        <Modal visible={featureModal.visible} transparent animationType="fade" onRequestClose={() => setFeatureModal({ visible: false, type: '' })}>
          <View style={s.featureOverlay}>
            <View style={[s.featureContainer, isDark && { backgroundColor: '#2A2A2A' }]}>
              <Text style={[s.featureTitle, isDark && { color: '#FFF' }]}>
                {featureModal.type === 'search' ? (lang === 'ar' ? 'بحث' : 'Search') :
                 featureModal.type === 'coach' ? (lang === 'ar' ? 'تدريب' : 'Coaching') :
                 (lang === 'ar' ? 'تفسير أحلام' : 'Dream Analysis')}
              </Text>
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
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  menuBtn: { padding: 4 },
  headerName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', flex: 1, textAlign: 'center' },
  listContent: { paddingHorizontal: 12, paddingVertical: 12, flexGrow: 1 },
  welcomeWrap: { alignItems: 'center', paddingTop: 40 },
  welcomeEmoji: { fontSize: 44, marginBottom: 10 },
  welcomeText: { fontSize: 16, color: '#1A1A1A', fontWeight: '600', textAlign: 'center', marginBottom: 24, paddingHorizontal: 20 },
  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  suggestBtn: { backgroundColor: '#F3F0FF', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#E0D9F5' },
  suggestText: { color: '#6B21A8', fontSize: 13, fontWeight: '600' },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 },
  userRow: { justifyContent: 'flex-end' },
  twinRow: { justifyContent: 'flex-start', gap: 8 },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  userBubble: { backgroundColor: '#6B21A8', borderBottomRightRadius: 4 },
  twinBubble: { backgroundColor: 'transparent', borderBottomLeftRadius: 4 },
  userText: { color: '#FFF', fontSize: 15, lineHeight: 22 },
  twinText: { color: '#1A1A1A', fontSize: 15, lineHeight: 22 },
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F0F0F0', gap: 8 },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F0FF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E0D9F5' },
  addBtnText: { fontSize: 18, color: '#6B21A8', fontWeight: '700' },
  textInput: { flex: 1, backgroundColor: '#F8F8F8', color: '#1A1A1A', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, fontSize: 15, maxHeight: 100, minHeight: 44, borderWidth: 1, borderColor: '#EFEFEF' },
  sendBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sidebar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 300 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  attachMenu: { flexDirection: 'row', backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, justifyContent: 'space-around', flexWrap: 'wrap' },
  attachItem: { alignItems: 'center', gap: 4 },
  attachLabel: { fontSize: 12, color: '#666' },
  featureOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  featureContainer: { width: '85%', backgroundColor: '#FFF', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, elevation: 8 },
  featureTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  featureInput: { backgroundColor: '#F8F8F8', borderRadius: 12, padding: 14, fontSize: 15, minHeight: 80, textAlignVertical: 'top', marginBottom: 12, borderWidth: 1, borderColor: '#EFEFEF' },
  featureSendBtn: { backgroundColor: '#6B21A8', padding: 14, borderRadius: 12, alignItems: 'center' },
  featureSendText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
