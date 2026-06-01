import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, Modal, Animated, Alert, StatusBar } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useTwinStore } from '../store/useTwinStore';
import { askTwin } from '../lib/api';
import { startRecordingVoice, stopRecordingVoice, speakResponse } from '../utils/voice_engine';
import { useToast } from '../components/Toast';
import CircleProgress from '../components/CircleProgress';
import CustomDrawerContent from '../components/CustomDrawerContent';
import { Mic, ArrowUp, Paperclip, Image as ImageIcon, FileText, Sun, MoonStar, Smile, Target, Brain, PenTool, X, Menu } from 'lucide-react-native';

type ChatMessage = { role: 'user' | 'twin'; content: string; };

// أيقونة التوأم حسب الجنس
function TwinAvatar({ gender, name, size = 40 }: { gender: string; name: string; size?: number }) {
  const isFemale = gender === 'female';
  return (
    <View style={[avatarStyles.container, {
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: isFemale ? '#C084FC' : '#6B21A8',
    }]}>
      <Text style={[avatarStyles.emoji, { fontSize: size * 0.45 }]}>
        {isFemale ? '🌸' : '⚡'}
      </Text>
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center', shadowColor: '#6B21A8', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  emoji: {},
});

// زرار متغير باللمس
function AnimatedButton({ onPress, children, style }: any) {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, speed: 50 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }),
    ]).start();
    onPress?.();
  };
  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={1}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

function getWelcomeMessage(lang: 'ar' | 'en') {
  const hour = new Date().getHours();
  if (lang === 'ar') {
    if (hour >= 6 && hour < 12) return { emoji: '🌅', text: 'صباح الخير! كيف حالك اليوم؟' };
    if (hour >= 12 && hour < 18) return { emoji: '🌞', text: 'مرحباً! كيف يومك؟' };
    if (hour >= 18 && hour < 24) return { emoji: '🌙', text: 'مساء الخير! كيف كان يومك؟' };
    return { emoji: '🌃', text: 'سهرة سعيدة! لنكن معاً؟' };
  }
  if (hour >= 6 && hour < 12) return { emoji: '🌅', text: 'Good morning! How are you today?' };
  if (hour >= 12 && hour < 18) return { emoji: '🌞', text: 'Hello! How is your day?' };
  if (hour >= 18 && hour < 24) return { emoji: '🌙', text: 'Good evening! How was your day?' };
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
    { icon: Smile, label: 'Chat', prompt: "Let's talk about anything" },
    { icon: Target, label: 'Task', prompt: 'I need help with a task' },
    { icon: Brain, label: 'Feelings', prompt: 'Help me understand my feelings' },
    { icon: PenTool, label: 'Creative', prompt: "Let's write something together" },
  ];
}

export default function Chat() {
  const { twinName, twinGender, bondLevel, relationshipDims, chatHistory, addMessage, updateBond, updateRelationshipDims, calmMode, toggleCalmMode, triggerHaptic, lang } = useTwinStore();
  const { showToast } = useToast();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [energy] = useState(85);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const recordWave = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const isRTL = lang === 'ar';
  const welcome = getWelcomeMessage(lang);
  const suggestions = getSuggestions(lang);

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [chatHistory]);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(Animated.sequence([
        Animated.timing(recordWave, { toValue: 1.3, duration: 300, useNativeDriver: true }),
        Animated.timing(recordWave, { toValue: 0.8, duration: 300, useNativeDriver: true }),
      ])).start();
    } else { recordWave.setValue(1); }
  }, [isRecording]);

  const openMenu = () => {
    setMenuVisible(true);
    Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, { toValue: -300, duration: 200, useNativeDriver: true }).start(() => setMenuVisible(false));
  };

  const send = async (messageText?: string) => {
    const message = (messageText || input).trim();
    if (!message || loading) return;
    triggerHaptic();
    addMessage('user', message);
    setInput('');
    setLoading(true);
    try {
      const res = await askTwin(message, twinName, bondLevel, relationshipDims, calmMode);
      addMessage('twin', res.reply);
      updateBond(res.new_bond ?? bondLevel);
      if (res.dims_update) updateRelationshipDims(res.dims_update);
      if (res?.importance > 0.7) showToast(lang === 'ar' ? 'تم حفظ ذكرى ✨' : 'Memory saved ✨', 'success');
      if (res.tts) speakResponse(res.reply, res.tts);
    } catch {
      addMessage('twin', lang === 'ar' ? 'تعذر الاتصال بالخادم 😔' : 'Connection failed 😔');
    } finally { setLoading(false); }
  };

  const handleVoice = async () => {
    if (isRecording) {
      setIsRecording(false);
      const text = await stopRecordingVoice();
      if (text) send(text);
    } else {
      const started = await startRecordingVoice();
      if (started) setIsRecording(true);
      else Alert.alert(lang === 'ar' ? 'خطأ' : 'Error', lang === 'ar' ? 'تعذر الوصول للميكروفون' : 'Mic denied');
    }
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isUser = item.role === 'user';
    const isLast = index === chatHistory.length - 1;
    return (
      <Animated.View style={[
        styles.messageRow,
        isUser ? styles.userRow : styles.twinRow,
        isLast && { opacity: fadeAnim }
      ]}>
        {!isUser && (
          <TwinAvatar gender={twinGender} name={twinName} size={30} />
        )}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.twinBubble, !isUser && { marginLeft: 8 }]}>
          <Text style={isUser ? styles.userText : styles.twinText}>{item.content}</Text>
        </View>
      </Animated.View>
    );
  };

  const ListEmpty = () => (
    <View style={styles.welcomeContainer}>
      <Text style={styles.welcomeEmoji}>{welcome.emoji}</Text>
      <Text style={styles.welcomeText}>{welcome.text}</Text>
      <View style={styles.suggestionsRow}>
        {suggestions.map((item, i) => {
          const Icon = item.icon;
          return (
            <AnimatedButton key={i} onPress={() => send(item.prompt)} style={styles.suggestionBtn}>
              <Icon size={18} color="#6B21A8" />
              <Text style={styles.suggestionText}>{item.label}</Text>
            </AnimatedButton>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Header مبسط */}
        <View style={styles.header}>
          {/* القائمة + التوأم */}
          <View style={styles.headerLeft}>
            <AnimatedButton onPress={openMenu} style={styles.menuBtn}>
              <Menu size={24} color="#1A1A1A" />
            </AnimatedButton>
            <TwinAvatar gender={twinGender} name={twinName} size={38} />
            <View style={styles.twinInfo}>
              <Text style={styles.headerName}>{twinName || (lang === 'ar' ? 'توأمك' : 'Your Twin')}</Text>
              <View style={styles.onlineRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>{lang === 'ar' ? 'متصل' : 'Online'}</Text>
              </View>
            </View>
          </View>

          {/* الدوائر + هدوء */}
          <View style={styles.headerRight}>
            <CircleProgress percentage={bondLevel} color="#6B21A8" size={46} label={lang === 'ar' ? 'ترابط' : 'Level'} icon="💜" />
            <CircleProgress percentage={energy} color="#10B981" size={46} label={lang === 'ar' ? 'طاقة' : 'Energy'} icon="⚡" />
            <AnimatedButton onPress={toggleCalmMode} style={styles.calmBtn}>
              {calmMode ? <MoonStar size={20} color="#6B21A8" /> : <Sun size={20} color="#F59E0B" />}
            </AnimatedButton>
          </View>
        </View>

        {/* المحادثة */}
        <FlatList
          ref={flatListRef}
          data={chatHistory}
          keyExtractor={(_, i) => i.toString()}
          renderItem={renderMessage}
          ListEmptyComponent={ListEmpty}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          removeClippedSubviews
          initialNumToRender={15}
        />

        {/* مؤشر الكتابة */}
        {loading && (
          <View style={styles.typingRow}>
            <TwinAvatar gender={twinGender} name={twinName} size={24} />
            <View style={[styles.typingBubble, { marginLeft: 8 }]}>
              <Text style={styles.typingDots}>• • •</Text>
            </View>
          </View>
        )}

        {/* شريط الإدخال */}
        <View style={styles.inputBar}>
          <AnimatedButton onPress={handleVoice} style={styles.iconBtn}>
            <Animated.View style={{ transform: [{ scale: recordWave }] }}>
              <Mic size={22} color={isRecording ? '#EF4444' : '#999'} />
            </Animated.View>
          </AnimatedButton>
          <AnimatedButton onPress={() => setShowAttachMenu(true)} style={styles.iconBtn}>
            <Paperclip size={20} color="#999" />
          </AnimatedButton>
          <TextInput
            style={[styles.textInput, isRTL && { textAlign: 'right' }]}
            value={input}
            onChangeText={setInput}
            placeholder={lang === 'ar' ? 'أنا هنا لأجلك... 💜' : "I'm here for you... 💜"}
            placeholderTextColor="#C4B5D4"
            multiline
            maxLength={2000}
            onSubmitEditing={() => send()}
          />
          {input.trim().length > 0 ? (
            <AnimatedButton onPress={() => send()} style={styles.sendBtn}>
              <ArrowUp size={18} color="#FFF" />
            </AnimatedButton>
          ) : <View style={{ width: 42 }} />}
        </View>

        {/* القائمة الجانبية */}
        <Modal visible={menuVisible} transparent animationType="none" onRequestClose={closeMenu}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeMenu}>
            <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
              <CustomDrawerContent onClose={closeMenu} />
            </Animated.View>
          </TouchableOpacity>
        </Modal>

        {/* المرفقات */}
        <Modal visible={showAttachMenu} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowAttachMenu(false)}>
            <View style={styles.attachMenu}>
              <AnimatedButton style={styles.attachItem} onPress={async () => {
                setShowAttachMenu(false);
                const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
                if (!r.canceled) addMessage('user', '[صورة]');
              }}>
                <ImageIcon size={26} color="#6B21A8" />
                <Text style={styles.attachLabel}>{lang === 'ar' ? 'صورة' : 'Image'}</Text>
              </AnimatedButton>
              <AnimatedButton style={styles.attachItem} onPress={() => { setShowAttachMenu(false); Alert.alert(lang === 'ar' ? 'قريباً' : 'Coming Soon', ''); }}>
                <FileText size={26} color="#6B21A8" />
                <Text style={styles.attachLabel}>{lang === 'ar' ? 'ملف' : 'File'}</Text>
              </AnimatedButton>
              <AnimatedButton style={styles.attachItem} onPress={() => setShowAttachMenu(false)}>
                <X size={26} color="#EF4444" />
                <Text style={styles.attachLabel}>{lang === 'ar' ? 'إغلاق' : 'Close'}</Text>
              </AnimatedButton>
            </View>
          </TouchableOpacity>
        </Modal>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuBtn: { padding: 6 },
  twinInfo: { justifyContent: 'center' },
  headerName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  onlineText: { fontSize: 11, color: '#10B981', fontWeight: '500' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  calmBtn: { padding: 6 },
  listContent: { paddingHorizontal: 14, paddingVertical: 12, flexGrow: 1 },
  welcomeContainer: { alignItems: 'center', paddingTop: 40 },
  welcomeEmoji: { fontSize: 44, marginBottom: 10 },
  welcomeText: { fontSize: 16, color: '#1A1A1A', fontWeight: '600', textAlign: 'center', marginBottom: 24, paddingHorizontal: 20 },
  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  suggestionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F3F0FF', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#E0D9F5' },
  suggestionText: { fontSize: 13, color: '#6B21A8', fontWeight: '600' },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 },
  userRow: { justifyContent: 'flex-end' },
  twinRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  userBubble: { backgroundColor: '#6B21A8', borderBottomRightRadius: 4 },
  twinBubble: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#EFEFEF' },
  userText: { color: '#FFF', fontSize: 15, lineHeight: 22 },
  twinText: { color: '#1A1A1A', fontSize: 15, lineHeight: 22 },
  typingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 8 },
  typingBubble: { backgroundColor: '#FFF', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: '#EEE' },
  typingDots: { color: '#6B21A8', fontSize: 16, letterSpacing: 3 },
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F0F0F0', gap: 6 },
  iconBtn: { padding: 8 },
  textInput: { flex: 1, backgroundColor: '#F8F8F8', color: '#1A1A1A', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, fontSize: 15, maxHeight: 100, minHeight: 44, borderWidth: 1, borderColor: '#EFEFEF' },
  sendBtn: { backgroundColor: '#6B21A8', width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sidebar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 300, backgroundColor: '#FFFFFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  attachMenu: { flexDirection: 'row', backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, justifyContent: 'space-around' },
  attachItem: { alignItems: 'center', gap: 6 },
  attachLabel: { fontSize: 12, color: '#666' },
});
