// ── أنماط الشخصية الصوتية ──────────────────────
export interface VoiceProfile {
  id: string;
  name_ar: string;
  name_en: string;
  pitch: number;
  rate: number;
  language: string;
  emotion_modifier: Record<string, { pitch: number; rate: number }>;
}

export const VOICE_PROFILES: Record<string, VoiceProfile> = {
  wise: {
    id: "wise",
    name_ar: "حكيم",
    name_en: "Wise",
    pitch: 0.9,
    rate: 0.8,
    language: "ar-SA",
    emotion_modifier: {
      joy:     { pitch: 1.0, rate: 0.85 },
      sadness: { pitch: 0.8, rate: 0.7  },
      neutral: { pitch: 0.9, rate: 0.8  },
    },
  },
  fun: {
    id: "fun",
    name_ar: "مرح",
    name_en: "Fun",
    pitch: 1.15,
    rate: 1.0,
    language: "ar-SA",
    emotion_modifier: {
      joy:     { pitch: 1.25, rate: 1.05 },
      sadness: { pitch: 1.0,  rate: 0.9  },
      neutral: { pitch: 1.15, rate: 1.0  },
    },
  },
  romantic: {
    id: "romantic",
    name_ar: "رومانسي",
    name_en: "Romantic",
    pitch: 1.05,
    rate: 0.8,
    language: "ar-SA",
    emotion_modifier: {
      joy:     { pitch: 1.15, rate: 0.85 },
      sadness: { pitch: 0.9,  rate: 0.7  },
      neutral: { pitch: 1.05, rate: 0.8  },
    },
  },
  coach: {
    id: "coach",
    name_ar: "مدرب",
    name_en: "Coach",
    pitch: 1.0,
    rate: 0.9,
    language: "ar-SA",
    emotion_modifier: {
      joy:     { pitch: 1.1, rate: 0.95 },
      sadness: { pitch: 0.9, rate: 0.8  },
      neutral: { pitch: 1.0, rate: 0.9  },
    },
  },
  calm: {
    id: "calm",
    name_ar: "هادئ",
    name_en: "Calm",
    pitch: 0.85,
    rate: 0.75,
    language: "ar-SA",
    emotion_modifier: {
      joy:     { pitch: 0.95, rate: 0.8  },
      sadness: { pitch: 0.8,  rate: 0.7  },
      neutral: { pitch: 0.85, rate: 0.75 },
    },
  },
};

// ── الحصول على إعدادات شخصية صوتية ──────────────
export function getVoiceProfile(
  personality: string,
  emotion?: string
): { pitch: number; rate: number; language: string } {
  const profile = VOICE_PROFILES[personality] || VOICE_PROFILES.calm;
  let pitch = profile.pitch;
  let rate = profile.rate;

  if (emotion && profile.emotion_modifier[emotion]) {
    const mod = profile.emotion_modifier[emotion];
    pitch = mod.pitch;
    rate = mod.rate;
  }

  return { pitch, rate, language: profile.language };
}
