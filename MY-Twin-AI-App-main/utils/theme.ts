import { useTwinStore } from '../store/useTwinStore';

export interface ThemeColors {
  bg: string; bgSecondary: string; card: string; header: string;
  chatBg: string; text: string; textSecondary: string;
  primary: string; primaryLight: string; gold: string; rose: string;
  accent: string; accentGlow: string; border: string; inputBg: string;
  twinBubble: string; danger: string; success: string; white: string;
}

const DARK_THEME: ThemeColors = {
  bg: '#0F0A1A', bgSecondary: '#1A1226', card: '#1A1226', header: '#130D20',
  chatBg: '#0F0A1A', text: '#FFFFFF', textSecondary: '#8B7BA3',
  primary: '#A855F7', primaryLight: '#C084FC', gold: '#F59E0B', rose: '#F472B6',
  accent: '#A855F7', accentGlow: '#A855F733', border: '#2D1B4D', inputBg: '#161122',
  twinBubble: '#1A1226', danger: '#FF6B6B', success: '#4ADE80', white: '#FFFFFF',
};

const LIGHT_THEME: ThemeColors = {
  bg: '#FAFAF8', bgSecondary: '#F5F5F0', card: '#F5F5F0', header: '#F0F0EB',
  chatBg: '#FDFDF9', text: '#2D2D2D', textSecondary: '#6B6B6B',
  primary: '#6B21A8', primaryLight: '#A855F7', gold: '#B8860B', rose: '#C08497',
  accent: '#6B21A8', accentGlow: '#6B21A822', border: '#E8E8E3', inputBg: '#FDFDF9',
  twinBubble: '#F5F5F0', danger: '#DC2626', success: '#16A34A', white: '#FFFFFF',
};

// للاستخدام داخل Components
export function useTheme(): ThemeColors {
  const theme = useTwinStore((s) => s.theme);
  return theme === 'dark' ? DARK_THEME : LIGHT_THEME;
}

// للاستخدام خارج Components (مثل StyleSheet ثابت)
export function getTheme(isDark: boolean): ThemeColors {
  return isDark ? DARK_THEME : LIGHT_THEME;
}

// للتوافق مع الكود القديم - Light افتراضي
export const COLORS = LIGHT_THEME;
export const FONTS = { title: 28, subtitle: 18, body: 16, small: 14, tiny: 12 };
export const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const colors = { purple: '#6B21A8', purpleDark: '#5B21B6', bgDark: '#0F0A1A' };
