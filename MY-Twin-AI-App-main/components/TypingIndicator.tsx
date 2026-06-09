import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Text } from 'react-native';
import { COLORS, FONTS } from '../utils/theme';

interface TypingIndicatorProps {
  lang?: 'ar' | 'en';
  assistantName?: string;
}

export default function TypingIndicator({ lang = 'ar', assistantName }: TypingIndicatorProps) {
  const displayName = assistantName || (lang === 'ar' ? 'التوأم' : 'Twin');

  // 1️⃣ إنشاء مصفوفة dots مرة واحدة فقط
  const dots = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  // 2️⃣ إضافة dots كتبعية
  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [dots]);

  // 3️⃣ دعم RTL: في العربية نعكس الصف
  const isRTL = lang === 'ar';

  return (
    <View style={styles.container}>
      <View style={[styles.bubble, isRTL && styles.bubbleRTL]}>
        <View style={[styles.dotsRow, isRTL && styles.dotsRowRTL]}>
          {dots.map((dot, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  opacity: dot.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                  transform: [
                    {
                      translateY: dot.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -6],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>
        <Text style={styles.text}>
          {lang === 'ar'
            ? `${displayName} يكتب...`
            : `${displayName} is typing...`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 18,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bubbleRTL: {
    flexDirection: 'row-reverse',
  },
  dotsRow: {
    flexDirection: 'row',
    marginRight: 8,
  },
  dotsRowRTL: {
    marginRight: 0,
    marginLeft: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.textSecondary,
    marginHorizontal: 2,
  },
  text: {
    color: COLORS.textSecondary,
    fontSize: FONTS.small,
  },
});
