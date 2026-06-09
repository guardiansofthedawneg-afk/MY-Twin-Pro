import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const generateId = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

export interface ChatMessage {
  id: string;
  role: 'user' | 'twin';
  content: string;
  image?: string;
  timestamp: number;
  failed?: boolean;
}

export interface RelationshipDims {
  trust: number; empathy: number; humor: number;
  support: number; affection: number; dependency: number;
}

export type Tier = 'free' | 'free_trial_14d' | 'premium_trial' | 'premium' | 'pro' | 'yearly' | 'plus';
export type Theme = 'dark' | 'light';
export type Lang = 'ar' | 'en';
export type TwinGender = 'female' | 'male';
export type TwinStyle = 'supportive' | 'coach' | 'wise' | 'fun' | 'calm';
export type ReplyStyle = 'short' | 'medium' | 'long';

interface TwinStore {
  userId: string; setAuth: (userId: string) => void;
  twinName: string; setTwinName: (name: string) => void;
  twinGender: TwinGender; setTwinGender: (gender: TwinGender) => void;
  twinStyle: TwinStyle; setTwinStyle: (style: TwinStyle) => void;
  bondLevel: number; relationshipDims: RelationshipDims;
  energy: number; setEnergy: (value: number) => void;
  updateBond: (newBond: number) => void;
  updateRelationshipDims: (dims: Partial<RelationshipDims>) => void;
  chatHistory: ChatMessage[];
  addMessage: (role: 'user' | 'twin', content: string, image?: string) => void;
  clearHistory: () => void;
  calmMode: boolean; toggleCalmMode: () => void;
  theme: Theme; toggleTheme: () => void;
  lang: Lang; setLang: (lang: Lang) => void; toggleLang: () => void;
  tier: Tier; updateTier: (tier: Tier) => void;
  points: number; addPoints: (pts: number) => void;
  badges: string[]; addBadge: (badge: string) => void;
  voiceEnabled: boolean; setVoiceEnabled: (enabled: boolean) => void;
  replyStyle: ReplyStyle; setReplyStyle: (style: ReplyStyle) => void;
  menuVisible: boolean; openMenu: () => void; closeMenu: () => void;
  hasUsedTrial: boolean; setHasUsedTrial: (val: boolean) => void;
  twinTraits: string[]; setTwinTraits: (traits: string[]) => void;
  triggerHaptic: () => void;
  logout: () => void;
}

const initialState = {
  userId: '',
  twinName: 'توأمك',
  twinGender: 'female' as TwinGender,
  twinStyle: 'supportive' as TwinStyle,
  bondLevel: 0,
  energy: 50,
  relationshipDims: { trust: 0, empathy: 0, humor: 0, support: 0, affection: 0, dependency: 0 },
  chatHistory: [] as ChatMessage[],
  calmMode: false,
  theme: 'light' as Theme,
  lang: 'ar' as Lang,
  tier: 'free' as Tier,
  points: 0,
  badges: [] as string[],
  voiceEnabled: false,
  replyStyle: 'medium' as ReplyStyle,
  menuVisible: false,
  hasUsedTrial: false,
  twinTraits: [] as string[],
};

export const useTwinStore = create<TwinStore>()(persist((set, get) => ({
  ...initialState,

  setAuth: (userId) => set({ userId }),
  setTwinName: (name) => set({ twinName: name }),
  setTwinGender: (gender) => set({ twinGender: gender }),
  setTwinStyle: (style) => set({ twinStyle: style }),
  setEnergy: (value) => set({ energy: Math.max(0, Math.min(value, 100)) }),

  updateBond: (newBond) => set((state) => {
    const safeBond = Math.max(0, Math.min(newBond, 100));
    const badges = [...state.badges];
    if (safeBond >= 40 && !badges.includes('friend')) badges.push('friend');
    if (safeBond >= 60 && !badges.includes('trusted')) badges.push('trusted');
    if (safeBond >= 80 && !badges.includes('soulmate')) badges.push('soulmate');
    if (safeBond >= 95 && !badges.includes('champion')) badges.push('champion');
    return { bondLevel: safeBond, badges };
  }),

  updateRelationshipDims: (dims) => set((state) => ({
    relationshipDims: { ...state.relationshipDims, ...dims }
  })),

  addMessage: (role, content, image) => set((state) => ({
    chatHistory: [...state.chatHistory, {
      id: generateId(), role, content, image: image || undefined,
      timestamp: Date.now(), failed: false,
    }].slice(-100)
  })),

  clearHistory: () => set({ chatHistory: [] }),
  toggleCalmMode: () => set((s) => ({ calmMode: !s.calmMode })),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
  setLang: (lang) => set({ lang }),
  toggleLang: () => set((s) => ({ lang: s.lang === 'ar' ? 'en' : 'ar' })),
  updateTier: (tier) => set({ tier }),
  addPoints: (pts) => set((s) => ({ points: s.points + pts })),
  addBadge: (badge) => set((s) => s.badges.includes(badge) ? s : { badges: [...s.badges, badge] }),
  setVoiceEnabled: (enabled) => set({ voiceEnabled: enabled }),
  setReplyStyle: (style) => set({ replyStyle: style }),

  openMenu: () => set({ menuVisible: true }),
  closeMenu: () => set({ menuVisible: false }),
  setHasUsedTrial: (val) => set({ hasUsedTrial: val }),
  setTwinTraits: (traits) => set({ twinTraits: traits }),

  triggerHaptic: () => { if (!get().calmMode) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); },

  logout: () => set({ ...initialState, chatHistory: [] }),
}), {
  name: 'mytwin-store',
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({
    userId: state.userId, twinName: state.twinName, twinGender: state.twinGender,
    twinStyle: state.twinStyle, bondLevel: state.bondLevel, relationshipDims: state.relationshipDims,
    energy: state.energy, calmMode: state.calmMode, theme: state.theme, lang: state.lang,
    tier: state.tier, points: state.points, badges: state.badges,
    voiceEnabled: state.voiceEnabled, replyStyle: state.replyStyle,
    hasUsedTrial: state.hasUsedTrial, twinTraits: state.twinTraits,
  }),
}));
