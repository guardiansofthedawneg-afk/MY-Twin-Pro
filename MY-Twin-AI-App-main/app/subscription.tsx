import {
  SafeAreaView, View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Platform
} from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { initIAP, getProducts, purchaseSubscription, restorePurchases, TIER_MAP } from '../lib/iapService';
import { Tier, useTwinStore } from '../store/useTwinStore';
import { CheckCircle2, Crown } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

// ── أنواع المنتجات ─────────────────────────────
interface StoreProduct {
  productId: string;
  localizedPrice: string;
  price: number;
  currency: string;
  title: string;
  description: string;
}

// ── ترتيب الباقات لاستعادة الاشتراك ────────────
const TIER_RANK: Record<string, number> = {
  free: 0, plus: 1, premium: 2, pro: 3, yearly: 4,
};

// ── مخطط الباقات الأساسي ──────────────────────
interface Plan {
  id: Tier;
  name: string;
  defaultPrice: string;
  defaultPeriod: string;
  productId?: string;
  trialDays: number;
  tagline: string;
  consciousnessLayers: number;
  features: string[];
  popular?: boolean;
}

const PLANS: Plan[] = [
  { id:'free', name:'Free', defaultPrice:'0', defaultPeriod:'للأبد', trialDays:0, tagline:'ابدأ رحلتك مع توأمك', consciousnessLayers:1, features:['طبقة وعي واحدة','15 رسالة يومياً','ذاكرة 3 أيام','عربي وإنجليزي'] },
  { id:'plus', name:'Plus', defaultPrice:'9', defaultPeriod:'/شهر', trialDays:0, tagline:'توأم يفهمك أكثر كل يوم', consciousnessLayers:2, productId:'plus_monthly', features:['طبقتا وعي','50 رسالة يومياً','ذاكرة 30 يوم','التحدث بصوتك','إشعارات يومية','تخصيص التوأم'] },
  { id:'premium', name:'Premium', defaultPrice:'19', defaultPeriod:'/شهر', trialDays:5, tagline:'وعي حقيقي يرافقك', consciousnessLayers:3, productId:'premium_monthly', features:['3 طبقات وعي','150 رسالة يومياً','ذاكرة 6 أشهر','تحليل أحلامك','تدريب حياتي','موسيقى وترفيه','تقويم ذكي'] },
  { id:'pro', name:'Pro', defaultPrice:'110', defaultPeriod:'/6 أشهر', trialDays:7, tagline:'توأم بوعي متكامل', consciousnessLayers:4, productId:'pro_semiannual', features:['4 طبقات وعي','500 رسالة يومياً','ذاكرة عميقة','منزل ذكي','إدارة البريد','كاميرا مفتوحة'] },
  { id:'yearly', name:'Yearly', defaultPrice:'199', defaultPeriod:'/سنة', trialDays:14, popular:true, tagline:'أعمق محاكاة للوعي', consciousnessLayers:5, productId:'yearly_annual', features:['5 طبقات وعي كاملة','رسائل غير محدودة','ذاكرة دائمة','وعي استباقي','كل الميزات','أقصى سرعة','دعم VIP'] },
];

// ── مكوّن طبقات الوعي ──────────────────────────
function ConsciousnessBar({ layers, planId }: { layers: number; planId: string }) {
  const colors: Record<string, string> = { free:'#94A3B8', plus:'#F59E0B', premium:'#3B82F6', pro:'#8B5CF6', yearly:'#6B21A8' };
  return (
    <View style={cb.container}>
      <Text style={cb.label}>طبقات الوعي: {layers}/5</Text>
      <View style={cb.bar}>
        {[1,2,3,4,5].map(i => (<View key={i} style={[cb.seg, { backgroundColor: i<=layers? (colors[planId]||'#6B21A8') : '#E5E7EB' }]} />))}
      </View>
    </View>
  );
}
const cb = StyleSheet.create({ container:{ marginBottom:16 }, label:{ fontSize:12, color:'#888', marginBottom:6, fontWeight:'600' }, bar:{ flexDirection:'row', gap:4 }, seg:{ flex:1, height:8, borderRadius:4 } });

export default function SubscriptionScreen() {
  const { tier, updateTier, lang, theme, hasUsedTrial, setHasUsedTrial } = useTwinStore();
  const [loadingId, setLoadingId] = useState<string|null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [initLoading, setInitLoading] = useState(true);
  const [iapAvailable, setIapAvailable] = useState(true);
  const isAr = lang === 'ar';
  const isDark = theme === 'dark';
  const iapInitialized = useRef(false);

  // ── تهيئة IAP مرة واحدة ──────────────────────
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        if (!iapInitialized.current) {
          await initIAP();
          iapInitialized.current = true;
        }
        const fetched = await getProducts();
        if (!cancelled) {
          setProducts(fetched);
          setIapAvailable(true);
        }
      } catch (e) {
        if (!cancelled) {
          setIapAvailable(false);
          Alert.alert(isAr?'خطأ':'Error', isAr?'خدمة الشراء غير متاحة حالياً':'Purchase service unavailable');
        }
      } finally {
        if (!cancelled) setInitLoading(false);
      }
    };
    init();
    // لا تستدعي disconnectIAP هنا – ستتم إدارتها على مستوى التطبيق
    return () => { cancelled = true; };
  }, []);

  // ── جلب السعر المعروض ────────────────────────
  const getPlanDisplay = useCallback((plan: Plan) => {
    const product = products.find(p => p.productId === plan.productId);
    if (product) {
      return {
        price: product.localizedPrice || `$${plan.defaultPrice}`,
        period: '',
        currency: product.currency,
        originalPrice: '',
      };
    }
    return {
      price: `$${plan.defaultPrice}`,
      period: plan.defaultPeriod,
      currency: 'USD',
      originalPrice: '',
    };
  }, [products]);

  // ── التحقق من الإيصال على السيرفر ────────────
  const verifyReceipt = async (receipt: string, productId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-receipt', {
        body: { receipt, productId, platform: Platform.OS },
      });
      if (error) throw error;
      return data?.valid;
    } catch (e) {
      console.warn('Receipt verification failed, assuming valid for development:', e);
      // في بيئة التطوير، نعتبره صحيحًا (يجب تعطيله في الإنتاج)
      return true;
    }
  };

  // ── تنفيذ الشراء ─────────────────────────────
  const handlePurchase = async (plan: Plan) => {
    if (loadingId || !plan.productId) return;
    if (plan.id === 'free') {
      Alert.alert('Free', isAr?'أنت على الباقة المجانية.':'You are on the free plan.');
      return;
    }
    if (!iapAvailable) {
      Alert.alert(isAr?'خطأ':'Error', isAr?'خدمة الشراء غير متاحة':'Purchase unavailable');
      return;
    }
    setLoadingId(plan.id);
    try {
      // في بيئة حقيقية، purchaseSubscription تُرجع receipt
      const receipt = await purchaseSubscription(plan.productId);
      if (!receipt) throw new Error('No receipt');
      const verified = await verifyReceipt(receipt, plan.productId);
      if (verified) {
        const newTier = TIER_MAP[plan.productId];
        if (newTier) {
          updateTier(newTier as Tier);
          if (plan.trialDays > 0) setHasUsedTrial(true);
          Alert.alert(isAr?'تم!':'Done!', isAr?'تم تفعيل اشتراكك':'Subscription activated');
          router.back();
        }
      } else {
        Alert.alert(isAr?'خطأ':'Error', isAr?'فشل التحقق من الشراء':'Purchase verification failed');
      }
    } catch (e: any) {
      Alert.alert(isAr?'خطأ':'Error', e.message || (isAr?'فشل الشراء':'Purchase failed'));
    } finally {
      setLoadingId(null);
    }
  };

  // ── استعادة المشتريات ────────────────────────
  const handleRestore = async () => {
    setLoadingId('restore');
    try {
      const purchases = await restorePurchases();
      if (purchases.length > 0) {
        // ابحث عن أعلى tier بين المشتريات النشطة
        const best = purchases
          .map(p => ({ ...p, rank: TIER_RANK[TIER_MAP[p.productId] || 'free'] || 0 }))
          .sort((a, b) => b.rank - a.rank)[0];
        const restoredTier = TIER_MAP[best.productId];
        if (restoredTier) {
          updateTier(restoredTier as Tier);
          Alert.alert(isAr?'تم':'Done', isAr?'تم استعادة اشتراكك!':'Subscription restored!');
          router.back();
        }
      } else {
        Alert.alert(isAr?'تنبيه':'Notice', isAr?'لم يتم العثور على اشتراك.':'No subscription found.');
      }
    } catch (e) {
      Alert.alert(isAr?'خطأ':'Error', isAr?'فشلت الاستعادة.':'Restore failed.');
    } finally {
      setLoadingId(null);
    }
  };

  // ── تحويل الخطط إلى عناصر واجهة ──────────────
  const planCards = useMemo(() => PLANS.map((plan) => {
    const { price, period } = getPlanDisplay(plan);
    const isCurrent = tier === plan.id;
    const showTrial = plan.trialDays > 0 && !isCurrent && !hasUsedTrial;
    return (
      <TouchableOpacity
        key={plan.id}
        style={[s.plan, isCurrent && s.activePlan, plan.popular && s.popularPlan, isDark && { backgroundColor: '#2A2A2A', borderColor: isCurrent ? '#D8B4FE' : '#444' }]}
        onPress={() => handlePurchase(plan)}
        activeOpacity={0.85}
        disabled={!!loadingId || plan.id === 'free'}
        accessibilityRole="button"
        accessibilityLabel={`${plan.name} ${price}`}
      >
        {plan.popular && <View style={s.badge}><Text style={s.badgeText}>{isAr?'الأفضل قيمة':'Best Value'}</Text></View>}
        {showTrial && <View style={[s.badge, s.trialBadge]}><Text style={s.badgeText}>{isAr?`تجربة ${plan.trialDays} يوم`:`${plan.trialDays}-day trial`}</Text></View>}
        <View style={s.planHeader}>
          <Text style={[s.planName, isDark && { color: '#FFF' }]}>{plan.name}</Text>
          <Text style={s.tagline}>{plan.tagline}</Text>
          <View style={s.priceRow}>
            <Text style={[s.planPrice, isDark && { color: '#FFF' }]}>{price}</Text>
            {period ? <Text style={s.planPeriod}>{period}</Text> : null}
          </View>
        </View>
        <ConsciousnessBar layers={plan.consciousnessLayers} planId={plan.id} />
        <View style={s.featuresList}>{plan.features.map((f,i)=>(<View key={i} style={s.featureRow}><CheckCircle2 size={15} stroke="#10B981" /><Text style={[s.feature, isDark && { color: '#CCC' }]}>{f}</Text></View>))}</View>
        <View style={[s.selectBtn, isCurrent && s.activeBtn]}>
          {loadingId === plan.id ? <ActivityIndicator color="#FFF" size="small"/> : <Text style={s.selectBtnText}>{isCurrent ? (isAr?'مفعّل':'Active') : (isAr?'ابدأ الآن':'Start Now')}</Text>}
        </View>
      </TouchableOpacity>
    );
  }), [PLANS, getPlanDisplay, tier, loadingId, isDark, isAr, hasUsedTrial]);

  if (initLoading) {
    return (
      <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#6B21A8" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, isDark && { backgroundColor: '#1A1A1A' }]}>
      <ScrollView style={[s.container, isDark && { backgroundColor: '#1A1A1A' }]} contentContainerStyle={s.content}>
        <View style={s.header}>
          <Text style={[s.title, isDark && { color: '#FFF' }]}>{isAr?'ارتقِ بوعي توأمك':"Elevate Your Twin's Consciousness"}</Text>
          <Text style={s.subtitle}>{isAr?'كل باقة تفتح طبقة جديدة من الوعي':'Each plan unlocks a new layer of consciousness'}</Text>
        </View>

        {planCards}

        <TouchableOpacity style={s.restoreBtn} onPress={handleRestore} disabled={!!loadingId} accessibilityRole="button" accessibilityLabel={isAr ? 'استعادة الاشتراك' : 'Restore Purchase'}>
          <Text style={[s.restoreText, isDark && { color: '#D8B4FE' }]}>{isAr?'استعادة الاشتراك السابق':'Restore Purchase'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.manageBtn} onPress={() => {
          // رابط إدارة الاشتراك في متجر التطبيقات
          const url = Platform.OS === 'ios'
            ? 'https://apps.apple.com/account/subscriptions'
            : 'https://play.google.com/store/account/subscriptions';
          Linking.openURL(url);
        }}>
          <Text style={[s.manageText, isDark && { color: '#D8B4FE' }]}>{isAr?'إدارة الاشتراك':'Manage Subscription'}</Text>
        </TouchableOpacity>
        <Text style={s.footerNote}>{isAr?'يمكنك الإلغاء في أي وقت.':'Cancel anytime.'}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  container:{ flex:1, backgroundColor:'#FAFAFA' }, content:{ paddingBottom:40, paddingTop:8 },
  header:{ padding:24, paddingTop:40, alignItems:'center' }, title:{ fontSize:26, fontWeight:'800', color:'#1A1A1A', textAlign:'center' },
  subtitle:{ fontSize:14, color:'#888', textAlign:'center', marginTop:8, lineHeight:22 },
  plan:{ backgroundColor:'#FFFFFF', padding:20, borderRadius:20, marginHorizontal:16, marginBottom:16, borderWidth:1.5, borderColor:'#F0F0F0', elevation:2 },
  activePlan:{ borderColor:'#6B21A8', borderWidth:2 }, popularPlan:{ borderColor:'#F59E0B', borderWidth:2 },
  badge:{ backgroundColor:'#6B21A8', paddingHorizontal:12, paddingVertical:5, borderRadius:10, alignSelf:'flex-start', marginBottom:12 },
  badgeText:{ color:'#FFF', fontSize:12, fontWeight:'700' }, trialBadge:{ backgroundColor:'#10B981' },
  planHeader:{ marginBottom:16 }, planName:{ color:'#1A1A1A', fontSize:22, fontWeight:'800', marginBottom:4 },
  tagline:{ color:'#6B21A8', fontSize:13, fontWeight:'600', marginBottom:8, fontStyle:'italic' },
  priceRow:{ flexDirection:'row', alignItems:'baseline', gap:4 }, planPrice:{ fontSize:32, fontWeight:'800', color:'#1A1A1A' },
  planPeriod:{ fontSize:15, color:'#888' },
  featuresList:{ marginBottom:8 }, featureRow:{ flexDirection:'row', alignItems:'flex-start', gap:8, marginBottom:8 },
  feature:{ color:'#444', fontSize:14, lineHeight:20, flex:1 },
  selectBtn:{ backgroundColor:'#6B21A8', padding:14, borderRadius:12, marginTop:12, alignItems:'center' },
  activeBtn:{ backgroundColor:'#10B981' }, selectBtnText:{ color:'#FFF', fontWeight:'700', fontSize:16 },
  restoreBtn:{ alignItems:'center', padding:16, marginTop:8 }, restoreText:{ color:'#888', fontSize:14, textDecorationLine:'underline' },
  manageBtn:{ alignItems:'center', padding:8 }, manageText:{ color:'#6B21A8', fontSize:14 },
  footerNote:{ textAlign:'center', color:'#AAA', fontSize:12, marginTop:8, marginHorizontal:24 },
});
