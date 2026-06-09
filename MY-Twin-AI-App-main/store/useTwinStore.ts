import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

// ── الأنواع ─────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: 'user' | 'twin';
  content: string;
  image?: string;
  timestamp: number;
  failed?: boolean;
}

export interface RelationshipDims {
  trust: number;
  empathy: number;
  humor: number;
  support: number;
  affection: number;
  dependency: number;
}

export type Tier = 'free' | 'free_trial_14d' | 'premium_trial' | 'premium' | 'pro' | 'yearly' | 'plus';
export type Theme = 'dark' | 'light';
export type Lang = 'ar' | 'en';
export type TwinGender = 'female' | 'male';
export type TwinStyle = 'supportive' | 'coach' | 'wise' | 'fun' | 'calm';
export type ReplyStyle = 'short' | 'medium' | 'long';

// ── القيم الابتدائية ───────────────────────────
const initialState = {
  userId: '',
  twinName: 'توأمك',
  twinGender: 'female' as TwinGender,
  twinStyle: 'supportive' as TwinStyle,
  bondLevel: 0,
  energy: 50,
  relationshipDims: {
    trust: 0,
    empathy: 0,
    humor: 0,
    support: 0,
    affection: 0,
    dependency: 0,
  },
  chatHistory: [] as ChatMessage[],
  calmMode: false,
  theme: 'light' as Theme,
  lang: 'ar' as Lang,
  tier: 'free' as Tier,
  points: 0,
  badges: [] as string[],
  voiceEnabled: false,
  replyStyle: 'medium' as ReplyStyle,
};

// ── توليد معرف فريد ────────────────────────────
const generateId = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

// ── المتجر ─────────────────────────────────────
interface TwinStore {
  userId: string;
  setAuth: (userId: string) => void;
  twinName: string;
  setTwinName: (name: string) => void;
  twinGender: TwinGender;
  setTwinGender: (gender: TwinGender) => void;
  twinStyle: TwinStyle;
  setTwinStyle: (style: TwinStyle) => void;
  bondLevel: number;
  relationshipDims: RelationshipDims;
  energy: number;
  setEnergy: (value: number) => void;
  updateBond: (newBond: number) => void;
  updateRelationshipDims: (dims: Partial<RelationshipDims>) => void;
  chatHistory: ChatMessage[];
  addMessage: (role: 'user' | 'twin', content: string, image?: string) => void;
  markMessageFailed: (id: string) => void;
  clearHistory: () => void;
  calmMode: boolean;
  toggleCalmMode: () => void;
  theme: Theme;
  toggleTheme: () => void;
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  tier: Tier;
  updateTier: (tier: Tier) => void;
  points: number;
  addPoints: (pts: number) => void;
  badges: string[];
  addBadge: (badge: string) => void;
  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
  replyStyle: ReplyStyle;
  setReplyStyle: (style: ReplyStyle) => void;
  triggerHaptic: () => void;
  logout: () => void;
}

export const useTwinStore = create<TwinStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ── المصادقة ─────────────────────────────
      setAuth: (userId) => set({ userId }),

      // ── إعدادات التوأم ───────────────────────
      setTwinName: (name) => set({ twinName: name }),
      setTwinGender: (gender) => set({ twinGender: gender }),
      setTwinStyle: (style) => set({ twinStyle: style }),

      // ── الطاقة ───────────────────────────────
      setEnergy: (value) => set({ energy: Math.max(0, Math.min(value, 100)) }),

      // ─ـ مستوى العلاقة (محمي) ─────────────────
      updateBond: (newBond) =>
        set((state) => {
          const safeBond = Math.max(0, Math.min(newBond, 100));
          const badges = [...state.badges];
          if (safeBond >= 40 && !badges.includes('friend')) badges.push('friend');
          if (safeBond >= 60 && !badges.includes('trusted')) badges.push('trusted');
          if (safeBond >= 80 && !badges.includes('soulmate')) badges.push('soulmate');
          if (safeBond >= 95 && !badges.includes('champion')) badges.push('champion');
          return { bondLevel: safeBond, badges };
        }),

      // ─ـ أبعاد العلاقة ────────────────────────
      updateRelationshipDims: (dims) =>
        set((state) => ({
          relationshipDims: { ...state.relationshipDims, ...dims },
        })),

      // ─ـ الرسائل (تحفظ الصورة) ────────────────
      addMessage: (role, content, image) =>
        set((state) => ({
          chatHistory: [
            ...state.chatHistory,
            {
              id: generateId(),
              role,
              content,
              image: image || undefined,
              timestamp: Date.now(),
              failed: false,
            },
          ].slice(-100),
        })),

      markMessageFailed: (id) =>
        set((state) => ({
          chatHistory: state.chatHistory.map((msg) =>
            msg.id === id ? { ...msg, failed: true } : msg
          ),
        })),

      clearHistory: () => set({ chatHistory: [] }),

      // ─ـ الإعدادات ────────────────────────────
      toggleCalmMode: () => set((state) => ({ calmMode: !state.calmMode })),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setLang: (lang) => set({ lang }),
      toggleLang: () => set((state) => ({ lang: state.lang === 'ar' ? 'en' : 'ar' })),

      // ─ـ الباقة ───────────────────────────────
      updateTier: (tier) => set({ tier }),

      // ─ـ المكافآت ─────────────────────────────
      addPoints: (pts) => set((state) => ({ points: state.points + pts })),
      addBadge: (badge) =>
        set((state) =>
          state.badges.includes(badge) ? state : { badges: [...state.badges, badge] }
        ),

      // ─ـ الصوت ────────────────────────────────
      setVoiceEnabled: (enabled) => set({ voiceEnabled: enabled }),

      // ─ـ أسلوب الرد ───────────────────────────
      setReplyStyle: (style) => set({ replyStyle: style }),

      // ─ـ اللمس ────────────────────────────────
      triggerHaptic: () => {
        if (!get().calmMode) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },

      // ─ـ تسجيل الخروج (يعيد كل القيم) ─────────
      logout: () => set({ ...initialState, chatHistory: [] }),
    }),
    {
      name: 'mytwin-store',
      storage: createJSONStorage(() => AsyncStorage),
      // تخزين البيانات فقط (بدون دوال)
      partialize: (state) => ({
        userId: state.userId,
        twinName: state.twinName,
        twinGender: state.twinGender,
        twinStyle: state.twinStyle,
        bondLevel: state.bondLevel,
        relationshipDims: state.relationshipDims,
        energy: state.energy,
        calmMode: state.calmMode,
        theme: state.theme,
        lang: state.lang,
        tier: state.tier,
        points: state.points,
        badges: state.badges,
        voiceEnabled: state.voiceEnabled,
        replyStyle: state.replyStyle,
      }),
    }
  )
);
