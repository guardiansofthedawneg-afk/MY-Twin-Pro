import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform,
  ScrollView, Linking
} from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../lib/supabase';
import { useTwinStore } from '../store/useTwinStore';
import { setToken } from '../lib/api';

WebBrowser.maybeCompleteAuthSession();

const SCHEME = process.env.EXPO_PUBLIC_SCHEME || 'com.mohamed101.mytwinpro';

export default function Login() {
  const { setAuth, clearHistory, setLang, lang } = useTwinStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [lastPressed, setLastPressed] = useState(0);
  const isAr = lang === 'ar';

  // ── التحقق من صحة البريد ──────────────────────
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // ── إنشاء/تأكيد ملف المستخدم في Supabase ──────
  const ensureProfile = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
      if (!profile) {
        await supabase.from('profiles').insert({
          id: userId,
          full_name: '',
          email: '',
          created_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn('Failed to ensure profile:', e);
    }
  };

  // ── تسجيل الدخول الناجح ──────────────────────
  const handleSuccess = useCallback(async (userId: string, accessToken: string) => {
    setToken(accessToken);
    await ensureProfile(userId);   // ✅ إنشاء Profile إن لم يوجد
    clearHistory();
    setAuth(userId);
    router.replace('/chat');
  }, [setToken, ensureProfile, clearHistory, setAuth]);

  // ── منع الضغط المتكرر (Debounce) ──────────────
  const canPress = (): boolean => {
    if (Date.now() - lastPressed < 2000) return false;
    setLastPressed(Date.now());
    return true;
  };

  // ── تسجيل الدخول بجوجل (مُصلح) ───────────────
  const signInWithGoogle = async () => {
    if (!canPress()) return;
    setGoogleLoading(true);
    try {
      const redirectTo = makeRedirectUri({ scheme: SCHEME });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });

      if (error) throw error;

      if (!data?.url) {
        Alert.alert(
          isAr ? 'خطأ' : 'Error',
          isAr ? 'تعذر فتح نافذة جوجل' : 'Could not open Google'
        );
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'success' && result.url) {
        // ✅ استخدام exchangeCodeForSession بدلاً من getSession()
        const { data: sessionData, error: sessionError } =
          await supabase.auth.exchangeCodeForSession(result.url);
        if (sessionError) throw sessionError;
        if (sessionData.session) {
          handleSuccess(sessionData.session.user.id, sessionData.session.access_token);
        }
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : isAr ? 'حدث خطأ' : 'An error occurred';
      Alert.alert(isAr ? 'خطأ' : 'Error', message);
    } finally {
      setGoogleLoading(false);
    }
  };

  // ── تسجيل الدخول بالبريد (مُصلح) ──────────────
  const signInWithEmail = async () => {
    if (!email || !password) {
      Alert.alert(
        isAr ? 'خطأ' : 'Error',
        isAr ? 'أدخل البريد وكلمة المرور' : 'Enter email and password'
      );
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert(
        isAr ? 'خطأ' : 'Error',
        isAr ? 'بريد إلكتروني غير صالح' : 'Invalid email'
      );
      return;
    }
    if (!canPress()) return;
    setEmailLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user && data.session) {
        handleSuccess(data.user.id, data.session.access_token);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : isAr ? 'حدث خطأ' : 'An error occurred';
      Alert.alert(isAr ? 'خطأ' : 'Error', message);
    } finally {
      setEmailLoading(false);
    }
  };

  // ── إنشاء حساب جديد (مُصلح) ──────────────────
  const signUpWithEmail = async () => {
    if (!email || !password) {
      Alert.alert(
        isAr ? 'خطأ' : 'Error',
        isAr ? 'أدخل البريد وكلمة المرور' : 'Enter email and password'
      );
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert(
        isAr ? 'خطأ' : 'Error',
        isAr ? 'بريد إلكتروني غير صالح' : 'Invalid email'
      );
      return;
    }
    if (password.length < 6) {
      Alert.alert(
        isAr ? 'خطأ' : 'Error',
        isAr ? 'كلمة المرور 6 أحرف على الأقل' : 'Min 6 characters'
      );
      return;
    }
    if (!canPress()) return;
    setEmailLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.session) {
        handleSuccess(data.user!.id, data.session.access_token);
      } else {
        Alert.alert(
          isAr ? 'تم ✅' : 'Done ✅',
          isAr ? 'تم إرسال رابط التأكيد لبريدك' : 'Confirmation link sent'
        );
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : isAr ? 'حدث خطأ' : 'An error occurred';
      Alert.alert(isAr ? 'خطأ' : 'Error', message);
    } finally {
      setEmailLoading(false);
    }
  };

  // ── نسيت كلمة المرور ─────────────────────────
  const handleForgotPassword = async () => {
    if (!email || !isValidEmail(email)) {
      Alert.alert(
        isAr ? 'خطأ' : 'Error',
        isAr ? 'أدخل بريدك الإلكتروني أولاً' : 'Enter your email first'
      );
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      Alert.alert(
        isAr ? 'تم ✅' : 'Done ✅',
        isAr ? 'تم إرسال رابط إعادة التعيين لبريدك' : 'Reset link sent to your email'
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : isAr ? 'حدث خطأ' : 'An error occurred';
      Alert.alert(isAr ? 'خطأ' : 'Error', message);
    }
  };

  const isLoading = googleLoading || emailLoading;

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.container}
        >
          {/* زر تغيير اللغة */}
          <TouchableOpacity
            style={s.langBtn}
            onPress={() => setLang(isAr ? 'en' : 'ar')}
            accessibilityLabel={isAr ? 'تغيير اللغة للإنجليزية' : 'Switch to Arabic'}
            accessibilityRole="button"
          >
            <Text style={s.langText}>{isAr ? '🌐 English' : '🌐 العربية'}</Text>
          </TouchableOpacity>

          {/* العنوان */}
          <Text style={s.heading}>MyTwin 💜</Text>
          <Text style={s.sub}>
            {isAr ? 'سجّل دخولك وابدأ رحلتك' : 'Sign in and start your journey'}
          </Text>

          {/* زر جوجل */}
          <TouchableOpacity
            style={s.googleBtn}
            onPress={signInWithGoogle}
            disabled={isLoading}
            accessibilityLabel={isAr ? 'تسجيل الدخول بجوجل' : 'Sign in with Google'}
            accessibilityRole="button"
          >
            {googleLoading ? (
              <ActivityIndicator color="#4285F4" />
            ) : (
              <>
                <Text style={s.googleIcon}>G</Text>
                <Text style={s.googleText}>
                  {isAr ? 'تسجيل الدخول عن طريق جوجل' : 'Sign in with Google'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* فاصل */}
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>{isAr ? 'أو' : 'or'}</Text>
            <View style={s.dividerLine} />
          </View>

          {/* حقل البريد */}
          <TextInput
            style={s.input}
            placeholder={isAr ? 'البريد الإلكتروني' : 'Email'}
            placeholderTextColor="#A09BB5"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            textAlign={isAr ? 'right' : 'left'}
          />

          {/* حقل كلمة المرور */}
          <View style={s.passwordRow}>
            <TextInput
              style={s.passwordInput}
              placeholder={isAr ? 'كلمة المرور' : 'Password'}
              placeholderTextColor="#A09BB5"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              textAlign={isAr ? 'right' : 'left'}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={s.eyeBtn}
            >
              <Text style={s.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          {/* نسيت كلمة المرور */}
          <TouchableOpacity style={s.forgotBtn} onPress={handleForgotPassword}>
            <Text style={s.forgotText}>
              {isAr ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
            </Text>
          </TouchableOpacity>

          {/* زر تسجيل الدخول */}
          <TouchableOpacity
            style={s.button}
            onPress={signInWithEmail}
            disabled={isLoading}
            accessibilityLabel={isAr ? 'تسجيل الدخول' : 'Sign In'}
            accessibilityRole="button"
          >
            {emailLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={s.buttonText}>
                {isAr ? 'تسجيل الدخول' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          {/* زر إنشاء حساب */}
          <TouchableOpacity
            style={[s.button, s.outline]}
            onPress={signUpWithEmail}
            disabled={isLoading}
            accessibilityLabel={isAr ? 'إنشاء حساب جديد' : 'Create Account'}
            accessibilityRole="button"
          >
            <Text style={[s.buttonText, s.outlineText]}>
              {isAr ? 'إنشاء حساب جديد' : 'Create Account'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  container: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    padding: 24,
    justifyContent: 'center',
  },
  langBtn: {
    position: 'absolute',
    top: 50,
    right: 24,
    backgroundColor: '#F3F0FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0D9F5',
  },
  langText: { color: '#6B21A8', fontSize: 14, fontWeight: '600' },
  heading: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1226',
    textAlign: 'center',
    marginBottom: 8,
  },
  sub: {
    fontSize: 16,
    color: '#6B5B8A',
    textAlign: 'center',
    marginBottom: 32,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D0D5DD',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    columnGap: 10,
  },
  googleIcon: { fontSize: 18, fontWeight: '800', color: '#4285F4' },
  googleText: { fontSize: 16, fontWeight: '600', color: '#1A1226' },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    columnGap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E0D9F5' },
  dividerText: { color: '#A09BB5', fontSize: 14 },
  input: {
    backgroundColor: '#F8F6F2',
    color: '#1A1226',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0D9F5',
    fontSize: 15,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F6F2',
    borderRadius: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E0D9F5',
  },
  passwordInput: {
    flex: 1,
    color: '#1A1226',
    padding: 14,
    fontSize: 15,
  },
  eyeBtn: { padding: 12 },
  eyeIcon: { fontSize: 18 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 16, marginTop: 8 },
  forgotText: { color: '#6B21A8', fontSize: 13, fontWeight: '600' },
  button: {
    backgroundColor: '#6B21A8',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#6B21A8',
  },
  outlineText: { color: '#6B21A8' },
});
