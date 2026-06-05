import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTwinStore } from '../store/useTwinStore';

interface EmojiProps {
  emoji: string;      // مثل '😊' أو '🌸'
  size?: number;      // حجم الخط الافتراضي 24
}

export default function Emoji({ emoji, size = 24 }: EmojiProps) {
  const { theme } = useTwinStore();
  const isDark = theme === 'dark';

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <Text style={[styles.text, { fontSize: size }, isDark && styles.textDark]}>
        {emoji}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2, // هامش صغير لضمان عدم قطع الحواف
  },
  containerDark: {
    // يمكن إضافة خلفية شفافة أو تأثير خفيف
  },
  text: {
    // اللون يتغير تلقائياً حسب نظام التشغيل
  },
  textDark: {
    // إضافة مرشح سطوع خفيف لتنعيم الإيموجي في الوضع الداكن (اختياري)
    opacity: 0.9,
  },
});
