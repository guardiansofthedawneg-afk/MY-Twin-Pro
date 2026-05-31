import { View, Text, StyleSheet } from 'react-native';
import { useTwinStore } from '../store/useTwinStore';

const STAGES = [
  { label: { ar: 'غرباء', en: 'Strangers' }, min: 0 },
  { label: { ar: 'أصدقاء', en: 'Friends' }, min: 20 },
  { label: { ar: 'مقربين', en: 'Close' }, min: 40 },
  { label: { ar: 'ثقة', en: 'Trusted' }, min: 60 },
  { label: { ar: 'ارتباط', en: 'Bonded' }, min: 80 },
  { label: { ar: 'توأم روح', en: 'Soulmate' }, min: 95 },
];

export default function BondTimeline() {
  const bondLevel = useTwinStore((s) => s.bondLevel);
  const currentStage = STAGES.filter((s) => bondLevel >= s.min).pop() || STAGES[0];
  const progress = Math.min(bondLevel, 100);

  // اختر اللغة المناسبة (يمكن ربطها لاحقًا بإعدادات المستخدم)
  const lang = useTwinStore((s) => s.lang);

  return (
    <View style={styles.container}>
      <View style={styles.barBackground}>
        <View style={[styles.barFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.stageLabel}>
        {currentStage.label[lang]} • {progress.toFixed(0)}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 4 },
  barBackground: {
    height: 8,
    backgroundColor: '#F3F0FF',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#5B4AE0',
    borderRadius: 4,
  },
  stageLabel: {
    color: '#6B5B8A',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
});
