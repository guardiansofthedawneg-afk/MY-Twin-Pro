import { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, Animated, ActivityIndicator,
  Dimensions, SafeAreaView
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTwinStore } from '../store/useTwinStore';
import { setToken } from '../lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SplashScreen() {
  const { setAuth, theme } = useTwinStore();
  const isDark = theme === 'dark';

  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const subTextOpacity = useRef(new Animated.Value(0)).current;
  const [authReady, setAuthReady] = useState(false);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    // بدء الأنيميشن وتخزين المرجع لإيقافه لاحقاً
    animationRef.current = Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 8,
          friction: 3,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(subTextOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]);
    animationRef.current.start();

    // بدء التحقق من الجلسة فوراً دون انتظار الأنيميشن
    const authPromise = (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          return { route: '/login' as const };
        }

        setAuth(session.user.id);
        setToken(session.access_token);

        // استخدام maybeSingle لتجنب الخطأ عند عدم وجود صف
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarded')
          .eq('id', session.user.id)
          .maybeSingle();

        // إذا لم يكن هناك profile أو لم يكمل الـ onboarding
        if (!profile || !profile.onboarded) {
          return { route: '/onboarding' as const };
        }

        return { route: '/chat' as const };
      } catch (e) {
        console.error('Splash auth error:', e);
        return { route: '/login' as const };
      }
    })();

    // انتظر انتهاء الأنيميشن والتحقق معاً
    Promise.all([
      authPromise,
      new Promise(resolve => setTimeout(resolve, 2800)), // الحد الأدنى للـ splash
    ]).then(([authResult]) => {
      setAuthReady(true);
      router.replace(authResult.route);
    });

    return () => {
      // إيقاف الأنيميشن عند مغادرة الشاشة
      animationRef.current?.stop();
    };
  }, [setAuth]);

  return (
    <SafeAreaView style={[styles.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
      <View style={[styles.container, isDark && { backgroundColor: '#1A1A1A' }]}>
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
          <Animated.Text
            style={[
              styles.company,
              { opacity: textOpacity },
              isDark && { color: '#D8B4FE' },
            ]}
          >
            BY SOULSYNC
          </Animated.Text>
          <Animated.Text
            style={[
              styles.copyright,
              { opacity: subTextOpacity },
              isDark && { color: '#A78BFA' },
            ]}
          >
            2026©
          </Animated.Text>
          {!authReady && (
            <ActivityIndicator
              size="small"
              color={isDark ? '#D8B4FE' : '#6B21A8'}
              style={{ marginTop: 20 }}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  group: { alignItems: 'center' },
  logo: {
    width: Math.min(SCREEN_WIDTH * 0.5, 240),
    height: Math.min(SCREEN_WIDTH * 0.5, 240),
    marginBottom: 20,
  },
  company: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6B21A8',
    letterSpacing: 2,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  copyright: { fontSize: 13, color: '#9B7FC7', letterSpacing: 1 },
});
