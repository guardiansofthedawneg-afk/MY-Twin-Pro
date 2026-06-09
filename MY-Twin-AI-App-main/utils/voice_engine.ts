import * as Speech from "expo-speech";

// ── أنواع إعدادات الصوت ────────────────────────
export interface VoiceOptions {
  pitch?: number;
  rate?: number;
  language?: string;
  voiceId?: string;
  onDone?: () => void;
  emotion?: string;
  intensity?: number;
  personality?: string;
}

// ── طابور التشغيل ──────────────────────────────
let speakQueue: Array<{ text: string; options: VoiceOptions }> = [];
let isSpeakingNow = false;
let currentInterrupt: (() => void) | null = null;

// ── إعدادات الصوت حسب الشخصية والعاطفة ─────────
const EMOTION_PRESETS: Record<string, { pitch: number; rate: number }> = {
  joy:       { pitch: 1.15, rate: 0.95 },
  sadness:   { pitch: 0.85, rate: 0.75 },
  anger:     { pitch: 1.0,  rate: 1.0  },
  fear:      { pitch: 0.9,  rate: 0.85 },
  love:      { pitch: 1.05, rate: 0.85 },
  surprise:  { pitch: 1.2,  rate: 1.0  },
  neutral:   { pitch: 1.0,  rate: 0.9  },
  support:   { pitch: 0.95, rate: 0.8  },
};

const PERSONALITY_PRESETS: Record<string, { pitch: number; rate: number }> = {
  supportive: { pitch: 0.95, rate: 0.85 },
  coach:      { pitch: 1.0,  rate: 0.9  },
  wise:       { pitch: 0.9,  rate: 0.8  },
  fun:        { pitch: 1.15, rate: 1.0  },
  calm:       { pitch: 0.85, rate: 0.75 },
  romantic:   { pitch: 1.05, rate: 0.8  },
};

// ── تنظيف النص من الإيموجي والرموز ─────────────
function cleanTextForSpeech(text: string): string {
  if (!text) return "";
  return text
    .replace(/\p{Extended_Pictographic}/gu, "") // كل الإيموجي
    .replace(/[\u2600-\u27BF]/gu, "")          // رموز متنوعة
    .replace(/[❤️‍🔥✨🌟💜🫂🤗🫶💕💖💪🤝]/gu, "") // رموز قلب وغيرها
    .replace(/\*\*/g, "")                       // Markdown bold
    .replace(/\*/g, "")                         // Markdown italic
    .replace(/__/g, "")                         // Markdown underline
    .replace(/~~/g, "")                         // Markdown strikethrough
    .replace(/`/g, "")                          // Markdown code
    .replace(/#{1,6}\s/g, "")                   // Markdown headers
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")         // Markdown links
    .replace(/\n{2,}/g, "، ")                   // أسطر متعددة
    .replace(/\n/g, " ")                        // أسطر مفردة
    .replace(/\s{2,}/g, " ")                    // مسافات متعددة
    .trim();
}

// ── دالة التحدث الرئيسية ───────────────────────
export async function speakResponse(
  text: string,
  options?: VoiceOptions
): Promise<void> {
  try {
    const clean = cleanTextForSpeech(text);
    if (!clean) return;

    // احسب pitch و rate النهائيين
    let pitch = options?.pitch ?? 1.0;
    let rate = options?.rate ?? 0.9;

    // تعديل حسب العاطفة
    if (options?.emotion && EMOTION_PRESETS[options.emotion]) {
      const preset = EMOTION_PRESETS[options.emotion];
      pitch = preset.pitch;
      rate = preset.rate;
    }

    // تعديل حسب الشخصية
    if (options?.personality && PERSONALITY_PRESETS[options.personality]) {
      const preset = PERSONALITY_PRESETS[options.personality];
      pitch = (pitch + preset.pitch) / 2; // متوسط بين العاطفة والشخصية
      rate = (rate + preset.rate) / 2;
    }

    // تعديل الشدة
    if (options?.intensity && options.intensity > 0.7) {
      pitch += 0.05;
      rate += 0.05;
    }

    // أضف للطابور
    speakQueue.push({
      text: clean,
      options: { ...options, pitch, rate },
    });

    // ابدأ المعالجة إذا لم تكن قيد التشغيل
    if (!isSpeakingNow) {
      processQueue();
    }
  } catch (e) {
    console.warn("speakResponse error:", e);
  }
}

// ── معالجة الطابور ─────────────────────────────
async function processQueue(): Promise<void> {
  if (speakQueue.length === 0) {
    isSpeakingNow = false;
    return;
  }

  isSpeakingNow = true;
  const item = speakQueue.shift()!;

  try {
    await new Promise<void>((resolve) => {
      currentInterrupt = () => {
        Speech.stop();
        resolve();
      };

      Speech.speak(item.text, {
        language: item.options.language || "ar-SA",
        pitch: item.options.pitch ?? 1.0,
        rate: item.options.rate ?? 0.9,
        voice: item.options.voiceId || undefined,
        onDone: () => {
          currentInterrupt = null;
          resolve();
        },
        onError: (e) => {
          console.warn("TTS error:", e);
          currentInterrupt = null;
          resolve();
        },
        onStopped: () => {
          currentInterrupt = null;
          resolve();
        },
      });
    });
  } catch (e) {
    console.warn("TTS playback error:", e);
  }

  // معالجة التالي في الطابور
  processQueue();
}

// ── إيقاف الكلام فوراً ─────────────────────────
export function stopSpeaking(): void {
  if (currentInterrupt) {
    currentInterrupt();
    currentInterrupt = null;
  }
  speakQueue = [];
  Speech.stop();
}

// ── هل يتحدث حالياً؟ ───────────────────────────
export function isSpeaking(): Promise<boolean> {
  return Speech.isSpeakingAsync();
}

// ── الحصول على الأصوات المتاحة ────────────────
export async function getAvailableVoices(): Promise<Speech.Voice[]> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    return voices;
  } catch (e) {
    console.warn("getAvailableVoices error:", e);
    return [];
  }
}

// ── إيقاف تلقائي عند التسجيل ──────────────────
export function autoInterrupt(): void {
  stopSpeaking();
}

// ── إعدادات افتراضية للباقات (مُرسلة من الـ Backend) ──
export function getVoicePresetFromTier(tier: string): Partial<VoiceOptions> {
  const presets: Record<string, Partial<VoiceOptions>> = {
    free:   { pitch: 1.0, rate: 0.9 },
    plus:   { pitch: 1.0, rate: 0.9 },
    premium:{ pitch: 1.05, rate: 0.85 },
    pro:    { pitch: 1.1, rate: 0.85 },
    yearly: { pitch: 1.1, rate: 0.85 },
  };
  return presets[tier] || presets.free;
}
