import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
import { Text, TouchableOpacity, StyleSheet, Animated, Modal } from "react-native";
import { router } from "expo-router";
import { useTwinStore } from "../store/useTwinStore";
import { COLORS } from "../utils/theme";
import CustomDrawerContent from "../components/CustomDrawerContent";
import { ToastProvider } from "../components/Toast";
import { ErrorBoundary } from "../components/ErrorBoundary";

const SideMenu = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const slideAnim = useRef(new Animated.Value(-280)).current;

  useRef(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -280,
      duration: 250,
      useNativeDriver: true,
    }).start();
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
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

  return (
    <ErrorBoundary>
      <ToastProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#FFFFFF' },
            animation: "fade",
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="splash" />
          <Stack.Screen name="login" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="terms" />
          <Stack.Screen name="chat" options={{
            headerShown: true,
            headerTitle: "",
            headerStyle: { backgroundColor: COLORS.header },
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => setMenuVisible(true)}
                style={{ marginLeft: 16 }}
              >
                <Text style={{ fontSize: 24 }}>☰</Text>
              </TouchableOpacity>
            ),
          }} />
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
  sidebar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 280, backgroundColor: COLORS.bg, paddingTop: 60, paddingHorizontal: 20 },
});
