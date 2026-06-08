import * as Speech from "expo-speech";

export async function speakResponse(
  text: string,
  options?: {
    language?: string;
    pitch?: number;
    rate?: number;
    onDone?: () => void;
  }
): Promise<void> {
  try {
    const clean = text.replace(/[\u{1F600}-\u{1F64F}]/gu, "").trim();
    if (!clean) return;

    Speech.speak(clean, {
      language: options?.language || "ar-SA",
      pitch:    options?.pitch   || 1.0,
      rate:     options?.rate    || 0.9,
      onDone:   options?.onDone,
      onError:  (e) => console.warn("TTS error:", e),
    });
  } catch (e) {
    console.warn("speakResponse error:", e);
  }
}

export function stopSpeaking(): void {
  Speech.stop();
}

export function isSpeaking(): Promise<boolean> {
  return Speech.isSpeakingAsync();
}
