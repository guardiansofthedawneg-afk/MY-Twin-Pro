import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, Modal, Animated, Alert, Image as RNImage } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTwinStore } from '../store/useTwinStore';
import { askTwin } from '../lib/api';
import { COLORS, FONTS } from '../utils/theme';
import { startRecordingVoice, stopRecordingVoice, speakResponse } from '../utils/voice_engine';
import { useToast } from '../components/Toast';
import { Mic, ArrowUp, Paperclip, Image as ImageIcon, FileText, Sun, MoonStar, Smile, Target, Brain, PenTool, X, ChevronRight } from 'lucide-react-native';

type ChatMessage = {
  role: 'user' | 'twin';
  content: string;
  created_at?: string;
};

function getWelcomeMessage(lang: 'ar' | 'en'): { emoji: string; text: string } {
  const hour = new Date().getHours();
  if (lang === 'ar') {
    if (hour >= 6 && hour < 12) return { emoji: '🌅', text: 'صباح الخير! كيف حالك اليوم؟' };
    if (hour >= 12 && hour < 18) return { emoji: '🌞', text: 'مرحباً! يومي أفضل الآن' };
    if (hour >= 18 && hour < 24) return { emoji: '🌙', text: 'مساء الخير! كيف كان يومك؟' };
    return { emoji: '🌃', text: 'سهرة سعيدة! لنكن معاً؟' };
  } else {
    if (hour >= 6 && hour < 12) return { emoji: '🌅', text: 'Good morning! How are you today?' };
    if (hour >= 12 && hour < 18) return { emoji: '🌞', text: 'Hello! My day just got better' };
    if (hour >= 18 && hour < 24) return { emoji: '🌙', text: 'Good evening! How was your day?' };
    return { emoji: '🌃', text: 'Happy late night! Shall we stay together?' };
  }
}

function getQuickSuggestions(lang: 'ar' | 'en') {
  if (lang === 'ar') return [
    { icon: Smile, label: 'دردشة عادية', prompt: 'لنتحدث عن أي شيء يخطر ببالك' },
    { icon: Target, label: 'مساعدة في مهمة', prompt: 'أريد مساعدتك في إنجاز مهمة' },
    { icon: Brain, label: 'تحليل مشاعر', prompt: 'أريد أن أفهم مشاعري اليوم' },
    { icon: PenTool, label: 'إبداع وكتابة', prompt: 'لنكتب شيئاً إبداعياً معاً' },
  ];
  return [
    { icon: Smile, label: 'Casual Chat', prompt: 'Let\'s talk about anything' },
    { icon: Target, label: 'Task Help', prompt: 'I need help with a task' },
    { icon: Brain, label: 'Analyze Mood', prompt: 'I want to understand my feelings' },
    { icon: PenTool, label: 'Creative Writing', prompt: 'Let\'s write something creative' },
  ];
}

export default function Chat() {
  const { twinName, bondLevel, relationshipDims, chatHistory, addMessage, updateBond, updateRelationshipDims, calmMode, toggleCalmMode, triggerHaptic, lang } = useTwinStore();
  const { showToast } = useToast();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [, setEmotion] = useState('neutral');
  const [isRecording, setIsRecording] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const recordWave = useRef(new Animated.Value(1)).current;
  const isRTL = lang === 'ar';
  const welcome = getWelcomeMessage(lang);
  const suggestions = getQuickSuggestions(lang);

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [chatHistory]);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(Animated.sequence([
        Animated.timing(recordWave, { toValue: 1.3, duration: 300, useNativeDriver: true }),
        Animated.timing(recordWave, { toValue: 0.8, duration: 300, useNativeDriver: true }),
      ])).start();
    } else {
      recordWave.setValue(1);
    }
  }, [isRecording]);

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
      setEmotion(res?.emotion?.primary ?? 'neutral');
      if (res?.importance > 0.7) {
        showToast(lang === 'ar' ? 'تم حفظ ذكرى جديدة ✨' : 'New memory saved ✨', 'success');
      }
      if (res.tokens_left && res.tokens_left < 50) {
        Alert.alert(
          lang === 'ar' ? 'تنبيه' : 'Notice',
          lang === 'ar' ? 'طاقتي على وشك النفاد! 💜' : 'Energy almost depleted! 💜'
        );
      }
      if (res.tts) speakResponse(res.reply, res.tts);
    } catch (error: unknown) {
      addMessage('twin', lang === 'ar' ? 'تعذر الاتصال بالخادم.' : 'Unable to connect.');
    } finally {
      setLoading(false);
    }
  };

  const handleVoice = async () => {
    if (isRecording) {
      setIsRecording(false);
      const text = await stopRecordingVoice();
      if (text) send(text);
    } else {
      const started = await startRecordingVoice();
      if (started) {
        setIsRecording(true);
        setTimeout(async () => {
          if (isRecording) {
            setIsRecording(false);
            const text = await stopRecordingVoice();
            if (text) send(text);
          }
        }, 10000);
      } else {
        Alert.alert('خطأ', 'تعذر الوصول للميكروفون.');
      }
    }
  };

  const handleImage = async () => {
    setShowAttachMenu(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) addMessage('user', '[صورة]');
  };

  const handleFile = async () => {
    setShowAttachMenu(false);
    Alert.alert('قريباً', 'ميزة إرسال الملفات قيد التطوير.');
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isUser = item.role === 'user';
    const isLast = index === chatHistory.length - 1;
    return (
      <Animated.View style={[
        styles.messageRow,
        isUser ? (isRTL ? styles.userRowRTL : styles.userRow) : (isRTL ? styles.twinRowRTL : styles.twinRow),
        isLast && { opacity: fadeAnim }
      ]}>
        {!isUser && (
          <View style={styles.avatarMini}>
            <Text style={styles.avatarMiniText}>{twinName?.charAt(0)?.toUpperCase() || '?'}</Text>
          </View>
        )}
        <TouchableOpacity activeOpacity={0.8} style={[styles.bubble, isUser ? styles.userBubble : styles.twinBubble]}>
          <Text style={isUser ? styles.userText : styles.twinText}>{item.content}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const ListEmptyComponent = () => (
    <View style={styles.welcomeContainer}>
      <Text style={styles.welcomeEmoji}>{welcome.emoji}</Text>
      <Text style={styles.welcomeText}>{welcome.text}</Text>
      <View style={styles.suggestionsContainer}>
        {suggestions.map((item, i) => {
          const IconComponent = item.icon;
          return (
            <TouchableOpacity key={i} style={styles.suggestionBtn} onPress={() => send(item.prompt)}>
              <IconComponent size={20} color={COLORS.primary} style={{ marginBottom: 6 }} />
              <Text style={styles.suggestionText}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
            <ChevronRight size={24} color={COLORS.text} style={{ transform: [{ scaleX: isRTL ? 1 : -1 }] }} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.onlineDot} />
            <Text style={styles.headerName}>{twinName || 'توأمك'}</Text>
          </View>
          <TouchableOpacity style={styles.headerBtn} onPress={toggleCalmMode}>
            {calmMode ? <MoonStar size={20} color={COLORS.textSecondary} /> : <Sun size={20} color={COLORS.primary} />}
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={chatHistory}
          keyExtractor={(_, i) => i.toString()}
          renderItem={renderMessage}
          ListEmptyComponent={ListEmptyComponent}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          removeClippedSubviews
          initialNumToRender={10}
          maxToRenderPerBatch={5}
        />

        {loading && (
          <View style={styles.typingContainer}>
            <View style={styles.typingBubble}>
              <View style={styles.typingDots}>
                <Animated.View style={[styles.typingDot, { opacity: 1 }]} />
                <Animated.View style={[styles.typingDot, { opacity: 0.6 }]} />
                <Animated.View style={[styles.typingDot, { opacity: 0.3 }]} />
              </View>
              <Text style={styles.typingText}>{lang === 'ar' ? 'التوأم يكتب...' : 'Twin is typing...'}</Text>
            </View>
          </View>
        )}

        <View style={styles.inputBar}>
          <TouchableOpacity onPress={handleVoice} style={styles.inputIconBtn}>
            <Animated.View style={{ transform: [{ scale: recordWave }] }}>
              <Mic size={22} color={isRecording ? '#EF4444' : COLORS.textSecondary} />
            </Animated.View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowAttachMenu(true)} style={styles.inputIconBtn}>
            <Paperclip size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TextInput
            style={[styles.textInput, isRTL && { textAlign: 'right' }]}
            value={input}
            onChangeText={setInput}
            placeholder={lang === 'ar' ? 'اكتب رسالتك...' : 'Type a message...'}
            placeholderTextColor={COLORS.textSecondary}
            multiline
            maxLength={2000}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={() => send()}
          />
          {input.trim().length > 0
            ? <TouchableOpacity onPress={() => send()} style={styles.sendBtn}><ArrowUp size={20} color="#FFF" /></TouchableOpacity>
            : <View style={styles.sendBtnPlaceholder} />
          }
        </View>

        <Modal visible={showAttachMenu} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowAttachMenu(false)}>
            <View style={styles.attachMenu}>
              <TouchableOpacity style={styles.attachItem} onPress={handleImage}>
                <ImageIcon size={24} color={COLORS.primary} />
                <Text style={styles.attachLabel}>{lang === 'ar' ? 'صورة' : 'Image'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachItem} onPress={handleFile}>
                <FileText size={24} color={COLORS.primary} />
                <Text style={styles.attachLabel}>{lang === 'ar' ? 'ملف' : 'File'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachItem} onPress={() => setShowAttachMenu(false)}>
                <X size={24} color={COLORS.textSecondary} />
                <Text style={styles.attachLabel}>{lang === 'ar' ? 'إغلاق' : 'Close'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.chatBg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: COLORS.header, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerBtn: { padding: 8 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' },
  headerName: { color: COLORS.text, fontSize: FONTS.subtitle, fontWeight: '700' },
  listContent: { paddingHorizontal: 16, paddingBottom: 16, flexGrow: 1 },
  welcomeContainer: { alignItems: 'center', paddingTop: 60 },
  welcomeEmoji: { fontSize: 48, marginBottom: 12 },
  welcomeText: { fontSize: FONTS.subtitle, color: COLORS.text, fontWeight: '600', textAlign: 'center', marginBottom: 32, paddingHorizontal: 20 },
  suggestionsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, paddingHorizontal: 10 },
  suggestionBtn: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, width: '45%', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  suggestionText: { fontSize: FONTS.small, color: COLORS.text, textAlign: 'center', marginTop: 4 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
  userRow: { justifyContent: 'flex-end' },
  twinRow: { justifyContent: 'flex-start' },
  userRowRTL: { justifyContent: 'flex-start' },
  twinRowRTL: { justifyContent: 'flex-end' },
  avatarMini: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  avatarMiniText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  bubble: { maxWidth: '80%', padding: 14, borderRadius: 18, marginBottom: 4 },
  userBubble: { backgroundColor: '#4A90E2', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  twinBubble: { backgroundColor: COLORS.card, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  userText: { color: '#FFF', fontSize: FONTS.body, lineHeight: 22 },
  twinText: { color: COLORS.text, fontSize: FONTS.body, lineHeight: 22 },
  typingContainer: { paddingHorizontal: 16, paddingBottom: 8 },
  typingBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 18, alignSelf: 'flex-start', borderWidth: 1, borderColor: COLORS.border },
  typingDots: { flexDirection: 'row', marginRight: 8 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.textSecondary, marginHorizontal: 2 },
  typingText: { color: COLORS.textSecondary, fontSize: FONTS.small },
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, backgroundColor: COLORS.header, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 8 },
  inputIconBtn: { padding: 8 },
  textInput: { flex: 1, backgroundColor: COLORS.white, color: COLORS.text, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, fontSize: FONTS.body, maxHeight: 100, minHeight: 44, borderWidth: 1, borderColor: COLORS.border },
  sendBtn: { backgroundColor: '#4A90E2', width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  sendBtnPlaceholder: { width: 42, height: 42 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end', alignItems: 'center' },
  attachMenu: { flexDirection: 'row', backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, width: '100%', justifyContent: 'space-around' },
  attachItem: { alignItems: 'center' },
  attachLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
});
