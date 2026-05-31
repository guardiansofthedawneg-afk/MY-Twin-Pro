import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { Animated } from 'react-native';
import { API } from '../lib/api';
import { useTwinStore } from '../store/useTwinStore';

let recording: Audio.Recording | null = null;
export const waveAnim = new Animated.Value(0);

const playBreath = async () => {
  try {
    const breath = require('../assets/breath.mp3');
    const { sound } = await Audio.Sound.createAsync(breath, { volume: 0.3 });
    await sound.playAsync();
    sound.unloadAsync();
  } catch {
    // الملف غير موجود – تجاهل
  }
};

export const startRecordingVoice = async (): Promise<boolean> => {
  try {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) throw new Error('Permission denied');

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording: rec } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recording = rec;

    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(waveAnim, { toValue: 0.3, duration: 300, useNativeDriver: true }),
      ])
    ).start();

    return true;
  } catch (err) {
    console.error('فشل بدء التسجيل:', err);
    return false;
  }
};

export const stopRecordingVoice = async (): Promise<string | null> => {
  if (!recording) return null;

  try {
    await recording.stopAndUnloadAsync();
    waveAnim.stopAnimation();
    waveAnim.setValue(0);

    const uri = recording.getURI();
    recording = null;
    if (!uri) return null;

    const formData = new FormData();
    const audioFile: { uri: string; type: string; name: string } = {
      uri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    };
    formData.append('file', audioFile as unknown as Blob);

    const { data } = await API.post('/api/voice/transcribe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return data.text;
  } catch (err) {
    console.error('فشل إيقاف التسجيل:', err);
    return null;
  }
};

export const speakResponse = (
  text: string,
  tts: { pitch: number; rate: number }
) => {
  // جلب اللغة من الـ store مباشرة
  const lang = useTwinStore.getState().lang;

  Speech.stop();

  setTimeout(async () => {
    await playBreath();
    setTimeout(() => {
      Speech.speak(text, {
        language: lang === 'ar' ? 'ar-SA' : 'en-US',
        pitch: tts.pitch,
        rate: tts.rate,
      });
    }, 200);
  }, 400);
};

export const stopSpeaking = () => {
  Speech.stop();
};
