import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../lib/supabase';
import { useTwinStore } from '../store/useTwinStore';

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const { setAuth } = useTwinStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const redirectTo = makeRedirectUri({ scheme: 'com.mohamed101.mytwinpro' });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === 'success') {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setAuth(session.user.id);
            router.replace('/chat');
          }
        }
      }
    } catch (e: any) {
      Alert.alert('خطأ', e.message || 'تعذر تسجيل الدخول بجوجل');
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async () => {
    if (!email || !password) { Alert.alert('خطأ', 'أدخل البريد وكلمة المرور'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) Alert.alert('خطأ', error.message);
      else if (data.user) { setAuth(data.user.id); router.replace('/chat'); }
    } catch (e) {
      Alert.alert('خطأ', 'تعذر الاتصال، تحقق من الإنترنت');
    } finally { setLoading(false); }
  };

  const signUpWithEmail = async () => {
    if (!email || !password) { Alert.alert('خطأ', 'أدخل البريد وكلمة المرور'); return; }
    if (password.length < 6) { Alert.alert('خطأ', 'كلمة المرور 6 أحرف على الأقل'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) Alert.alert('خطأ', error.message);
      else Alert.alert('تم ✅', 'تم إرسال رابط تأكيد إلى بريدك الإلكتروني');
    } catch (e) {
      Alert.alert('خطأ', 'تعذر الاتصال، تحقق من الإنترنت');
    } finally { setLoading(false); }
  };

  return (
    <View style={s.container}>
      <Text style={s.heading}>MyTwin 💜</Text>
      <Text style={s.sub}>سجّل دخولك وابدأ رحلتك</Text>

      {/* Google */}
      <TouchableOpacity style={s.googleBtn} onPress={signInWithGoogle} disabled={loading}>
        <Text style={s.googleIcon}>G</Text>
        <Text style={s.googleText}>تسجيل الدخول عن طريق جوجل</Text>
      </TouchableOpacity>

      <View style={s.divider}>
        <View style={s.dividerLine} />
        <Text style={s.dividerText}>أو</Text>
        <View style={s.dividerLine} />
      </View>

      {/* Email */}
      <TextInput
        style={s.input}
        placeholder="البريد الإلكتروني"
        placeholderTextColor="#A09BB5"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {/* Password */}
      <View style={s.passwordContainer}>
        <TextInput
          style={s.passwordInput}
          placeholder="كلمة المرور"
          placeholderTextColor="#A09BB5"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn}>
          <Text style={s.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={s.button} onPress={signInWithEmail} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.buttonText}>تسجيل الدخول</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={[s.button, s.outline]} onPress={signUpWithEmail} disabled={loading}>
        <Text style={[s.buttonText, s.outlineText]}>إنشاء حساب جديد</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', padding: 24, justifyContent: 'center' },
  heading: { fontSize: 32, fontWeight: '800', color: '#1A1226', textAlign: 'center', marginBottom: 8 },
  sub: { fontSize: 16, color: '#6B5B8A', textAlign: 'center', marginBottom: 32 },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#D0D5DD', padding: 14, borderRadius: 10, marginBottom: 8, gap: 10 },
  googleIcon: { fontSize: 18, fontWeight: '800', color: '#4285F4' },
  googleText: { fontSize: 16, fontWeight: '600', color: '#1A1226' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E0D9F5' },
  dividerText: { color: '#A09BB5', fontSize: 14 },
  input: { backgroundColor: '#F8F6F2', color: '#1A1226', padding: 14, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#E0D9F5', fontSize: 15 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F6F2', borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#E0D9F5' },
  passwordInput: { flex: 1, color: '#1A1226', padding: 14, fontSize: 15 },
  eyeBtn: { padding: 12 },
  eyeIcon: { fontSize: 18 },
  button: { backgroundColor: '#5B4AE0', padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#5B4AE0' },
  outlineText: { color: '#5B4AE0' },
});
