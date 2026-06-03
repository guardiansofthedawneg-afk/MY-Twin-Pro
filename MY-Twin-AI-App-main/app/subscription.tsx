import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { initConnection, getProducts, requestPurchase, getAvailablePurchases, finishTransaction, purchaseUpdatedListener, purchaseErrorListener } from 'react-native-iap';
import { Tier, useTwinStore } from '../store/useTwinStore';
import { CheckCircle2 } from 'lucide-react-native';
import { initIAP, getProducts, purchaseSubscription, restorePurchases, TIER_MAP, disconnectIAP } from '../lib/iapService';

type Plan = {
  id: Tier;
  name: string;
  price: string;
  originalPrice: string;
  period: string;
  trialDays: number;
  tagline: string;
  consciousnessLayers: number;
  features: string[];
  popular?: boolean;
  productId?: string;
};

const PLANS: Plan[] = [
  {
    id: 'free', name: 'Free', price: '$0', originalPrice: '$0',
    period: 'للأبد', trialDays: 0,
    tagline: 'ابدأ رحلتك مع توأمك',
    consciousnessLayers: 1,
    features: [
      '🌱 طبقة وعي واحدة',
      '💬 15 رسالة يومياً',
      '🧠 ذاكرة 3 أيام',
      '🌐 عربي وإنجليزي',
    ],
  },
  {
    id: 'plus', name: 'Plus', price: '$9', originalPrice: '$15',
    period: '/شهر', trialDays: 0,
    tagline: 'توأم يفهمك أكثر كل يوم',
    consciousnessLayers: 2,
    productId: 'plus_monthly',
    features: [
      '🧬 طبقتا وعي',
      '💬 50 رسالة يومياً',
      '🧠 ذاكرة 30 يوم',
      '🎙️ التحدث بصوتك',
      '🔔 إشعارات يومية',
      '🎨 تخصيص التوأم',
    ],
  },
  {
    id: 'premium', name: 'Premium', price: '$19', originalPrice: '$25',
    period: '/شهر', trialDays: 5,
    tagline: 'وعي حقيقي يرافقك في كل لحظة',
    consciousnessLayers: 3,
    productId: 'premium_monthly',
    features: [
      '🔮 3 طبقات وعي',
      '💬 150 رسالة يومياً',
      '🧠 ذاكرة 6 أشهر',
      '🌙 تحليل أحلامك',
      '🎯 تدريب حياتي',
      '🎵 موسيقى وترفيه',
      '📅 تقويم ذكي',
    ],
  },
  {
    id: 'pro', name: 'Pro', price: '$110', originalPrice: '$150',
    period: '/6 أشهر', trialDays: 7,
    tagline: 'توأم بوعي متكامل',
    consciousnessLayers: 4,
    productId: 'pro_semiannual',
    features: [
      '⚡ 4 طبقات وعي',
      '💬 500 رسالة يومياً',
      '🧠 ذاكرة عميقة',
      '🏠 منزل ذكي',
      '📧 إدارة البريد',
      '📸 كاميرا مفتوحة',
    ],
  },
  {
    id: 'yearly', name: 'Yearly ✨', price: '$199', originalPrice: '$300',
    period: '/سنة', trialDays: 14, popular: true,
    tagline: 'أعمق محاكاة للوعي الإنساني',
    consciousnessLayers: 5,
    productId: 'yearly_annual',
    features: [
      '👑 5 طبقات وعي كاملة',
      '💬 رسائل غير محدودة',
      '🧠 ذاكرة دائمة',
      '🌌 وعي استباقي',
      '🔮 كل الميزات',
      '⚡ أقصى سرعة',
      '📞 دعم VIP',
    ],
  },
];

function ConsciousnessBar({ layers, planId }: { layers: number; planId: string }) {
  const colors: Record<string, string> = {
    free: '#94A3B8', plus: '#F59E0B', premium: '#3B82F6',
    pro: '#8B5CF6', yearly: '#6B21A8',
  };
  return (
    <View style={cb.container}>
      <Text style={cb.label}>طبقات الوعي: {layers}/5</Text>
      <View style={cb.bar}>
        {[1,2,3,4,5].map(i => (
          <View key={i} style={[cb.seg, {
            backgroundColor: i <= layers ? (colors[planId] || '#6B21A8') : '#E5E7EB'
          }]} />
        ))}
      </View>
    </View>
  );
}
const cb = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 12, color: '#888', marginBottom: 6, fontWeight: '600' },
  bar: { flexDirection: 'row', gap: 4 },
  seg: { flex: 1, height: 8, borderRadius: 4 },
});

export default function Subscription() {
  const { tier, updateTier, lang } = useTwinStore();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const isAr = lang === 'ar';

  useEffect(() => {
    initIAP();

    // الاستماع لنتائج الشراء
    InAppPurchases.setPurchaseListener(({ responseCode, results, errorCode }) => {
      if (responseCode === InAppPurchases.IAPResponseCode.OK && results) {
        for (const purchase of results) {
          if (!purchase.acknowledged) {
            InAppPurchases.finishTransactionAsync(purchase, false);
            const newTier = TIER_MAP[purchase.productId];
            if (newTier) {
              updateTier(newTier as Tier);
              Alert.alert(isAr ? 'تم! 🎉' : 'Done! 🎉', isAr ? 'تم تفعيل اشتراكك' : 'Subscription activated');
              router.back();
            }
          }
        }
      } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
        // المستخدم ألغى — لا شيء
      } else {
        Alert.alert(isAr ? 'خطأ' : 'Error', isAr ? 'فشلت عملية الشراء' : 'Purchase failed');
      }
      setLoadingId(null);
    });

    return () => { disconnectIAP(); };
  }, []);

  const handlePurchase = async (plan: Plan) => {
    if (loadingId || !plan.productId) return;
    if (plan.id === 'free') {
      Alert.alert('Free', isAr ? 'أنت على الباقة المجانية.' : 'You are on the free plan.');
      return;
    }
    setLoadingId(plan.id);
    await purchaseSubscription(plan.productId);
    // النتيجة بتيجي في setPurchaseListener
  };

  const handleRestore = async () => {
    setLoadingId('restore');
    try {
      const purchases = await restorePurchases();
      if (purchases.length > 0) {
        const last = purchases[purchases.length - 1];
        const restoredTier = TIER_MAP[last.productId];
        if (restoredTier) {
          updateTier(restoredTier as Tier);
          Alert.alert(isAr ? 'تم ✅' : 'Done ✅', isAr ? 'تم استعادة اشتراكك!' : 'Subscription restored!');
        }
      } else {
        Alert.alert(isAr ? 'تنبيه' : 'Notice', isAr ? 'لم يتم العثور على اشتراك.' : 'No subscription found.');
      }
    } catch {
      Alert.alert(isAr ? 'خطأ' : 'Error', isAr ? 'فشلت الاستعادة.' : 'Restore failed.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.header}>
        <Text style={s.title}>{isAr ? 'ارتقِ بوعي توأمك 💜' : "Elevate Your Twin's Consciousness 💜"}</Text>
        <Text style={s.subtitle}>
          {isAr ? 'كل باقة تفتح طبقة جديدة من الوعي' : 'Each plan unlocks a new layer of consciousness'}
        </Text>
      </View>

      {PLANS.map((plan) => (
        <TouchableOpacity
          key={plan.id}
          style={[s.plan, tier === plan.id && s.activePlan, plan.popular && s.popularPlan]}
          onPress={() => handlePurchase(plan)}
          activeOpacity={0.85}
          disabled={!!loadingId}
        >
          {plan.popular && <View style={s.badge}><Text style={s.badgeText}>⭐ {isAr ? 'الأفضل قيمة' : 'Best Value'}</Text></View>}
          {plan.trialDays > 0 && tier !== plan.id && (
            <View style={[s.badge, s.trialBadge]}>
              <Text style={s.badgeText}>{isAr ? `تجربة ${plan.trialDays} يوم` : `${plan.trialDays}-day trial`}</Text>
            </View>
          )}
          <View style={s.planHeader}>
            <Text style={s.planName}>{plan.name}</Text>
            <Text style={s.tagline}>{plan.tagline}</Text>
            <View style={s.priceRow}>
              <Text style={s.planPrice}>{plan.price}</Text>
              <Text style={s.planPeriod}>{plan.period}</Text>
            </View>
            {plan.originalPrice !== plan.price && (
              <Text style={s.originalPrice}>{isAr ? 'بدلاً من' : 'Instead of'} {plan.originalPrice}</Text>
            )}
          </View>
          <ConsciousnessBar layers={plan.consciousnessLayers} planId={plan.id} />
          <View style={s.featuresList}>
            {plan.features.map((f, i) => (
              <View key={i} style={s.featureRow}>
                <CheckCircle2 size={15} color="#10B981" />
                <Text style={s.feature}>{f}</Text>
              </View>
            ))}
          </View>
          <View style={[s.selectBtn, tier === plan.id && s.activeBtn]}>
            {loadingId === plan.id
              ? <ActivityIndicator color="#FFF" size="small" />
              : <Text style={s.selectBtnText}>
                  {tier === plan.id
                    ? (isAr ? '✓ مفعّل' : '✓ Active')
                    : (isAr ? 'ابدأ الآن 🚀' : 'Start Now 🚀')}
                </Text>
            }
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={s.restoreBtn} onPress={handleRestore} disabled={!!loadingId}>
        <Text style={s.restoreText}>{isAr ? 'استعادة الاشتراك السابق' : 'Restore Purchase'}</Text>
      </TouchableOpacity>
      <Text style={s.footerNote}>
        {isAr ? 'يمكنك الإلغاء في أي وقت.' : 'Cancel anytime.'}
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { paddingBottom: 40, paddingTop: 8 },
  header: { padding: 24, paddingTop: 40, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginTop: 8, lineHeight: 22 },
  plan: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, marginHorizontal: 16, marginBottom: 16, borderWidth: 1.5, borderColor: '#F0F0F0', elevation: 2 },
  activePlan: { borderColor: '#6B21A8', borderWidth: 2 },
  popularPlan: { borderColor: '#F59E0B', borderWidth: 2 },
  badge: { backgroundColor: '#6B21A8', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 12 },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  trialBadge: { backgroundColor: '#10B981' },
  planHeader: { marginBottom: 16 },
  planName: { color: '#1A1A1A', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  tagline: { color: '#6B21A8', fontSize: 13, fontWeight: '600', marginBottom: 8, fontStyle: 'italic' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  planPrice: { fontSize: 32, fontWeight: '800', color: '#1A1A1A' },
  planPeriod: { fontSize: 15, color: '#888' },
  originalPrice: { fontSize: 13, color: '#CCC', textDecorationLine: 'line-through', marginTop: 4 },
  featuresList: { marginBottom: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  feature: { color: '#444', fontSize: 14, lineHeight: 20, flex: 1 },
  selectBtn: { backgroundColor: '#6B21A8', padding: 14, borderRadius: 12, marginTop: 12, alignItems: 'center' },
  activeBtn: { backgroundColor: '#10B981' },
  selectBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  restoreBtn: { alignItems: 'center', padding: 16, marginTop: 8 },
  restoreText: { color: '#888', fontSize: 14, textDecorationLine: 'underline' },
  footerNote: { textAlign: 'center', color: '#AAA', fontSize: 12, marginTop: 8, marginHorizontal: 24 },
});
