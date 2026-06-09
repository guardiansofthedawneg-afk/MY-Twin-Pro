import { useTwinStore } from '../store/useTwinStore';

// ========== أنواع الألوان الموسعة ================
export interface ThemeColors {
  // الأساسية
  bg: string;
  bgSecondary: string;
  card: string;
  header: string;
  chatBg: string;
  text: string;
  textSecondary: string;
  primary: string;
  primaryLight: string;
  accent: string;
  accentGlow: string;
  border: string;
  inputBg: string;
  twinBubble: string;
  white: string;

  // النظام الدلالي (Soul Sync)
  soul: string;        // بنفسجي فاتح – جوهر الشخصية
  bond: string;        // وردي – العلاقة
  memory: string;      // أزرق – الذكريات
  emotion: string;     // برتقالي – المشاعر
  gold: string;
  rose: string;

  // حالات (Semantic)
  success: string;
  danger: string;
  warning: string;
  info: string;

  // تدرجات العلاقة (Dynamic Bond)
  bondLow: string;
  bondMedium: string;
  bondHigh: string;

  // تدرجات الطاقة
  energyLow: string;
  energyMedium: string;
  energyHigh: string;

  // ألوان المشاعر
  emotionJoy: string;
  emotionSad: string;
  emotionFear: string;
  emotionLove: string;
  emotionAnger: string;
  emotionNeutral: string;
  emotionSurprise: string;

  // ألوان الشخصيات (للاستخدام في الصوت أو الواجهة)
  personalityWise: string;
  personalityFun: string;
  personalityRomantic: string;
  personalityCoach: string;
  personalityCalm: string;
}

// ========== الثيم الداكن ========================
const DARK_THEME: ThemeColors = {
  bg: '#0F0A1A',
  bgSecondary: '#1A1226',
  card: '#1A1226',
  header: '#130D20',
  chatBg: '#0F0A1A',
  text: '#FFFFFF',
  textSecondary: '#8B7BA3',
  primary: '#A855F7',
  primaryLight: '#C084FC',
  accent: '#A855F7',
  accentGlow: '#A855F733',
  border: '#2D1B4D',
  inputBg: '#161122',
  twinBubble: '#1A1226',
  white: '#FFFFFF',

  // Soul Sync
  soul: '#C084FC',
  bond: '#EC4899',
  memory: '#60A5FA',
  emotion: '#F59E0B',
  gold: '#F59E0B',
  rose: '#F472B6',

  // Semantic
  success: '#4ADE80',
  danger: '#FF6B6B',
  warning: '#F59E0B',
  info: '#60A5FA',

  // Bond
  bondLow: '#60A5FA',
  bondMedium: '#C084FC',
  bondHigh: '#EC4899',

  // Energy
  energyLow: '#FF6B6B',
  energyMedium: '#F59E0B',
  energyHigh: '#4ADE80',

  // Emotions
  emotionJoy: '#F59E0B',
  emotionSad: '#60A5FA',
  emotionFear: '#A78BFA',
  emotionLove: '#EC4899',
  emotionAnger: '#FF6B6B',
  emotionNeutral: '#8B7BA3',
  emotionSurprise: '#F472B6',

  // Personalities
  personalityWise: '#8B5CF6',
  personalityFun: '#F59E0B',
  personalityRomantic: '#EC4899',
  personalityCoach: '#60A5FA',
  personalityCalm: '#6EE7B7',
};

// ========== الثيم الفاتح ========================
const LIGHT_THEME: ThemeColors = {
  bg: '#FAFAF8',
  bgSecondary: '#F5F5F0',
  card: '#F5F5F0',
  header: '#F0F0EB',
  chatBg: '#FDFDF9',
  text: '#2D2D2D',
  textSecondary: '#6B6B6B',
  primary: '#6B21A8',
  primaryLight: '#A855F7',
  accent: '#6B21A8',
  accentGlow: '#6B21A822',
  border: '#E8E8E3',
  inputBg: '#FDFDF9',
  twinBubble: '#F5F5F0',
  white: '#FFFFFF',

  // Soul Sync
  soul: '#A855F7',
  bond: '#EC4899',
  memory: '#3B82F6',
  emotion: '#D97706',
  gold: '#B8860B',
  rose: '#C08497',

  // Semantic
  success: '#16A34A',
  danger: '#DC2626',
  warning: '#D97706',
  info: '#3B82F6',

  // Bond
  bondLow: '#3B82F6',
  bondMedium: '#A855F7',
  bondHigh: '#EC4899',

  // Energy
  energyLow: '#DC2626',
  energyMedium: '#D97706',
  energyHigh: '#16A34A',

  // Emotions
  emotionJoy: '#D97706',
  emotionSad: '#3B82F6',
  emotionFear: '#7C3AED',
  emotionLove: '#EC4899',
  emotionAnger: '#DC2626',
  emotionNeutral: '#6B6B6B',
  emotionSurprise: '#C08497',

  // Personalities
  personalityWise: '#6B21A8',
  personalityFun: '#D97706',
  personalityRomantic: '#EC4899',
  personalityCoach: '#3B82F6',
  personalityCalm: '#059669',
};

// ========== نظام الخطوط (TYPOGRAPHY) ============
export const TYPOGRAPHY = {
  heading: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
  },
  subheading: {
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  button: {
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
};

// ========== نظام نصف القطر =======================
export const BORDER_RADIUS = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
};

// ========== نظام الحركة =========================
export const ANIMATION = {
  fast: 150,
  normal: 250,
  slow: 400,
};

// ========== دوال الوصول للثيم ====================
export function useTheme(): ThemeColors {
  const theme = useTwinStore((s) => s.theme);
  return theme === 'dark' ? DARK_THEME : LIGHT_THEME;
}

export function getTheme(isDark: boolean): ThemeColors {
  return isDark ? DARK_THEME : LIGHT_THEME;
}

// ========== دوال مساعدة ديناميكية ================
// لون الرابطة حسب مستواها (0-100)
export function getBondColor(bondLevel: number, theme: ThemeColors): string {
  if (bondLevel >= 70) return theme.bondHigh;
  if (bondLevel >= 40) return theme.bondMedium;
  return theme.bondLow;
}

// لون المشاعر حسب نوعها
export function getEmotionColor(emotion: string, theme: ThemeColors): string {
  const map: Record<string, string> = {
    joy: theme.emotionJoy,
    sadness: theme.emotionSad,
    fear: theme.emotionFear,
    love: theme.emotionLove,
    anger: theme.emotionAnger,
    surprise: theme.emotionSurprise,
    neutral: theme.emotionNeutral,
  };
  return map[emotion] || theme.emotionNeutral;
}

// لون الطاقة حسب قيمتها (0-100)
export function getEnergyColor(energy: number, theme: ThemeColors): string {
  if (energy >= 70) return theme.energyHigh;
  if (energy >= 30) return theme.energyMedium;
  return theme.energyLow;
}

// ========== التوافق مع الكود القديم ================
// للاستخدام في StyleSheet.create الثابتة
export const COLORS = LIGHT_THEME;
export const FONTS = {
  title: 28,
  subtitle: 18,
  body: 16,
  small: 14,
  tiny: 12,
};
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

// كائن الألوان القديم (للتوافق مع بعض الملفات)
export const colors = {
  purple: '#6B21A8',
  purpleDark: '#5B21B6',
  bgDark: '#0F0A1A',
};
