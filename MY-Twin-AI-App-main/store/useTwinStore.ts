import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

export interface Message { role: 'user' | 'twin'; content: string; }
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

interface TwinStore {
  userId: string; setAuth: (userId: string) => void;
  twinName: string; setTwinName: (name: string) => void;
  twinGender: TwinGender; setTwinGender: (gender: TwinGender) => void;
  bondLevel: number; relationshipDims: RelationshipDims;
  updateBond: (newBond: number) => void;
  updateRelationshipDims: (dims: Partial<RelationshipDims>) => void;
  chatHistory: Message[]; addMessage: (role: 'user' | 'twin', content: string) => void; clearHistory: () => void;
  calmMode: boolean; toggleCalmMode: () => void;
  theme: Theme; toggleTheme: () => void;
  lang: Lang; setLang: (lang: Lang) => void; toggleLang: () => void;
  tier: Tier; updateTier: (tier: Tier) => void;
  points: number; addPoints: (pts: number) => void;
  badges: string[]; addBadge: (badge: string) => void;
  triggerHaptic: () => void;
}

export const useTwinStore = create<TwinStore>()(persist((set, get) => ({
  userId: '', setAuth: (userId) => set({ userId }),
  twinName: 'توأمك', setTwinName: (name) => set({ twinName: name }),
  twinGender: 'female', setTwinGender: (gender) => set({ twinGender: gender }),
  bondLevel: 0,
  relationshipDims: { trust: 0, empathy: 0, humor: 0, support: 0, affection: 0, dependency: 0 },
  updateBond: (newBond) => set((state) => {
    const badges = [...state.badges];
    if (newBond >= 40 && !badges.includes('friend')) badges.push('friend');
    if (newBond >= 60 && !badges.includes('trusted')) badges.push('trusted');
    if (newBond >= 80 && !badges.includes('soulmate')) badges.push('soulmate');
    if (newBond >= 95 && !badges.includes('champion')) badges.push('champion');
    return { bondLevel: newBond, badges };
  }),
  updateRelationshipDims: (dims) => set((state) => ({ relationshipDims: { ...state.relationshipDims, ...dims } })),
  chatHistory: [],
  addMessage: (role, content) => set((state) => ({ chatHistory: [...state.chatHistory, { role, content }].slice(-50) })),
  clearHistory: () => set({ chatHistory: [] }),
  calmMode: false, toggleCalmMode: () => set((state) => ({ calmMode: !state.calmMode })),
  theme: 'dark', toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  lang: 'ar', setLang: (lang) => set({ lang }), toggleLang: () => set((state) => ({ lang: state.lang === 'ar' ? 'en' : 'ar' })),
  tier: 'free', updateTier: (tier) => set({ tier }),
  points: 0, addPoints: (pts) => set((state) => ({ points: state.points + pts })),
  badges: [], addBadge: (badge) => set((state) => state.badges.includes(badge) ? state : { badges: [...state.badges, badge] }),
  triggerHaptic: () => { if (!get().calmMode) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); },
}), { name: 'mytwin-store', storage: createJSONStorage(() => AsyncStorage) }));
