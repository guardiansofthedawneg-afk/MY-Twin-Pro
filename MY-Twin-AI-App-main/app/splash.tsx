import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTwinStore } from '../store/useTwinStore';
import { setToken } from '../lib/api';

export default function SplashScreen() {
  const { setAuth } = useTwinStore();
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const subTextOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. شغّل الأنيميشن
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 10,
          friction: 2,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(subTextOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. بعد انتهاء الأنيميشن (2.5 ثانية) تحقق من الـ session
    const timer = setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          // المستخدم مسجل دخول
          setAuth(session.user.id);
          setToken(session.access_token);

          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarded')
            .eq('user_id', session.user.id)
            .single();

          if (profile?.onboarded) {
            router.replace('/chat');
          } else {
            router.replace('/onboarding');
          }
        } else {
          // مفيش session → login
          router.replace('/login');
        }
      } catch (e) {
        // في حالة أي خطأ → login
        router.replace('/login');
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.group}>
        <Animated.Image
          source={require('../assets/logo.png')}
          style={[
            styles.logo,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
          resizeMode="contain"
        />
        <Animated.Text style={[styles.company, { opacity: textOpacity }]}>
          by Soul Sync
        </Animated.Text>
        <Animated.Text style={[styles.copyright, { opacity: subTextOpacity }]}>
          ©️ 2026
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  group: {
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 16,
  },
  company: {
    fontSize: 18,
    fontWeight: '600',
    color: '#B8860B',
    letterSpacing: 1,
    marginBottom: 6,
  },
  copyright: {
    fontSize: 14,
    color: '#6B6B6B',
  },
});
