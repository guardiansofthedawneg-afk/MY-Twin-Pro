import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Animated, Modal, useWindowDimensions } from "react-native";
import { useTwinStore } from "../store/useTwinStore";
import { initAnalytics } from "../lib/analytics";
import SideMenu from "../components/SideMenu";
import { ToastProvider } from "../components/Toast";
import { ErrorBoundary } from "../components/ErrorBoundary";

export default function Layout() {
  const { theme, menuVisible, closeMenu } = useTwinStore((s) => ({
    theme: s.theme,
    menuVisible: s.menuVisible,
    closeMenu: s.closeMenu,
  }));
  const isDark = theme === 'dark';
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const { width } = useWindowDimensions();
  const drawerWidth = width * 0.8;

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: menuVisible ? 0 : -drawerWidth,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [menuVisible, drawerWidth]);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <StatusBar style={isDark ? "light" : "dark"} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: isDark ? '#1A1A1A' : '#F8F6F2' },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="splash" />
          <Stack.Screen name="login" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="terms" />
          <Stack.Screen name="chat" options={{ headerShown: false }} />
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
        {menuVisible && (
          <Modal visible transparent animationType="none" onRequestClose={closeMenu}>
            <Pressable style={styles.overlay} onPress={closeMenu}>
              <Animated.View style={[styles.sidebar, { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', width: drawerWidth, transform: [{ translateX: slideAnim }] }]}>
                <SideMenu onClose={closeMenu} />
              </Animated.View>
            </Pressable>
          </Modal>
        )}
      </ToastProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 15,
  },
});
