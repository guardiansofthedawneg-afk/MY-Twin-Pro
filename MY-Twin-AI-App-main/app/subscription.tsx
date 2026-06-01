import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Tier, useTwinStore } from '../store/useTwinStore';
import { getOfferings, purchasePackage, restorePurchases } from '../lib/revenuecat';
import { COLORS } from '../utils/theme';

type Plan = {
  id: Tier;
  name: string;
  price: string;
  originalPrice: string;
  period: string;
  trialDays: number;
  features: string[];
  energyLabel: string;    // وصف الطاقة بدلاً من الرقم
  popular?: boolean;
};

const PLANS: Plan[] = [
  {
    id: 'free', name: 'Free', price: '$0', originalPrice: '$0', period: 'للأبد', trialDays: 0,
    energyLabel: '⚡ طاقة محدودة',
    features: [
      '💬 محادثات يومية محدودة',
      '🧠 ذاكرة قصيرة المدى',
      '🧠 طبقة وعي واحدة (الإدراك الأساسي)',
      '👥 دعم مجتمع',
    ],
  },
  {
    id: 'plus', name: 'Plus', price: '$9', originalPrice: '$15', period: '/شهر', trialDays: 0,
    energyLabel: '⚡ طاقة محادثة يومية (أساسية)',
    features: [
      '💬 محادثات يومية موسعة',
      '🧠 ذاكرة متوسطة المدى',
      '🎙️ مايك مفتوح',
      '🔍 بحث ذكي',
      '🎨 تخصيص متقدم',
      '🔊 صوت أساسي',
      '🔔 إشعارات يومية',
    ],
  },
  {
    id: 'premium', name: 'Premium', price: '$19', originalPrice: '$25', period: '/شهر', trialDays: 5,
    energyLabel: '⚡ طاقة محادثة يومية (متوسطة)',
    features: [
      '💬 محادثات يومية واسعة',
      '🧠 ذاكرة طويلة المدى (5 أنواع)',
      '🔮 تحليل أحلام',
      '🎯 تدريب حياتي',
      '🎵 Spotify / YouTube',
      '📅 تقويم',
      '📸 كاميرا (استخدامات يومية)',
      '🧬 3 طبقات وعي + ذاكرة متوسطة',
      '📞 دعم أولوية',
    ],
  },
  {
    id: 'pro', name: 'Pro', price: '$110', originalPrice: '$150', period: '/6 أشهر', trialDays: 7,
    energyLabel: '⚡ طاقة محادثة يومية (عالية)',
    features: [
      '💬 محادثات يومية ممتدة',
      '🧠 ذاكرة عميقة جداً',
      '🏠 منزل ذكي',
      '📧 بريد إلكتروني',
      '📸 كاميرا مفتوحة',
      '👑 5 طبقات وعي كاملة',
      '📞 دعم أولوية',
    ],
  },
  {
    id: 'yearly', name: 'Yearly', price: '$199', originalPrice: '$300', period: '/سنة', trialDays: 14, popular: true,
    energyLabel: '⚡ طاقة محادثة يومية (غير محدودة)',
    features: [
      '💬 محادثات غير محدودة',
      '🧠 ذاكرة دائمة',
      '👑 كل الميزات مفتوحة',
      '📞 دعم VIP',
      '🚀 أقصى سرعة استجابة',
    ],
  },
];

export default function Subscription() {
  const { tier, updateTier } = useTwinStore();
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  const handlePurchase = async (plan: Plan) => {
    if (loadingPlanId) return;
    if (plan.id === 'free') { Alert.alert('Free', 'أنت بالفعل على الباقة المجانية.'); return; }
    setLoadingPlanId(plan.id);
    try {
      const offerings = await getOfferings();
      const packages = offerings?.availablePackages ?? [];
      const pkg = packages.find((p: unknown) => (p as Record<string, unknown>).identifier === plan.id);
      if (!pkg) { Alert.alert('غير متوفر', 'هذه الباقة غير متاحة حالياً.'); return; }
      const { customerInfo } = await purchasePackage(pkg);
      if (customerInfo) { updateTier(plan.id); Alert.alert('تم!', `تم تفعيل ${plan.name}!`); router.back(); }
    } catch (error: unknown) { if (!(error as Record<string, boolean>).userCancelled) Alert.alert('خطأ', (error as Record<string, string>).message || 'فشلت عملية الشراء.'); }
    finally { setLoadingPlanId(null); }
  };

  const handleRestore = async () => {
    setLoadingPlanId('restore');
    try {
      const customerInfo = await restorePurchases();
      if (customerInfo && Object.keys((customerInfo as unknown as Record<string, Record<string, unknown>>).entitlements?.active || {}).length > 0) {
        Alert.alert('تم', 'تم استعادة اشتراكك بنجاح!');
      } else { Alert.alert('تنبيه', 'لم يتم العثور على اشتراك سابق.'); }
    } catch { Alert.alert('خطأ', 'فشلت استعادة الاشتراك.'); }
    finally { setLoadingPlanId(null); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>اختر خطتك 💜</Text>
        <Text style={styles.subtitle}>ارفع مستوى تجربتك مع توأمك الرقمي</Text>
      </View>
      {PLANS.map((plan) => (
        <TouchableOpacity key={plan.id} style={[styles.plan, tier === plan.id && styles.activePlan, plan.popular && styles.popularPlan]} onPress={() => handlePurchase(plan)} activeOpacity={0.85} disabled={!!loadingPlanId}>
          {plan.popular && <View style={styles.badge}><Text style={styles.badgeText}>الأفضل قيمة ⭐</Text></View>}
          {plan.trialDays > 0 && tier !== plan.id && <View style={[styles.badge, styles.trialBadge]}><Text style={styles.badgeText}>تجربة {plan.trialDays} يوم</Text></View>}
          <View style={styles.planHeader}>
            <Text style={styles.planName}>{plan.name}</Text>
            <View style={styles.priceRow}><Text style={styles.planPrice}>{plan.price}</Text><Text style={styles.planPeriod}>{plan.period}</Text></View>
            {plan.originalPrice !== plan.price && <Text style={styles.originalPrice}>بدلاً من {plan.originalPrice}{plan.period}</Text>}
          </View>
          {/* شريط الطاقة النسبي */}
          <View style={styles.energyBar}>
            <Text style={styles.energyLabel}>{plan.energyLabel}</Text>
            <View style={styles.energyBarBg}>
              <View style={[styles.energyBarFill, { width: plan.id === 'free' ? '15%' : plan.id === 'plus' ? '30%' : plan.id === 'premium' ? '55%' : plan.id === 'pro' ? '75%' : '100%', backgroundColor: plan.id === 'free' ? '#EF4444' : plan.id === 'plus' ? '#F59E0B' : plan.id === 'premium' ? '#3B82F6' : plan.id === 'pro' ? '#8B5CF6' : '#10B981' }]} />
            </View>
          </View>
          <View style={styles.featuresList}>{plan.features.map((f, i) => <View key={i} style={styles.featureRow}><Text style={styles.featureIcon}>✓</Text><Text style={styles.feature}>{f}</Text></View>)}</View>
          <View style={[styles.selectBtn, tier === plan.id && styles.activeBtn]}>
            {loadingPlanId === plan.id ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.selectBtnText}>{tier === plan.id ? '✓ مفعّل حالياً' : 'اشتراك الآن'}</Text>}
          </View>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} disabled={!!loadingPlanId}><Text style={styles.restoreText}>استعادة الاشتراك السابق</Text></TouchableOpacity>
      <Text style={styles.footerNote}>يمكنك الإلغاء في أي وقت. الاشتراك يتجدد تلقائياً.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg }, content: { paddingBottom: 40, paddingTop: 8 },
  header: { padding: 24, paddingTop: 40, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  plan: { backgroundColor: COLORS.card, padding: 20, borderRadius: 20, marginHorizontal: 16, marginBottom: 16, borderWidth: 1.5, borderColor: COLORS.border, overflow: 'hidden' },
  activePlan: { borderColor: COLORS.primary, borderWidth: 2 }, popularPlan: { borderColor: COLORS.gold, borderWidth: 2 },
  badge: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 12 },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' }, trialBadge: { backgroundColor: '#10B981', marginTop: 4 },
  planHeader: { marginBottom: 16 }, planName: { color: COLORS.text, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' }, planPrice: { fontSize: 32, fontWeight: '800', color: COLORS.primary },
  planPeriod: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '500', marginLeft: 4 },
  originalPrice: { fontSize: 14, color: COLORS.textSecondary, textDecorationLine: 'line-through', marginTop: 4 },
  energyBar: { marginBottom: 16 },
  energyLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 },
  energyBarBg: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  energyBarFill: { height: '100%', borderRadius: 3 },
  featuresList: { marginBottom: 8 }, featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  featureIcon: { color: '#10B981', fontSize: 14, fontWeight: '700', marginRight: 8, width: 20 },
  feature: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20, flex: 1 },
  selectBtn: { backgroundColor: COLORS.primary, padding: 14, borderRadius: 12, marginTop: 12, alignItems: 'center', minHeight: 48 },
  activeBtn: { backgroundColor: '#10B981' }, selectBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  restoreBtn: { alignItems: 'center', padding: 16, marginTop: 8, minHeight: 48, justifyContent: 'center' },
  restoreText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '500', textDecorationLine: 'underline' },
  footerNote: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 12, marginTop: 16, marginHorizontal: 24, lineHeight: 18 },
});
