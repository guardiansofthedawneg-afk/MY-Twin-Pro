import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function Index() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // تحقق مما إذا كان قد أكمل onboarding
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarded')
          .eq('id', session.user.id)
          .single();
        
        if (profile?.onboarded) {
          router.replace('/chat');
        } else {
          router.replace('/onboarding');
        }
      } else {
        router.replace('/login');
      }
    } catch (error) {
      // في حالة الخطأ، اذهب إلى تسجيل الدخول
      router.replace('/login');
    } finally {
      setReady(true);
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6B21A8" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
});
