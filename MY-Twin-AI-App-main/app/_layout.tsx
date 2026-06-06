import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useRef, useState, useEffect } from "react";
import { TouchableOpacity, StyleSheet, Animated, Modal, View } from "react-native";
import { router } from "expo-router";
import { useTwinStore } from "../store/useTwinStore";
import { supabase } from "../lib/supabase";
import { setToken } from "../lib/api";
import { initAnalytics } from "../lib/analytics";
import CustomDrawerContent from "../components/CustomDrawerContent";
import { ToastProvider } from "../components/Toast";
import { ErrorBoundary } from "../components/ErrorBoundary";

const SideMenu = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const slideAnim = useRef(new Animated.Value(-300)).current;
  useEffect(() => {
    Animated.timing(slideAnim, { toValue: visible ? 0 : -300, duration: 250, useNativeDriver: true }).start();
  }, [visible]);
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
          <CustomDrawerContent onClose={onClose} />
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

export default function Layout() {
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' }, animation: "fade" }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="splash" />
          <Stack.Screen name="login" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="terms" />
          <Stack.Screen name="chat" options={{ headerShown: false }} initialParams={{ onOpenMenu: () => setMenuVisible(true) }} />
          <Stack.Screen name="history" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="memories" />
          <Stack.Screen name="customize" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="subscription" />
          <Stack.Screen name="goals" />
          <Stack.Screen name="mood" />
          <Stack.Screen name="timeline" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="help" />
          <Stack.Screen name="about" />
          <Stack.Screen name="referral" />
        </Stack>
        <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
      </ToastProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sidebar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 300, backgroundColor: '#FFFFFF' },
});
